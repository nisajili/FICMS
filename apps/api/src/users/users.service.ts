import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { parsePagination, toPaginated } from '../common/pagination';
import type { SessionUser, TenantRole } from '@ficms/types';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly authService: AuthService,
  ) {}

  async invite(input: { email: string; name: string; role: TenantRole; facilityId?: string; departmentId?: string }, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const existing = await this.prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing) throw new BadRequestException('A user with that email already exists.');

    // Generate a temporary password for invited staff; in production a reset
    // email is dispatched via the notification queue.
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
    const created = await this.authService.createUser({
      email: input.email,
      name: input.name,
      role: input.role,
      password: tempPassword,
      organizationId: org,
      facilityId: input.facilityId ?? user.facilityId,
      departmentId: input.departmentId ?? user.departmentId,
    });
    await this.audit.record({ action: 'user.invite', resourceType: 'user', resourceId: created.id, after: { role: input.role } }, user);
    // In production, queue the welcome + temp password email here.
    return { id: created.id, email: created.email, role: created.role, temporaryPassword: tempPassword };
  }

  async list(q: { page?: number; pageSize?: number; search?: string; role?: string }, user: SessionUser) {
    const org = user.organizationId;
    if (!org) return { data: [], meta: { page: 1, pageSize: 0, total: 0, totalPages: 0 } };
    const { page, pageSize, skip, take } = parsePagination(q);
    const where: Record<string, unknown> = { organizationId: org, deletedAt: null };
    if (q.search) where.OR = [{ name: { contains: q.search, mode: 'insensitive' as const } }, { email: { contains: q.search, mode: 'insensitive' as const } }];
    if (q.role) where.role = q.role;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, email: true, role: true, status: true, facilityId: true, lastLoginAt: true, mfaEnabled: true } }),
      this.prisma.user.count({ where }),
    ]);
    return toPaginated(data, total, { page, pageSize });
  }

  async setStatus(id: string, status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED' | 'PENDING', user: SessionUser) {
    const target = await this.prisma.user.findFirst({ where: { id, organizationId: user.organizationId ?? undefined } });
    if (!target) throw new NotFoundException('User not found.');
    const updated = await this.prisma.user.update({ where: { id }, data: { status } });
    await this.audit.record({ action: `user.${status.toLowerCase()}`, resourceType: 'user', resourceId: id, before: { status: target.status }, after: { status } }, user);
    return updated;
  }

  async updateRole(id: string, role: TenantRole, user: SessionUser) {
    const target = await this.prisma.user.findFirst({ where: { id, organizationId: user.organizationId ?? undefined } });
    if (!target) throw new NotFoundException('User not found.');
    const updated = await this.prisma.user.update({ where: { id }, data: { role } });
    await this.audit.record({ action: 'user.change_role', resourceType: 'user', resourceId: id, before: { role: target.role }, after: { role } }, user);
    return updated;
  }
}
