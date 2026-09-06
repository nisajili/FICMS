import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID, createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PasswordService } from './password.service';
import { TotpService } from './totp.service';
import { DEFAULT_ROLE_PERMISSIONS } from '@ficms/config';
import type {
  LoginResult,
  SessionUser,
  TotpSetupResponse,
  TenantRole,
} from '@ficms/types';
import type { User } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
    private readonly totpService: TotpService,
    private readonly audit: AuditService,
  ) {}

  private buildPermissions(user: User): string[] {
    if (user.role === 'platform_admin' || user.role === 'org_owner' || user.role === 'clinic_director' || user.role === 'clinic_admin') {
      return ['*'];
    }
    const base = DEFAULT_ROLE_PERMISSIONS[user.role as TenantRole] ?? [];
    return base;
  }

  private async toSessionUser(user: User): Promise<SessionUser> {
    const patient = await this.prisma.patient.findFirst({
      where: { organizationId: user.organizationId ?? undefined, userId: user.id },
      select: { id: true },
    }).catch(() => null);

    // patient may link via email
    const patientByEmail = patient ?? await this.prisma.patient.findFirst({
      where: { email: user.email, organizationId: user.organizationId ?? undefined },
      select: { id: true },
    }).catch(() => null);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as TenantRole,
      organizationId: user.organizationId,
      facilityId: user.facilityId,
      departmentId: user.departmentId,
      permissions: this.buildPermissions(user),
      isPlatformAdmin: user.role === 'platform_admin',
      isPatient: user.role === 'patient',
      mfaEnabled: user.mfaEnabled,
      patientId: (patient ?? patientByEmail)?.id ?? null,
    };
  }

  private signAccessToken(user: User, sessionUser: SessionUser): string {
    return this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        org: user.organizationId,
        fac: user.facilityId,
        role: user.role,
        permissions: sessionUser.permissions,
        mfa: user.mfaEnabled,
        patientId: sessionUser.patientId,
        type: 'access',
      },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: process.env.JWT_ACCESS_TTL ?? '900s' },
    );
  }

  private signRefreshToken(userId: string, sessionId: string): string {
    return this.jwtService.sign(
      { sub: userId, sid: sessionId, type: 'refresh' },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: process.env.JWT_REFRESH_TTL ?? '7d' },
    );
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async login(email: string, password: string, req?: { ip?: string; userAgent?: string }): Promise<LoginResult> {
    const normalized = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: normalized } });

    if (!user) {
      // Constant-time-ish fake work to reduce enumeration
      await this.passwordService.hash(normalized + Math.random());
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('Account is not active. Contact your administrator.');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException('Account temporarily locked. Try again later.');
    }

    const valid = await this.passwordService.verify(user.passwordHash, password);
    if (!valid) {
      const failed = user.failedLoginCount + 1;
      const lockedUntil = failed >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: failed, lockedUntil },
      });
      throw new UnauthorizedException('Invalid credentials.');
    }

    // Reset failure counters on successful password check.
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const sessionUser = await this.toSessionUser(user);
    this.logger.log(`User ${user.id} passed password check. Requires MFA: ${user.mfaEnabled}`);

    if (user.mfaEnabled) {
      // Issue a short-lived, non-session token for the MFA challenge.
      const mfaToken = this.jwtService.sign(
        { sub: user.id, type: 'mfa', challenge: randomUUID() },
        { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '5m' },
      );
      await this.audit.record({ action: 'auth.login_password_ok', resourceType: 'user', resourceId: user.id, reason: 'MFA pending', req }, sessionUser);
      return { user: sessionUser, accessToken: '', requiresMfa: true, mfaToken };
    }

    const result = await this.issueSession(user, sessionUser, req);
    await this.audit.record({ action: 'auth.login', resourceType: 'user', resourceId: user.id, req }, sessionUser);
    return result;
  }

  async verifyMfa(mfaToken: string, code: string, req?: { ip?: string; userAgent?: string }): Promise<LoginResult> {
    let payload: Record<string, unknown>;
    try {
      payload = await this.jwtService.verifyAsync(mfaToken, { secret: process.env.JWT_ACCESS_SECRET });
    } catch {
      throw new UnauthorizedException('MFA challenge expired. Please log in again.');
    }
    if (payload.type !== 'mfa') throw new UnauthorizedException('Invalid challenge.');

    const user = await this.prisma.user.findUnique({ where: { id: String(payload.sub) } });
    if (!user?.mfaSecret) throw new BadRequestException('MFA not configured.');

    if (!this.totpService.verify(code, user.mfaSecret)) {
      await this.audit.record({ action: 'auth.mfa_failed', resourceType: 'user', resourceId: user.id, req }, user as unknown as SessionUser);
      throw new UnauthorizedException('Invalid 2FA code.');
    }

    const sessionUser = await this.toSessionUser(user);
    const result = await this.issueSession(user, sessionUser, req);
    await this.audit.record({ action: 'auth.login_mfa_ok', resourceType: 'user', resourceId: user.id, req }, sessionUser);
    return result;
  }

  private async issueSession(user: User, sessionUser: SessionUser, req?: { ip?: string; userAgent?: string }): Promise<LoginResult> {
    const sessionId = randomUUID();
    const refreshToken = this.signRefreshToken(user.id, sessionId);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshTokenHash: this.hashToken(refreshToken),
        ip: req?.ip ?? null,
        userAgent: req?.userAgent ?? null,
        expiresAt,
      },
    });

    const accessToken = this.signAccessToken(user, sessionUser);
    return { user: sessionUser, accessToken, refreshToken, requiresMfa: false };
  }

  async refresh(refreshToken: string, req?: { ip?: string; userAgent?: string }): Promise<LoginResult> {
    let payload: Record<string, unknown>;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, { secret: process.env.JWT_REFRESH_SECRET });
    } catch {
      throw new UnauthorizedException('Invalid refresh token.');
    }
    if (payload.type !== 'refresh') throw new UnauthorizedException('Invalid token type.');

    const session = await this.prisma.session.findUnique({
      where: { id: String(payload.sid) },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired.');
    }
    if (session.refreshTokenHash !== this.hashToken(refreshToken)) {
      throw new UnauthorizedException('Refresh token mismatch.');
    }

    const sessionUser = await this.toSessionUser(session.user);
    const accessToken = this.signAccessToken(session.user, sessionUser);
    return { user: sessionUser, accessToken, requiresMfa: false };
  }

  async logout(refreshToken: string | undefined, req?: { ip?: string; userAgent?: string }): Promise<void> {
    if (!refreshToken) return;
    let payload: Record<string, unknown>;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, { secret: process.env.JWT_REFRESH_SECRET });
    } catch {
      return;
    }
    await this.prisma.session.updateMany({
      where: { id: String(payload.sid ?? '') },
      data: { revokedAt: new Date() },
    });
  }

  async beginTotpSetup(userId: string, email: string): Promise<TotpSetupResponse> {
    const secret = this.totpService.generateSecret();
    const otpauthUrl = this.totpService.buildOtpauthUrl(secret, email, 'FICMS');
    // QR code is generated client-side from otpauthUrl; return both.
    await this.prisma.user.update({ where: { id: userId }, data: { mfaSecret: secret } });
    return { secret, otpauthUrl, qrCodeDataUrl: '' };
  }

  async confirmTotpSetup(userId: string, code: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaSecret) throw new BadRequestException('No pending MFA secret.');
    if (!this.totpService.verify(code, user.mfaSecret)) {
      throw new BadRequestException('Invalid code.');
    }
    await this.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
  }

  async disableTotp(userId: string, code: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaSecret) throw new BadRequestException('MFA not enabled.');
    if (!this.totpService.verify(code, user.mfaSecret)) {
      throw new BadRequestException('Invalid code.');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null },
    });
  }

  async getSessionUser(userId: string): Promise<SessionUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;
    return this.toSessionUser(user);
  }

  /**
   * Resolve the current user's organisation branding for white-label rendering.
   * Returns the org name plus the per-org settings (CLINIC_NAME, PRIMARY_COLOR,
   * CURRENCY, TIMEZONE, ...). No clinic value is hard-coded in source.
   */
  async getOrganizationBranding(user: SessionUser): Promise<{
    id: string | null;
    name: string | null;
    slug: string | null;
    logoKey: string | null;
    faviconKey: string | null;
    settings: Record<string, unknown>;
  }> {
    const empty = { id: null, name: null, slug: null, logoKey: null, faviconKey: null, settings: {} };
    if (!user.organizationId) return empty;
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      include: { settings: true },
    });
    if (!org) return empty;
    const settings: Record<string, unknown> = {};
    for (const s of org.settings) settings[s.key] = s.value;
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logoKey: org.logoKey,
      faviconKey: org.faviconKey,
      settings,
    };
  }

  /** Create a user record (used by bootstrap + user management). */
  async createUser(input: {
    email: string;
    password?: string;
    name: string;
    role: string;
    organizationId?: string | null;
    facilityId?: string | null;
    departmentId?: string | null;
  }): Promise<User> {
    const passwordHash = input.password
      ? await this.passwordService.hash(input.password)
      : null;
    if (!passwordHash && input.role !== 'patient') {
      throw new BadRequestException('A password is required for staff accounts.');
    }
    return this.prisma.user.create({
      data: {
        email: input.email.trim().toLowerCase(),
        name: input.name,
        role: input.role,
        passwordHash,
        status: 'ACTIVE',
        organizationId: input.organizationId ?? null,
        facilityId: input.facilityId ?? null,
        departmentId: input.departmentId ?? null,
      },
    });
  }
}
