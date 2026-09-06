import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordNumberService } from '../records/record-number.service';
import type { SessionUser } from '@ficms/types';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class FacilitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly records: RecordNumberService,
  ) {}

  async create(input: { name: string; code?: string; address?: string; city?: string; phone?: string; timezone?: string }, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const code = input.code ?? input.name.slice(0, 4).toUpperCase();
    const facility = await this.prisma.facility.create({
      data: { organizationId: org, name: input.name, code, address: input.address, city: input.city, phone: input.phone, timezone: input.timezone, status: 'ACTIVE' },
    });
    await this.audit.record({ action: 'facility.create', resourceType: 'admin', resourceId: facility.id, after: { name: input.name } }, user);
    return facility;
  }

  list(user: SessionUser) {
    return this.prisma.facility.findMany({
      where: { organizationId: user.organizationId ?? undefined },
      include: { _count: { select: { departments: true, appointments: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createDepartment(input: { name: string; code?: string; facilityId?: string }, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const code = input.code ?? input.name.slice(0, 6).toUpperCase();
    const dept = await this.prisma.department.create({
      data: { organizationId: org, facilityId: input.facilityId ?? null, name: input.name, code },
    });
    await this.audit.record({ action: 'facility.create_department', resourceType: 'admin', resourceId: dept.id, after: { name: input.name } }, user);
    return dept;
  }

  listDepartments(user: SessionUser) {
    return this.prisma.department.findMany({
      where: { organizationId: user.organizationId ?? undefined },
      orderBy: { name: 'asc' },
    });
  }
}
