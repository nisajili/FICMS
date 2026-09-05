import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { SessionUser } from '@ficms/types';

export const PERMISSIONS_KEY = 'required_permissions';

/** Declare required `resource:action` permissions on a controller/handler. */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

const hasPermission = (user: SessionUser, required: string): boolean => {
  if (user.isPlatformAdmin) return true;
  if (user.permissions.includes('*')) return true;
  if (user.permissions.includes('admin:*') && required.startsWith('admin:')) {
    return true;
  }
  if (user.permissions.includes(required)) return true;
  // Support wildcard resource: `patient:*` grants any patient:action.
  const [resource] = required.split(':');
  return user.permissions.includes(`${resource}:*`);
};

/** RBAC/ABAC guard that enforces the permission matrix from the JWT. */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!required || required.length === 0) return true;

    const user = ctx.switchToHttp().getRequest().user as SessionUser | undefined;
    if (!user) throw new ForbiddenException('No authenticated user.');

    // Patients only ever get data from self-scoped endpoints; deny cross.
    if (user.isPatient && required.some((p) => p !== 'patient:view_self' && !p.startsWith('patient:view_self'))) {
      if (!required.every((p) => p === 'patient:view_self')) {
        throw new ForbiddenException('This action is not permitted for patients.');
      }
    }

    const ok = required.every((p) => hasPermission(user, p));
    if (!ok) throw new ForbiddenException('Insufficient permissions.');
    return true;
  }
}
