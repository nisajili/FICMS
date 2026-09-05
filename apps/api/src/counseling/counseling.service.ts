import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { SessionUser } from '@ficms/types';

@Injectable()
export class CounselingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(input: {
    patientId: string;
    sessionType: string;
    summary?: string;
    confidential?: boolean;
  }, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const patient = await this.prisma.patient.findFirst({ where: { id: input.patientId, organizationId: org } });
    if (!patient) throw new NotFoundException('Patient not found.');
    const session = await this.prisma.counselingSession.create({
      data: {
        organizationId: org,
        patientId: input.patientId,
        sessionType: input.sessionType,
        summary: input.summary,
        confidential: input.confidential ?? true,
        counselorId: user.id,
      },
    });
    // Counseling records are kept confidential; audit without clinical content.
    await this.audit.record({ action: 'counseling.create', resourceType: 'counseling', resourceId: session.id, after: { sessionType: input.sessionType } }, user);
    return session;
  }

  list(patientId: string, user: SessionUser) {
    return this.prisma.counselingSession.findMany({
      where: { patientId, organizationId: user.organizationId ?? undefined },
      orderBy: { sessionDate: 'desc' },
    });
  }
}
