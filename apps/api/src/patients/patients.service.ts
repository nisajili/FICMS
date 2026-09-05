import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RecordNumberService } from '../records/record-number.service';
import { parsePagination, toPaginated } from '../common/pagination';
import type { SessionUser } from '@ficms/types';
import { CreatePatientDto, UpdatePatientDto, PatientQueryDto } from './dto/patient.dto';

/** Per-org relation so we can count within a tenant. */
const patientWhereOrg = (org: string, where: Prisma.PatientWhereInput = {}) => ({
  organizationId: org,
  ...where,
});

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly records: RecordNumberService,
  ) {}

  async register(dto: CreatePatientDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');

    // Duplicate detection (same family + given name + phone/email).
    const dup = await this.prisma.patient.findFirst({
      where: {
        organizationId: org,
        familyName: dto.familyName,
        givenName: dto.givenName,
        OR: dto.phone ? [{ phone: dto.phone }] : undefined,
      },
    });
    const duplicateWarning = dup ? { duplicatePatientId: dup.id } : undefined;

    const medicalRecordNumber = await this.records.next(
      () => this.prisma.patient.count({ where: { organizationId: org } }),
      { prefix: 'MRN' },
    );

    const patient = await this.prisma.patient.create({
      data: {
        organizationId: org,
        medicalRecordNumber,
        givenName: dto.givenName,
        familyName: dto.familyName,
        preferredName: dto.preferredName,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        sex: (dto.sex as never) ?? 'UNKNOWN',
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        emergencyName: dto.emergencyName,
        emergencyPhone: dto.emergencyPhone,
      },
    });

    await this.audit.record(
      { action: 'patient.create', resourceType: 'patient', resourceId: patient.id, after: { mrn: medicalRecordNumber } },
      user,
    );

    return { ...patient, duplicateWarning };
  }

  async list(q: PatientQueryDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) return { data: [], meta: { page: 1, pageSize: 0, total: 0, totalPages: 0 } };
    const { page, pageSize, skip, take, orderBy } = parsePagination(q);
    const where = patientWhereOrg(org, {
      ...(q.search
        ? {
            OR: [
              { familyName: { contains: q.search, mode: 'insensitive' as const } },
              { givenName: { contains: q.search, mode: 'insensitive' as const } },
              { medicalRecordNumber: { contains: q.search } },
              { phone: { contains: q.search } },
            ],
          }
        : {}),
      ...(q.status ? { status: q.status as never } : {}),
    });
    const [data, total] = await this.prisma.$transaction([
      this.prisma.patient.findMany({ where, skip, take, orderBy: orderBy ?? { updatedAt: 'desc' } }),
      this.prisma.patient.count({ where }),
    ]);
    return toPaginated(data, total, { page, pageSize });
  }

  async get(id: string, user: SessionUser) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, organizationId: user.organizationId ?? undefined },
      include: {
        partnerLinks: { include: { patient: { select: { id: true, givenName: true, familyName: true, medicalRecordNumber: true } } } },
        consents: { orderBy: { createdAt: 'desc' }, take: 10 },
        appointments: { orderBy: { scheduledStart: 'desc' }, take: 10 },
      },
    });
    if (!patient) throw new NotFoundException('Patient not found.');
    return patient;
  }

  async update(id: string, dto: UpdatePatientDto, user: SessionUser) {
    const existing = await this.prisma.patient.findFirst({ where: { id, organizationId: user.organizationId ?? undefined } });
    if (!existing) throw new NotFoundException('Patient not found.');
    const updated = await this.prisma.patient.update({
      where: { id },
      data: {
        ...dto,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        version: { increment: 1 },
      },
    });
    await this.audit.record(
      { action: 'patient.update', resourceType: 'patient', resourceId: id, before: existing, after: updated },
      user,
    );
    return updated;
  }

  async linkPartner(patientId: string, partnerId: string, relationshipType: string, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    if (patientId === partnerId) throw new BadRequestException('Cannot link a patient to themselves.');
    for (const pid of [patientId, partnerId]) {
      const exists = await this.prisma.patient.findFirst({ where: { id: pid, organizationId: org } });
      if (!exists) throw new NotFoundException(`Patient ${pid} not found in this organisation.`);
    }
    await this.prisma.partner.upsert({
      where: { patientId_partnerId: { patientId, partnerId } },
      create: { organizationId: org, patientId, partnerId, relationshipType },
      update: { relationshipType, active: true },
    });
    await this.prisma.partner.upsert({
      where: { patientId_partnerId: { patientId: partnerId, partnerId: patientId } },
      create: { organizationId: org, patientId: partnerId, partnerId: patientId, relationshipType },
      update: { relationshipType, active: true },
    });
    await this.audit.record(
      { action: 'patient.link_partner', resourceType: 'patient', resourceId: patientId, after: { partnerId } },
      user,
    );
    return { linked: true };
  }

  async listPartners(patientId: string, user: SessionUser) {
    const rows = await this.prisma.partner.findMany({
      where: { patientId, organizationId: user.organizationId ?? undefined, active: true },
      include: { patient: { select: { id: true, givenName: true, familyName: true, medicalRecordNumber: true } } },
    });
    return rows.map((r) => r.patient);
  }

  // ---------------------------------------------------------------------------
  // Patient self-service (guarded by `patient:view_self`; patients may only
  // ever read/update data belonging to the patient linked to their account).
  // ---------------------------------------------------------------------------

  private async requireSelfPatient(user: SessionUser) {
    if (!user.patientId) {
      throw new NotFoundException('No patient record is linked to this account.');
    }
    const patient = await this.prisma.patient.findFirst({
      where: { id: user.patientId, organizationId: user.organizationId ?? undefined },
    });
    if (!patient) throw new NotFoundException('Patient record not found.');
    return patient;
  }

  async getSelf(user: SessionUser) {
    const patient = await this.requireSelfPatient(user);
    // Never expose internal clinical data to the patient. Return safe profile
    // fields plus their linked partner (reduced) and consents status only.
    const partners = await this.listPartners(patient.id, user);
    const consents = await this.prisma.consent.findMany({
      where: { patientId: patient.id, organizationId: user.organizationId ?? undefined },
      select: { id: true, title: true, status: true, signedAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return { ...patient, partners, consents };
  }

  async updateSelf(dto: UpdatePatientDto, user: SessionUser) {
    const patient = await this.requireSelfPatient(user);
    const updated = await this.prisma.patient.update({
      where: { id: patient.id },
      data: {
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        preferredName: dto.preferredName,
        emergencyName: dto.emergencyName,
        emergencyPhone: dto.emergencyPhone,
        // Patients may not change identity-critical fields (given/family name,
        // date of birth, sex, MRN) through the self-service endpoint.
        version: { increment: 1 },
      },
    });
    await this.audit.record({ action: 'patient.self_update', resourceType: 'patient', resourceId: patient.id, after: { updated: true } }, user);
    return updated;
  }

  async selfAppointments(user: SessionUser) {
    const patient = await this.requireSelfPatient(user);
    return this.prisma.appointment.findMany({
      where: { patientId: patient.id, organizationId: user.organizationId ?? undefined },
      include: {
        patient: { select: { id: true, givenName: true, familyName: true, medicalRecordNumber: true } },
      },
      orderBy: { scheduledStart: 'asc' },
    });
  }

  async selfResults(user: SessionUser) {
    const patient = await this.requireSelfPatient(user);
    // Only show results from orders that have been RELEASED to the patient.
    const results = await this.prisma.labResult.findMany({
      where: {
        organizationId: user.organizationId ?? undefined,
        labOrder: { patientId: patient.id, status: 'RELEASED' },
      },
      include: { labOrder: { select: { id: true, orderNumber: true, releasedAt: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return results;
  }

  async selfInvoices(user: SessionUser) {
    const patient = await this.requireSelfPatient(user);
    return this.prisma.invoice.findMany({
      where: { patientId: patient.id, organizationId: user.organizationId ?? undefined },
      include: { lineItems: true, payments: true, installmentPlans: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async selfPrescriptions(user: SessionUser) {
    const patient = await this.requireSelfPatient(user);
    return this.prisma.prescription.findMany({
      where: { patientId: patient.id, organizationId: user.organizationId ?? undefined },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** A patient requests an appointment; the clinic confirms/schedules it. */
  async requestSelfAppointment(dto: { scheduledStart?: string; serviceType?: string }, user: SessionUser) {
    const patient = await this.requireSelfPatient(user);
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const scheduledStart = dto.scheduledStart ? new Date(dto.scheduledStart) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    const code = await this.records.next(
      () => this.prisma.appointment.count({ where: { organizationId: org } }),
      { prefix: 'APT' },
    );
    const appointment = await this.prisma.appointment.create({
      data: {
        organizationId: org,
        code,
        patientId: patient.id,
        facilityId: user.facilityId,
        scheduledStart,
        scheduledEnd: new Date(scheduledStart.getTime() + 60 * 60 * 1000),
        serviceType: dto.serviceType,
        status: 'REQUESTED',
        source: 'patient_portal',
      },
    });
    await this.audit.record({ action: 'patient.request_appointment', resourceType: 'appointment', resourceId: appointment.id, after: { code } }, user);
    return appointment;
  }
}
