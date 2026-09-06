import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { SessionUser } from '@ficms/types';

export interface AuditInput {
  organizationId?: string | null;
  facilityId?: string | null;
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  reason?: string | null;
  before?: unknown;
  after?: unknown;
  req?: { ip?: string; userAgent?: string };
}

/**
 * Immutable audit event writer. Audit events are never updated or deleted.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditInput, user?: SessionUser): Promise<void> {
    await this.prisma.auditEvent.create({
      data: {
        organizationId: input.organizationId ?? user?.organizationId ?? null,
        facilityId: input.facilityId ?? user?.facilityId ?? null,
        actorId: input.actorId ?? user?.id ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        reason: input.reason ?? null,
        before: input.before ? (input.before as object) : undefined,
        after: input.after ? (input.after as object) : undefined,
        ip: input.req?.ip ?? null,
        userAgent: input.req?.userAgent ?? null,
      },
    });
  }
}
