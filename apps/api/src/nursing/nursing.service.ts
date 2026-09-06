import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { SessionUser } from '@ficms/types';

@Injectable()
export class NursingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async recordVitals(input: {
    patientId: string;
    temperatureC?: number;
    pulseBpm?: number;
    bpSystolic?: number;
    bpDiastolic?: number;
    respiratoryRate?: number;
    spo2?: number;
    weightKg?: number;
    heightCm?: number;
  }, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const vitals = await this.prisma.vitalSign.create({
      data: {
        organizationId: org,
        patientId: input.patientId,
        temperatureC: input.temperatureC,
        pulseBpm: input.pulseBpm,
        bpSystolic: input.bpSystolic,
        bpDiastolic: input.bpDiastolic,
        respiratoryRate: input.respiratoryRate,
        spo2: input.spo2,
        weightKg: input.weightKg,
        heightCm: input.heightCm,
        recordedById: user.id,
      },
    });
    await this.audit.record({ action: 'nursing.vitals', resourceType: 'nursing', resourceId: vitals.id, after: { patientId: input.patientId } }, user);
    return vitals;
  }

  listVitals(patientId: string, user: SessionUser) {
    return this.prisma.vitalSign.findMany({
      where: { patientId, organizationId: user.organizationId ?? undefined },
      orderBy: { recordedAt: 'desc' },
    });
  }

  async addNote(input: {
    patientId: string;
    administeredMedication?: string;
    procedure?: string;
    checklist?: unknown;
    observation?: string;
    dischargeInstructions?: string;
  }, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const note = await this.prisma.nursingNote.create({
      data: {
        organizationId: org,
        patientId: input.patientId,
        administeredMedication: input.administeredMedication,
        procedure: input.procedure,
        checklist: input.checklist ? (input.checklist as object) : undefined,
        observation: input.observation,
        dischargeInstructions: input.dischargeInstructions,
        createdById: user.id,
      },
    });
    await this.audit.record({ action: 'nursing.note', resourceType: 'nursing', resourceId: note.id, after: { patientId: input.patientId } }, user);
    return note;
  }
}
