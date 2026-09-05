import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import type { SessionUser } from '@ficms/types';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Resolves the session user from the access JWT (cookie or bearer) and sets
 * the Prisma tenant context for the request. Every non-public endpoint runs
 * through this guard; the DB write guard then enforces organisation scoping.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) {
      this.prisma.setTenantContext({});
      return true;
    }

    const req = ctx.switchToHttp().getRequest();
    const token =
      this.extractToken(req) ??
      req.cookies?.ficms_access ??
      req.cookies?.access_token;

    if (!token) {
      throw new UnauthorizedException('Authentication required.');
    }

    let payload: Record<string, unknown>;
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired access token.');
    }

    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type.');
    }

    // Build the session user.
    const user: SessionUser = {
      id: String(payload.sub),
      email: String(payload.email ?? ''),
      name: String(payload.name ?? ''),
      role: (payload.role as SessionUser['role']) ?? 'patient',
      organizationId: payload.org ? String(payload.org) : null,
      facilityId: payload.fac ? String(payload.fac) : null,
      departmentId: null,
      permissions: (payload.permissions as string[]) ?? [],
      isPlatformAdmin: Boolean(payload.sub) && payload.role === 'platform_admin',
      isPatient: payload.role === 'patient',
      mfaEnabled: Boolean(payload.mfa),
      patientId: payload.patientId ? String(payload.patientId) : null,
    };

    req.user = user;

    // Set Prisma tenant context.
    // Note: we defer loading permissions from DB for speed; permissions come
    // from the JWT claim but are refreshed on login/re-auth.
    this.prisma.setTenantContext({
      organizationId: user.organizationId ?? undefined,
      facilityId: user.facilityId ?? undefined,
      isPlatformAdmin: user.isPlatformAdmin,
    });

    return true;
  }

  private extractToken(req: {
    headers?: Record<string, string | string[] | undefined>;
    cookies?: Record<string, string>;
  }): string | undefined {
    const header = req.headers?.['authorization'];
    const auth = Array.isArray(header) ? header[0] : header;
    if (!auth) return undefined;
    const [scheme, token] = auth.split(' ');
    if (scheme === 'Bearer' && token) return token;
    return undefined;
  }
}
