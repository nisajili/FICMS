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
import {
  CreateEmbryoDto,
  EmbryoObservationDto,
  DoubleWitnessDto,
  EmbryoQueryDto,
} from './dto/embryology.dto';

@Injectable()
export class EmbryologyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateEmbryoDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const cycle = await this.prisma.cycle.findFirst({ where: { id: dto.cycleId, organizationId: org } });
    if (!cycle) throw new NotFoundException('Cycle not found.');
    const patient = await this.prisma.patient.findFirst({ where: { id: dto.patientId, organizationId: org } });
    if (!patient) throw new NotFoundException('Patient not found.');

    const embryo = await this.prisma.embryo.create({
      data: {
        organizationId: org,
        cycleId: dto.cycleId,
        patientId: dto.patientId,
        label: dto.label,
        status: (dto.status as never) ?? 'OOCYTE',
        dayObserved: dto.dayObserved,
        grade: dto.grade,
        development: dto.development,
        location: dto.location,
        notes: dto.notes,
        createdById: user.id,
      },
    });
    await this.audit.record({ action: 'embryology.create', resourceType: 'embryo', resourceId: embryo.id, after: { label: dto.label } }, user);
    return embryo;
  }

  async list(q: EmbryoQueryDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) return { data: [], meta: { page: 1, pageSize: 0, total: 0, totalPages: 0 } };
    const { page, pageSize, skip, take, orderBy } = parsePagination(q);
    const where: Record<string, unknown> = { organizationId: org };
    if (q.cycleId) where.cycleId = q.cycleId;
    if (q.status) where.status = q.status;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.embryo.findMany({ where, skip, take, orderBy: orderBy ?? { createdAt: 'asc' }, include: { observations: { orderBy: { day: 'asc' } } } }),
      this.prisma.embryo.count({ where }),
    ]);
    return toPaginated(data, total, { page, pageSize });
  }

  async addObservation(embryoId: string, dto: EmbryoObservationDto, user: SessionUser) {
    const embryo = await this.prisma.embryo.findFirst({ where: { id: embryoId, organizationId: user.organizationId ?? undefined } });
    if (!embryo) throw new NotFoundException('Embryo not found.');
    const obs = await this.prisma.embryoObservation.create({
      data: {
        embryoId,
        day: dto.day,
        cellCount: dto.cellCount,
        grade: dto.grade,
        fragmentationPercent: dto.fragmentationPercent,
        notes: dto.notes,
        observedById: user.id,
        witnessedById: null,
      },
    });
    await this.prisma.embryo.update({ where: { id: embryo.id }, data: { dayObserved: dto.day, grade: dto.grade ?? undefined } });
    await this.audit.record({ action: 'embryology.observe', resourceType: 'embryo', resourceId: embryo.id, after: { day: dto.day } }, user);
    return obs;
  }

  /**
   * Double-witness verification for identity-sensitive events (transfer,
   * freezing, biopsy, thawing). Both the acting user and witness must be
   * different non-phantom users; the event is recorded with both.
   */
  async verifyWithWitness(embryoId: string, dto: DoubleWitnessDto, eventType: string, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const embryo = await this.prisma.embryo.findFirst({ where: { id: embryoId, organizationId: org } });
    if (!embryo) throw new NotFoundException('Embryo not found.');

    if (dto.witnessId === user.id) {
      throw new ConflictException('Witness must be a different staff member.');
    }
    const witness = await this.prisma.user.findFirst({ where: { id: dto.witnessId, organizationId: org, status: 'ACTIVE' } });
    if (!witness) throw new NotFoundException('Witness not found in this organisation.');

    const updated = await this.prisma.embryo.update({
      where: { id: embryo.id },
      data: { witnessedById: dto.witnessId, notes: dto.note ?? embryo.notes },
    });

    await this.audit.record(
      {
        action: `embryology.${eventType}.double_witness`,
        resourceType: 'embryo',
        resourceId: embryo.id,
        after: { actor: user.id, witness: dto.witnessId, eventType },
        reason: dto.note,
      },
      user,
    );
    return { ...updated, witness: { id: witness.id, name: witness.name } };
  }

  async transitionStatus(embryoId: string, status: string, user: SessionUser) {
    const embryo = await this.prisma.embryo.findFirst({ where: { id: embryoId, organizationId: user.organizationId ?? undefined } });
    if (!embryo) throw new NotFoundException('Embryo not found.');
    const updated = await this.prisma.embryo.update({ where: { id: embryo.id }, data: { status: status as never } });
    await this.audit.record({ action: 'embryology.status_change', resourceType: 'embryo', resourceId: embryo.id, before: { status: embryo.status }, after: { status } }, user);
    return updated;
  }
}
