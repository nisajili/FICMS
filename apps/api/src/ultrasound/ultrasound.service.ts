import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { SessionUser } from '@ficms/types';

@Injectable()
export class UltrasoundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(input: {
    patientId: string;
    cycleId?: string;
    type: string;
    endometrialThicknessMm?: number;
    leftOvaryFollicles?: unknown;
    rightOvaryFollicles?: unknown;
    report?: string;
    imagesKey?: unknown;
  }, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const patient = await this.prisma.patient.findFirst({ where: { id: input.patientId, organizationId: org } });
    if (!patient) throw new NotFoundException('Patient not found.');
    const scan = await this.prisma.ultrasoundScan.create({
      data: {
        organizationId: org,
        patientId: input.patientId,
        cycleId: input.cycleId ?? null,
        type: input.type,
        endometrialThicknessMm: input.endometrialThicknessMm,
        leftOvaryFollicles: input.leftOvaryFollicles ? (input.leftOvaryFollicles as object) : undefined,
        rightOvaryFollicles: input.rightOvaryFollicles ? (input.rightOvaryFollicles as object) : undefined,
        report: input.report,
        imagesKey: input.imagesKey ? (input.imagesKey as object) : undefined,
        createdBy: user.id,
      },
    });
    await this.audit.record({ action: 'ultrasound.create', resourceType: 'ultrasound', resourceId: scan.id, after: { type: input.type } }, user);
    return scan;
  }

  listForPatient(patientId: string, user: SessionUser) {
    return this.prisma.ultrasoundScan.findMany({
      where: { patientId, organizationId: user.organizationId ?? undefined },
      orderBy: { scannedAt: 'desc' },
    });
  }

  async verify(id: string, user: SessionUser) {
    const scan = await this.prisma.ultrasoundScan.findFirst({ where: { id, organizationId: user.organizationId ?? undefined } });
    if (!scan) throw new NotFoundException('Scan not found.');
    const updated = await this.prisma.ultrasoundScan.update({ where: { id }, data: { verifiedById: user.id, verifiedAt: new Date() } });
    await this.audit.record({ action: 'ultrasound.verify', resourceType: 'ultrasound', resourceId: id }, user);
    return updated;
  }
}
