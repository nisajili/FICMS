import { UnauthorizedException } from '@nestjs/common';
import { TenantGuard, IS_PUBLIC_KEY } from './tenant.guard';

function makeContext(overrides: { handler?: unknown; handlerMeta?: Record<string, unknown> } = {}) {
  const handler = overrides.handler ?? (() => undefined);
  const req: { headers: Record<string, string>; cookies: Record<string, string>; user: any } = {
    headers: {},
    cookies: {},
    user: undefined,
  };
  const ctx = {
    getHandler: () => handler,
    getClass: () => function Controller() {},
    switchToHttp: () => ({ getRequest: () => req }),
  } as any;
  return { ctx, req };
}

describe('TenantGuard', () => {
  it('allows a public route without a token', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(true),
    } as any;
    const jwt = { verifyAsync: jest.fn() } as any;
    const prisma = { setTenantContext: jest.fn() } as any;
    const guard = new TenantGuard(reflector, jwt, prisma);

    const { ctx } = makeContext();
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [expect.anything(), expect.anything()]);
    expect(prisma.setTenantContext).toHaveBeenCalledWith({});
  });

  it('rejects a guarded route with no token', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as any;
    const jwt = { verifyAsync: jest.fn() } as any;
    const prisma = { setTenantContext: jest.fn() } as any;
    const guard = new TenantGuard(reflector, jwt, prisma);

    const { ctx } = makeContext();
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('sets tenant context for a valid authenticated user', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) } as any;
    const jwt = {
      verifyAsync: jest.fn().mockResolvedValue({
        sub: 'user-1',
        email: 'a@b.c',
        name: 'Alice',
        role: 'nurse',
        org: 'org-1',
        fac: 'fac-1',
        permissions: ['patient:view', 'nursing:create'],
        type: 'access',
      }),
    } as any;
    const prisma = { setTenantContext: jest.fn() } as any;
    const guard = new TenantGuard(reflector, jwt, prisma);

    const { ctx, req } = makeContext({ handlerMeta: { [IS_PUBLIC_KEY]: false } });
    req.headers = { authorization: 'Bearer abc.def.ghi' };

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toBeTruthy();
    expect(req.user.role).toBe('nurse');
    expect(prisma.setTenantContext).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-1', facilityId: 'fac-1', isPlatformAdmin: false }),
    );
  });
});
