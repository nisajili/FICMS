import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RecordNumberService } from '../records/record-number.service';
import type { SessionUser } from '@ficms/types';

@Injectable()
export class DonorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly records: RecordNumberService,
  ) {}

  async create(input: { sex: 'FEMALE' | 'MALE' | 'OTHER' | 'UNKNOWN'; age?: number; screening?: unknown }, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const donorCode = await this.records.next(
      () => this.prisma.donorProfile.count({ where: { organizationId: org } }),
      { prefix: 'DON' },
    );
    // Anonymized: we store only a code and optional screening data, never PII by default.
    const donor = await this.prisma.donorProfile.create({
      data: {
        organizationId: org,
        donorCode,
        sex: input.sex,
        age: input.age,
        screening: input.screening ? (input.screening as object) : undefined,
        status: 'SCREENING',
      },
    });
    await this.audit.record({ action: 'donor.create', resourceType: 'donor', resourceId: donor.id, after: { donorCode } }, user);
    return donor;
  }

  list(user: SessionUser) {
    // Do NOT expose identity details; only anonymized donor codes + eligibility.
    return this.prisma.donorProfile.findMany({
      where: { organizationId: user.organizationId ?? undefined },
      select: { id: true, donorCode: true, sex: true, age: true, status: true, eligibility: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async setEligibility(id: string, eligibility: boolean, user: SessionUser) {
    const donor = await this.prisma.donorProfile.update({
      where: { id },
      data: { eligibility, status: eligibility ? 'ELIGIBLE' : 'INELIGIBLE' },
    });
    await this.audit.record({ action: 'donor.eligibility', resourceType: 'donor', resourceId: id, after: { eligibility } }, user);
    return donor;
  }
}
