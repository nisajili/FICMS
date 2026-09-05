import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import type { SessionUser } from '@ficms/types';

export function getRequestUser(ctx: ExecutionContext): SessionUser {
  const req = ctx.switchToHttp().getRequest();
  return req.user as SessionUser;
}

/** Injects the authenticated session user. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionUser => {
    const user = getRequestUser(ctx);
    if (!user) {
      throw new ForbiddenException('No authenticated user.');
    }
    return user;
  },
);

/** Injects a single property of the session user, e.g. @CurrentUser('id'). */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const user = getRequestUser(ctx);
    if (!user?.id) {
      throw new ForbiddenException('No authenticated user.');
    }
    return user.id;
  },
);

/** Public route marker (no auth required). */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => {
  return (_target: unknown, _key?: string, _desc?: PropertyDescriptor) => {};
};
