import type { SessionUser } from '@ficms/types';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateConsentDto,
  UpdateConsentDto,
  SignConsentDto,
  WitnessConsentDto,
  RevokeConsentDto,
  ConsentQueryDto,
} from './dto/consent.dto';

type ConsentStatus = 'DRAFT' | 'PENDING_SIGNATURE' | 'SIGNED' | 'WITNESSED' | 'REVOKED';
const EDITABLE = new Set<ConsentStatus>(['DRAFT', 'PENDING_SIGNATURE']);

/**
 * Provides the patient-consent workflow with immobilisable signatures.
 *
 * Key invariants:
 *  - A SIGNED / WITNESSED consent is NEVER overwritten in place. Its content,
 *    timestamps, signer and witness are immutable. Corrections or renewals
 *    create a NEW version (version + 1, status DRAFT) so the historical record
 *    is preserved and auditable.
 *  - Signing records both a signer and (optionally) a witness. Witnessing is a
 *    separate operation and cannot be performed by the same user that signed
 *    (double-witness, cannot be bypassed).
 *  - Drafts may be freely edited and deleted; signed records may only be
 *    revoked (status change, never content mutation).
 */
@Injectable()
export class ConsentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async findScoped(id: string, org: string) {
    const consent = await this.prisma.consent.findFirst({
      where: { id, organizationId: org },
    });
    if (!consent) throw new NotFoundException('Consent not found.');
    return consent;
  }

  async create(dto: CreateConsentDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');

    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, organizationId: org },
    });
    if (!patient) throw new NotFoundException('Patient not found in this organisation.');

    const consent = await this.prisma.consent.create({
      data: {
        organizationId: org,
        patientId: dto.patientId,
        title: dto.title,
        content: dto.content ?? null,
        templateKey: dto.templateKey ?? null,
        status: 'DRAFT',
        version: 1,
      },
    });

    await this.audit.record(
      {
        action: 'consent.create',
        resourceType: 'consent',
        resourceId: consent.id,
        after: { patientId: dto.patientId, title: dto.title, version: 1 },
      },
      user,
    );

    return consent;
  }

  async list(query: ConsentQueryDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) return [];
    return this.prisma.consent.findMany({
      where: {
        organizationId: org,
        ...(query.patientId ? { patientId: query.patientId } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    return this.findScoped(id, org);
  }

  async update(id: string, dto: UpdateConsentDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const consent = await this.findScoped(id, org);
    if (!EDITABLE.has(consent.status as ConsentStatus)) {
      throw new ConflictException(
        'A signed consent cannot be edited. Create a new version instead.',
      );
    }

    const updated = await this.prisma.consent.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.templateKey !== undefined ? { templateKey: dto.templateKey } : {}),
      },
    });

    await this.audit.record(
      {
        action: 'consent.update',
        resourceType: 'consent',
        resourceId: id,
        after: { title: updated.title, version: updated.version },
      },
      user,
    );

    return updated;
  }

  async sign(id: string, dto: SignConsentDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const consent = await this.findScoped(id, org);
    if (consent.status !== 'DRAFT' && consent.status !== 'PENDING_SIGNATURE') {
      throw new ConflictException('This consent has already been signed.');
    }

    const updated = await this.prisma.consent.update({
      where: { id },
      data: {
        status: 'SIGNED',
        signedAt: new Date(),
        signedById: user.id,
        signedByName: dto.signedByName,
        witnessName: dto.witnessName ?? null,
        witnessId: dto.witnessId ?? null,
        evidenceKey: dto.evidenceKey ?? null,
      },
    });

    await this.audit.record(
      {
        action: 'consent.sign',
        resourceType: 'consent',
        resourceId: id,
        after: { signedById: user.id, signedByName: dto.signedByName, version: consent.version },
      },
      user,
    );

    return updated;
  }

  async witness(id: string, dto: WitnessConsentDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const consent = await this.findScoped(id, org);
    if (consent.status !== 'SIGNED') {
      throw new ConflictException('Only a signed consent can be witnessed.');
    }
    // Double-witness invariant: the witness must be a different person than the
    // signer. Cannot be bypassed by the consenting staff member.
    if (consent.signedById && consent.signedById === user.id) {
      throw new ForbiddenException('The signer cannot also be the witness.');
    }

    const updated = await this.prisma.consent.update({
      where: { id },
      data: { status: 'WITNESSED', witnessName: dto.witnessName, witnessId: dto.witnessId ?? user.id },
    });

    await this.audit.record(
      {
        action: 'consent.witness',
        resourceType: 'consent',
        resourceId: id,
        after: { witnessId: updated.witnessId, witnessName: dto.witnessName, version: consent.version },
      },
      user,
    );

    return updated;
  }

  async revoke(id: string, dto: RevokeConsentDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const consent = await this.findScoped(id, org);
    if (consent.status !== 'SIGNED' && consent.status !== 'WITNESSED') {
      throw new ConflictException('Only a signed or witnessed consent can be revoked (withdrawal).');
    }

    const updated = await this.prisma.consent.update({
      where: { id },
      data: { status: 'REVOKED' },
    });

    await this.audit.record(
      {
        action: 'consent.revoke',
        resourceType: 'consent',
        resourceId: id,
        after: { version: consent.version, status: 'REVOKED' },
        reason: dto.reason,
      },
      user,
    );

    return updated;
  }

  /**
   * Create a new version of a consent. The source consent is never mutated
   * (signed or not) — a fresh DRAFT (version + 1) is created carrying the same
   * title/content/template. This is the only supported path for changing a
   * signed consent and keeps the full audit trail.
   */
  async createVersion(id: string, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const consent = await this.findScoped(id, org);

    const created = await this.prisma.consent.create({
      data: {
        organizationId: org,
        patientId: consent.patientId,
        title: consent.title,
        content: consent.content,
        templateKey: consent.templateKey,
        status: 'DRAFT',
        version: consent.version + 1,
      },
    });

    await this.audit.record(
      {
        action: 'consent.version',
        resourceType: 'consent',
        resourceId: created.id,
        after: { previousId: consent.id, version: created.version, title: created.title },
      },
      user,
    );

    return created;
  }

  async delete(id: string, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const consent = await this.findScoped(id, org);
    if (!EDITABLE.has(consent.status as ConsentStatus)) {
      throw new ConflictException('Only unsigand drafts can be deleted.');
    }

    await this.prisma.consent.delete({ where: { id } });
    await this.audit.record(
      {
        action: 'consent.delete',
        resourceType: 'consent',
        resourceId: id,
        after: { title: consent.title, version: consent.version },
      },
      user,
    );

    return { deleted: true };
  }
}
