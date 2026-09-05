import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { parsePagination, toPaginated } from '../common/pagination';
import type { SessionUser } from '@ficms/types';
import type { AppConfig } from '../config/config.module';

const MAX_EMERGENCY_PATIENTS = 50;
const MAX_EMERGENCY_RESULTS = 20;
const MAX_EMERGENCY_PRESCRIPTIONS = 30;

/**
 * Break-glass emergency access for platform administrators.
 *
 * Platform administrators are intentionally barred from clinical data by
 * default. This service models a tightly scoped, audited emergency path:
 *
 *  1. A platform admin requests access to ONE organisation, with a reason and
 *     a bounded duration (defaults to the platform maximum, currently <= 120 min).
 *  2. A SECOND platform admin must approve the request (unless self-approval is
 *     explicitly enabled in development via BREAK_GLASS_ALLOW_SELF_APPROVE).
 *  3. While ACTIVE (and not expired), the admin may call the emergency read
 *     endpoint which returns a bounded, curated clinical summary for that
 *     organisation. Every access is written to the immutable audit trail.
 *  4. Grants auto-expire (lazily enforced) and may be revoked at any time.
 */
@Injectable()
export class BreakGlassService {
  constructor(
    @Inject('APP_CONFIG') private readonly config: AppConfig,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private get maxMinutes(): number {
    return Math.min(this.config.breakGlassMaxMinutes, 120);
  }

  private assertPlatformAdmin(user: SessionUser): void {
    if (!user.isPlatformAdmin || user.role !== 'platform_admin') {
      throw new ForbiddenException('Only platform administrators may use break-glass access.');
    }
  }

  /** Create a break-glass access request (status = PENDING). */
  async request(
    dto: { organizationId: string; reason: string; durationMinutes?: number },
    user: SessionUser,
  ) {
    this.assertPlatformAdmin(user);

    const org = await this.prisma.organization.findUnique({
      where: { id: dto.organizationId },
      select: { id: true, name: true },
    });
    if (!org) throw new NotFoundException('Organisation not found.');

    const requestedMinutes = dto.durationMinutes ?? this.maxMinutes;
    const minutes = Math.max(1, Math.min(requestedMinutes, this.maxMinutes));
    const expiresAt = new Date(Date.now() + minutes * 60_000);

    const grant = await this.prisma.breakGlassGrant.create({
      data: {
        organizationId: dto.organizationId,
        requestedById: user.id,
        reason: dto.reason,
        status: 'PENDING',
        expiresAt,
      },
    });

    await this.audit.record(
      {
        organizationId: dto.organizationId,
        actorId: user.id,
        action: 'breakglass.request',
        resourceType: 'break_glass_grant',
        resourceId: grant.id,
        reason: dto.reason,
        after: { organizationId: dto.organizationId, expiresAt: expiresAt.toISOString(), minutes },
      },
      user,
    );

    return { ...grant, organization: { id: org.id, name: org.name } };
  }

  /** Approve a pending break-glass request (requires a DIFFERENT admin). */
  async approve(id: string, user: SessionUser) {
    this.assertPlatformAdmin(user);

    const grant = await this.prisma.breakGlassGrant.findUnique({ where: { id } });
    if (!grant) throw new NotFoundException('Break-glass request not found.');

    if (grant.status !== 'PENDING') {
      throw new BadRequestException(`Cannot approve a grant that is already ${grant.status}.`);
    }
    if (new Date(grant.expiresAt).getTime() <= Date.now()) {
      await this.markExpired(grant.id);
      throw new BadRequestException('This break-glass request has expired before approval.');
    }
    if (
      grant.requestedById === user.id &&
      !this.config.breakGlassAllowSelfApprove
    ) {
      throw new ForbiddenException('Break-glass requests must be approved by a different platform administrator.');
    }

    const updated = await this.prisma.breakGlassGrant.update({
      where: { id },
      data: { status: 'ACTIVE', approvedById: user.id, approvedAt: new Date() },
    });

    await this.audit.record(
      {
        organizationId: grant.organizationId,
        actorId: user.id,
        action: 'breakglass.approve',
        resourceType: 'break_glass_grant',
        resourceId: grant.id,
        reason: grant.reason,
      },
      user,
    );

    return updated;
  }

  /** Revoke an active/pending break-glass grant. */
  async revoke(id: string, user: SessionUser) {
    this.assertPlatformAdmin(user);

    const grant = await this.prisma.breakGlassGrant.findUnique({ where: { id } });
    if (!grant) throw new NotFoundException('Break-glass request not found.');
    if (grant.status === 'REVOKED' || grant.status === 'EXPIRED') {
      throw new BadRequestException(`Grant is already ${grant.status}.`);
    }

    const updated = await this.prisma.breakGlassGrant.update({
      where: { id },
      data: { status: 'REVOKED', revokedById: user.id, revokedAt: new Date() },
    });

    await this.audit.record(
      {
        organizationId: grant.organizationId,
        actorId: user.id,
        action: 'breakglass.revoke',
        resourceType: 'break_glass_grant',
        resourceId: grant.id,
        reason: grant.reason,
      },
      user,
    );

    return updated;
  }

  /** List break-glass grants (platform admins can audit the whole trail). */
  async list(q: { status?: string; organizationId?: string; page?: number; pageSize?: number }, _user: SessionUser) {
    const { page, pageSize, skip, take, orderBy } = parsePagination(q);
    const where: Record<string, unknown> = {};
    if (q.status) where.status = q.status;
    if (q.organizationId) where.organizationId = q.organizationId;

    const [items, total] = await Promise.all([
      this.prisma.breakGlassGrant.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          organization: { select: { id: true, name: true } },
        },
      }),
      this.prisma.breakGlassGrant.count({ where }),
    ]);

    return toPaginated(items, total, { page, pageSize });
  }

  /**
   * Return a bounded emergency clinical summary for an organisation, only if the
   * caller has an ACTIVE, unexpired break-glass grant for it. Always audited.
   */
  async emergency(organizationId: string, user: SessionUser) {
    this.assertPlatformAdmin(user);

    const active = await this.resolveActiveGrant(user.id, organizationId);
    if (!active) {
      throw new ForbiddenException(
        'No active break-glass grant for this organisation. Request and have it approved first.',
      );
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, status: true },
    });
    if (!org) throw new NotFoundException('Organisation not found.');

    const [patients, recentResults, activePrescriptions, pendingRequests] = await Promise.all([
      this.prisma.patient.findMany({
        where: { organizationId },
        select: {
          id: true,
          medicalRecordNumber: true,
          givenName: true,
          familyName: true,
          dateOfBirth: true,
          sex: true,
          status: true,
        },
        orderBy: { createdAt: 'desc' },
        take: MAX_EMERGENCY_PATIENTS,
      }),
      this.prisma.labResult.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: MAX_EMERGENCY_RESULTS,
        select: {
          id: true,
          patientId: true,
          testName: true,
          testCode: true,
          value: true,
          unit: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.prescription.findMany({
        where: {
          organizationId,
          status: { in: ['PRESCRIBED', 'VERIFIED', 'DISPENSED', 'PARTIALLY_DISPENSED'] },
        },
        orderBy: { createdAt: 'desc' },
        take: MAX_EMERGENCY_PRESCRIPTIONS,
        select: {
          id: true,
          patientId: true,
          status: true,
          createdAt: true,
          items: { select: { medicationName: true, dosage: true, quantity: true } },
        },
      }),
      this.prisma.breakGlassGrant.count({
        where: { organizationId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
      }),
    ]);

    await this.audit.record(
      {
        organizationId,
        actorId: user.id,
        action: 'breakglass.access',
        resourceType: 'break_glass_grant',
        resourceId: active.id,
        reason: active.reason,
        after: {
          patients: patients.length,
          results: recentResults.length,
          prescriptions: activePrescriptions.length,
        },
      },
      user,
    );

    return {
      grant: {
        id: active.id,
        status: active.status,
        expiresAt: active.expiresAt,
        reason: active.reason,
      },
      organization: org,
      expired: false,
      summary: {
        patientCount: patients.length,
        resultCount: recentResults.length,
        prescriptionCount: activePrescriptions.length,
        activeGrantCount: pendingRequests,
      },
      patients,
      recentResults,
      activePrescriptions,
    };
  }

  /**
   * Find an ACTIVE grant for a given admin + organisation with a future expiry.
   * Lazily expires grants that have passed their expiry window so the DB stays
   * consistent without needing a scheduler in every deployment.
   */
  async resolveActiveGrant(adminUserId: string, organizationId: string) {
    const grant = await this.prisma.breakGlassGrant.findFirst({
      where: {
        organizationId,
        requestedById: adminUserId,
        status: 'ACTIVE',
      },
      orderBy: { expiresAt: 'desc' },
    });

    if (!grant) return null;
    if (new Date(grant.expiresAt).getTime() <= Date.now()) {
      await this.markExpired(grant.id);
      return null;
    }
    return grant;
  }

  private async markExpired(id: string): Promise<void> {
    await this.prisma.breakGlassGrant.updateMany({
      where: { id, status: 'ACTIVE' },
      data: { status: 'EXPIRED' },
    });
  }
}
