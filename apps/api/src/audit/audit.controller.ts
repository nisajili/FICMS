import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { CurrentUser } from '../common/decorators';
import { PermissionsGuard, RequirePermissions } from '../common/permissions.guard';
import { PrismaService } from '../prisma/prisma.service';
import { parsePagination, toPaginated } from '../common/pagination';
import type { SessionUser } from '@ficms/types';

@ApiTags('audit')
@UseGuards(PermissionsGuard)
@Controller('audit')
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('events')
  @RequirePermissions('audit:view')
  @ApiOperation({ summary: 'List audit events (tenant-scoped; immutable)' })
  async list(
    @Query() q: { page?: number; pageSize?: number; resourceType?: string; resourceId?: string; action?: string },
    @CurrentUser() user: SessionUser,
  ) {
    const { page, pageSize, skip, take } = parsePagination(q);
    const where: Record<string, unknown> = {
      ...(user.isPlatformAdmin ? {} : { organizationId: user.organizationId ?? undefined }),
    };
    if (q.resourceType) where.resourceType = q.resourceType;
    if (q.resourceId) where.resourceId = q.resourceId;
    if (q.action) where.action = q.action;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditEvent.findMany({ where, skip, take, orderBy: { timestamp: 'desc' } }),
      this.prisma.auditEvent.count({ where }),
    ]);
    return toPaginated(data, total, { page, pageSize });
  }
}
