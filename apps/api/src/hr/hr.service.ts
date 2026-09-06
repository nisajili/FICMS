import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { SessionUser } from '@ficms/types';

@Injectable()
export class HrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async upsertStaff(input: {
    userId?: string;
    employeeNumber?: string;
    jobTitle?: string;
    department?: string;
    qualification?: string;
    licenseNumber?: string;
    licenseExpiry?: string;
    joinedAt?: string;
  }, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const staff = await this.prisma.staffProfile.upsert({
      where: { userId: input.userId ?? '00000000-0000-0000-0000-000000000000' },
      create: {
        organizationId: org,
        userId: input.userId,
        employeeNumber: input.employeeNumber,
        jobTitle: input.jobTitle,
        department: input.department,
        qualification: input.qualification,
        licenseNumber: input.licenseNumber,
        licenseExpiry: input.licenseExpiry ? new Date(input.licenseExpiry) : null,
        joinedAt: input.joinedAt ? new Date(input.joinedAt) : null,
      },
      update: {
        employeeNumber: input.employeeNumber,
        jobTitle: input.jobTitle,
        department: input.department,
        qualification: input.qualification,
        licenseNumber: input.licenseNumber,
        licenseExpiry: input.licenseExpiry ? new Date(input.licenseExpiry) : null,
      },
    });
    await this.audit.record({ action: 'hr.upsert_staff', resourceType: 'hr', resourceId: staff.id, after: { jobTitle: input.jobTitle } }, user);
    return staff;
  }

  listStaff(user: SessionUser) {
    return this.prisma.staffProfile.findMany({
      where: { organizationId: user.organizationId ?? undefined },
      orderBy: { createdAt: 'desc' },
    });
  }

  async submitLeave(input: { userId: string; type: string; startDate: string; endDate: string; reason?: string }, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const leave = await this.prisma.leaveRequest.create({
      data: {
        organizationId: org,
        userId: input.userId,
        type: input.type,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        reason: input.reason,
        status: 'PENDING',
      },
    });
    await this.audit.record({ action: 'hr.submit_leave', resourceType: 'hr', resourceId: leave.id, after: { type: input.type } }, user);
    return leave;
  }

  async approveLeave(id: string, approved: boolean, user: SessionUser) {
    const leave = await this.prisma.leaveRequest.findFirst({ where: { id, organizationId: user.organizationId ?? undefined } });
    if (!leave) throw new NotFoundException('Leave request not found.');
    if (leave.status !== 'PENDING') throw new BadRequestException('Only pending leave can be decided.');
    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: { status: approved ? 'APPROVED' : 'REJECTED', approvedById: user.id, approvedAt: new Date() },
    });
    await this.audit.record({ action: approved ? 'hr.approve_leave' : 'hr.reject_leave', resourceType: 'hr', resourceId: id }, user);
    return updated;
  }

  /** List leave requests for the organisation (newest first). */
  async listLeave(q: { status?: string; userId?: string }, user: SessionUser) {
    const org = user.organizationId;
    if (!org) return [];
    const where: Record<string, unknown> = { organizationId: org };
    if (q.status) where.status = q.status;
    if (q.userId) where.userId = q.userId;
    return this.prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }
}
