import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { parsePagination, toPaginated } from '../common/pagination';
import type { SessionUser } from '@ficms/types';
import type { CreateClinicalNoteDto, CorrectClinicalNoteDto, ClinicalNoteQueryDto } from './dto/clinical-note.dto';

/**
 * Clinical notes with an immutable revision chain.
 *
 * A note may be edited freely while it is UNSIGNED. Once SIGNED, it becomes
 * immutable: any correction creates a NEW revision (version + 1) that points
 * back to the signed note via `previousId`, and the superseded note is linked
 * via `supersededById`. The original signed content is never overwritten.
 */
@Injectable()
export class ClinicalNotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateClinicalNoteDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');

    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, organizationId: org },
    });
    if (!patient) throw new NotFoundException('Patient not found in this organisation.');

    const note = await this.prisma.clinicalNote.create({
      data: {
        organizationId: org,
        patientId: dto.patientId,
        encounterId: dto.encounterId ?? null,
        authorId: user.id,
        category: dto.category ?? 'clinical',
        body: dto.body,
        signed: false,
        version: 1,
      },
    });

    await this.audit.record(
      { action: 'clinical_note.create', resourceType: 'clinical_note', resourceId: note.id, after: { patientId: dto.patientId, category: note.category } },
      user,
    );

    return note;
  }

  async list(q: ClinicalNoteQueryDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) return { data: [], meta: { page: 1, pageSize: 0, total: 0, totalPages: 0 } };
    const { page, pageSize, skip, take, orderBy } = parsePagination(q);
    const where: Record<string, unknown> = { organizationId: org };
    if (q.patientId) where.patientId = q.patientId;
    if (q.category) where.category = q.category;

    const [items, total] = await Promise.all([
      this.prisma.clinicalNote.findMany({
        where,
        orderBy: orderBy ?? { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.clinicalNote.count({ where }),
    ]);

    return toPaginated(items, total, { page, pageSize });
  }

  async get(id: string, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const note = await this.prisma.clinicalNote.findFirst({
      where: { id, organizationId: org },
    });
    if (!note) throw new NotFoundException('Clinical note not found.');
    return note;
  }

  /** Sign the note. Once signed, its content becomes immutable. */
  async sign(id: string, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const note = await this.prisma.clinicalNote.findFirst({ where: { id, organizationId: org } });
    if (!note) throw new NotFoundException('Clinical note not found.');
    if (note.signed) throw new ConflictException('This note is already signed.');

    const updated = await this.prisma.clinicalNote.update({
      where: { id },
      data: { signed: true, signedById: user.id, signedAt: new Date() },
    });

    await this.audit.record(
      { action: 'clinical_note.sign', resourceType: 'clinical_note', resourceId: note.id, after: { signedBy: user.id } },
      user,
    );

    return updated;
  }

  /**
   * Correct a note.
   *
   * - UNSIGNED note: edit in place (allowed; not yet finalised).
   * - SIGNED note: NEVER overwrite the signed content. Create a NEW revision
   *   (version + 1) linked via `previousId`, and mark the signed note as
   *   superseded via `supersededById`. Every correction is audited.
   */
  async correct(id: string, dto: CorrectClinicalNoteDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const note = await this.prisma.clinicalNote.findFirst({ where: { id, organizationId: org } });
    if (!note) throw new NotFoundException('Clinical note not found.');

    // If the note has not been signed, it may be edited in place.
    if (!note.signed) {
      const updated = await this.prisma.clinicalNote.update({
        where: { id },
        data: { body: dto.body },
      });
      await this.audit.record(
        { action: 'clinical_note.correct_unsigned', resourceType: 'clinical_note', resourceId: note.id, after: { body: dto.body }, reason: dto.reason },
        user,
      );
      return updated;
    }

    // SIGNED: create a new revision that supersedes the signed note.
    const revision = await this.prisma.$transaction(async (tx: any) => {
      const next = await tx.clinicalNote.create({
        data: {
          organizationId: org,
          patientId: note.patientId,
          encounterId: note.encounterId,
          authorId: user.id,
          category: note.category,
          body: dto.body,
          signed: false,
          previousId: note.id,
          version: note.version + 1,
        },
      });
      await tx.clinicalNote.update({
        where: { id: note.id },
        data: { supersededById: next.id },
      });
      return next;
    });

    await this.audit.record(
      {
        action: 'clinical_note.correct_signed_revision',
        resourceType: 'clinical_note',
        resourceId: revision.id,
        before: { signedNoteId: note.id, previousBody: note.body },
        after: { body: dto.body, version: revision.version, previousId: note.id },
        reason: dto.reason,
      },
      user,
    );

    return revision;
  }
}
