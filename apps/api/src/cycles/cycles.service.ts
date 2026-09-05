import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StateMachine, assertVersion } from '../common/state-machine';
import { CYCLE_TRANSITIONS } from '@ficms/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RecordNumberService } from '../records/record-number.service';
import { parsePagination, toPaginated } from '../common/pagination';
import type { SessionUser } from '@ficms/types';
import { CreateCycleDto, CycleStatusDtoInput, CreateCycleEventDto, CreateCycleMedicationDto, CycleQueryDto } from './dto/cycle.dto';

const sm = new StateMachine(CYCLE_TRANSITIONS as Record<string, readonly string[]>, 'cycle');

@Injectable()
export class CyclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly records: RecordNumberService,
  ) {}

  async create(dto: CreateCycleDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const patient = await this.prisma.patient.findFirst({ where: { id: dto.patientId, organizationId: org } });
    if (!patient) throw new NotFoundException('Patient not found.');

    const cycleNumber = await this.records.next(
      () => this.prisma.cycle.count({ where: { organizationId: org } }),
      { prefix: 'CY' },
    );

    const cycle = await this.prisma.cycle.create({
      data: {
        organizationId: org,
        cycleNumber,
        patientId: dto.patientId,
        partnerId: dto.partnerId ?? null,
        treatmentType: dto.treatmentType,
        protocolTemplate: dto.protocolTemplate,
        diagnosis: dto.diagnosis,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        notes: dto.notes,
        status: 'PLANNED',
      },
    });

    await this.audit.record(
      { action: 'cycle.create', resourceType: 'cycle', resourceId: cycle.id, after: { cycleNumber, treatmentType: dto.treatmentType } },
      user,
    );
    return cycle;
  }

  async list(q: CycleQueryDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) return { data: [], meta: { page: 1, pageSize: 0, total: 0, totalPages: 0 } };
    const { page, pageSize, skip, take, orderBy } = parsePagination(q);
    const where: Record<string, unknown> = { organizationId: org };
    if (q.status) where.status = q.status;
    if (q.patientId) where.patientId = q.patientId;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.cycle.findMany({
        where,
        skip,
        take,
        orderBy: orderBy ?? { updatedAt: 'desc' },
        include: { patient: { select: { id: true, givenName: true, familyName: true, medicalRecordNumber: true } } },
      }),
      this.prisma.cycle.count({ where }),
    ]);
    return toPaginated(data, total, { page, pageSize });
  }

  async get(id: string, user: SessionUser) {
    const cycle = await this.prisma.cycle.findFirst({
      where: { id, organizationId: user.organizationId ?? undefined },
      include: {
        patient: { select: { id: true, givenName: true, familyName: true, medicalRecordNumber: true } },
        medications: { orderBy: { createdAt: 'asc' } },
        events: { orderBy: { scheduledAt: 'asc' } },
        embryos: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!cycle) throw new NotFoundException('Cycle not found.');
    return cycle;
  }

  async transition(id: string, dto: CycleStatusDtoInput, user: SessionUser) {
    const cycle = await this.prisma.cycle.findFirst({ where: { id, organizationId: user.organizationId ?? undefined } });
    if (!cycle) throw new NotFoundException('Cycle not found.');
    assertVersion(cycle.version, dto.version, 'cycle');
    sm.assertTransition(cycle.status as never, dto.status as never);

    const data: Record<string, unknown> = { status: dto.status, version: { increment: 1 } };
    if (dto.status === 'TRIGGER') data.triggerAt = new Date();
    if (dto.status === 'RETRIEVAL') data.retrievalAt = new Date();
    if (dto.status === 'TRANSFER') data.transferAt = new Date();
    if (dto.status === 'PREGNANCY_TEST') data.pregnancyTestAt = new Date();
    if (dto.status === 'OUTCOME') data.outcome = dto.outcome ?? null;

    const updated = await this.prisma.cycle.update({ where: { id }, data });
    await this.audit.record(
      { action: 'cycle.status_change', resourceType: 'cycle', resourceId: id, before: { status: cycle.status }, after: { status: dto.status } },
      user,
    );
    return updated;
  }

  async addEvent(id: string, dto: CreateCycleEventDto, user: SessionUser) {
    const cycle = await this.prisma.cycle.findFirst({ where: { id, organizationId: user.organizationId ?? undefined } });
    if (!cycle) throw new NotFoundException('Cycle not found.');
    const event = await this.prisma.cycleEvent.create({
      data: {
        organizationId: user.organizationId!,
        cycleId: id,
        eventType: dto.eventType,
        title: dto.title ?? dto.eventType,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        notes: dto.notes,
        createdBy: user.id,
      },
    });
    await this.audit.record({ action: 'cycle.add_event', resourceType: 'cycle', resourceId: id, after: { eventType: dto.eventType } }, user);
    return event;
  }

  async addMedication(id: string, dto: CreateCycleMedicationDto, user: SessionUser) {
    const cycle = await this.prisma.cycle.findFirst({ where: { id, organizationId: user.organizationId ?? undefined } });
    if (!cycle) throw new NotFoundException('Cycle not found.');
    const med = await this.prisma.cycleMedication.create({
      data: {
        organizationId: user.organizationId!,
        cycleId: id,
        name: dto.name,
        dose: dto.dose,
        route: dto.route,
        dayFrom: dto.dayFrom,
        dayTo: dto.dayTo,
        instructions: dto.instructions,
      },
    });
    await this.audit.record({ action: 'cycle.add_medication', resourceType: 'cycle', resourceId: id, after: { name: dto.name } }, user);
    return med;
  }

  async timeline(id: string, user: SessionUser) {
    const cycle = await this.prisma.cycle.findFirst({
      where: { id, organizationId: user.organizationId ?? undefined },
      include: { events: { orderBy: { scheduledAt: 'asc' } }, medications: { orderBy: { createdAt: 'asc' } } },
    });
    if (!cycle) throw new NotFoundException('Cycle not found.');
    return cycle;
  }
}
