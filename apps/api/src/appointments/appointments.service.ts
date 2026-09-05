import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StateMachine, assertVersion } from '../common/state-machine';
import { APPOINTMENT_STATES, APPOINTMENT_TRANSITIONS } from '@ficms/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RecordNumberService } from '../records/record-number.service';
import { parsePagination, toPaginated } from '../common/pagination';
import type { SessionUser } from '@ficms/types';
import { CreateAppointmentDto, UpdateAppointmentStatusDto, AppointmentQueryDto, AppointmentStatusDto } from './dto/appointment.dto';

const sm = new StateMachine(APPOINTMENT_TRANSITIONS as Record<string, readonly string[]>, 'appointment');

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly records: RecordNumberService,
  ) {}

  async create(dto: CreateAppointmentDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const patient = await this.prisma.patient.findFirst({ where: { id: dto.patientId, organizationId: org } });
    if (!patient) throw new NotFoundException('Patient not found in this organisation.');

    const start = new Date(dto.scheduledStart);
    const end = new Date(dto.scheduledEnd);
    if (end <= start) throw new BadRequestException('Appointment end must be after start.');

    const code = await this.records.next(
      () => this.prisma.appointment.count({ where: { organizationId: org } }),
      { prefix: 'APT' },
    );

    const appointment = await this.prisma.appointment.create({
      data: {
        organizationId: org,
        code,
        patientId: dto.patientId,
        facilityId: dto.facilityId ?? user.facilityId,
        practitionerId: dto.practitionerId ?? user.id,
        scheduledStart: start,
        scheduledEnd: end,
        serviceType: dto.serviceType,
        notes: dto.notes,
        status: 'SCHEDULED',
      },
    });

    await this.audit.record(
      { action: 'appointment.create', resourceType: 'appointment', resourceId: appointment.id, after: { code } },
      user,
    );
    return appointment;
  }

  async list(q: AppointmentQueryDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) return { data: [], meta: { page: 1, pageSize: 0, total: 0, totalPages: 0 } };
    const { page, pageSize, skip, take, orderBy } = parsePagination(q);
    const where: Record<string, unknown> = { organizationId: org };
    if (q.status) where.status = q.status;
    if (q.patientId) where.patientId = q.patientId;
    if (q.from || q.to) {
      where.scheduledStart = {
        ...(q.from ? { gte: new Date(q.from) } : {}),
        ...(q.to ? { lte: new Date(q.to) } : {}),
      };
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where,
        skip,
        take,
        orderBy: orderBy ?? { scheduledStart: 'asc' },
        include: { patient: { select: { id: true, givenName: true, familyName: true, medicalRecordNumber: true } } },
      }),
      this.prisma.appointment.count({ where }),
    ]);
    return toPaginated(data, total, { page, pageSize });
  }

  async transition(id: string, dto: UpdateAppointmentStatusDto, user: SessionUser) {
    const appt = await this.prisma.appointment.findFirst({ where: { id, organizationId: user.organizationId ?? undefined } });
    if (!appt) throw new NotFoundException('Appointment not found.');
    assertVersion(appt.version, dto.version, 'appointment');
    sm.assertTransition(appt.status as never, dto.status as never);

    const data: Record<string, unknown> = { status: dto.status, version: { increment: 1 } };
    if (dto.status === 'CHECKED_IN') data.checkInAt = new Date();
    if (dto.status === 'COMPLETED') data.checkOutAt = new Date();
    if (dto.status === 'CANCELLED') data.cancelledReason = dto.cancelledReason ?? null;

    const updated = await this.prisma.appointment.update({ where: { id }, data });
    await this.audit.record(
      { action: 'appointment.status_change', resourceType: 'appointment', resourceId: id, before: { status: appt.status }, after: { status: dto.status } },
      user,
    );
    return updated;
  }

  async checkIn(id: string, user: SessionUser) {
    return this.transition(id, { status: 'CHECKED_IN' as AppointmentStatusDto }, user);
  }

  async get(id: string, user: SessionUser) {
    const appt = await this.prisma.appointment.findFirst({
      where: { id, organizationId: user.organizationId ?? undefined },
      include: { patient: true },
    });
    if (!appt) throw new NotFoundException('Appointment not found.');
    return appt;
  }
}
