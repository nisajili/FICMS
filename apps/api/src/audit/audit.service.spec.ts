import { AuditService } from './audit.service';

type Ctx = { prisma?: any };

function makeService(overrides: Ctx = {}) {
  const prisma = overrides.prisma ?? { auditEvent: { create: jest.fn().mockResolvedValue({ id: 'ae1' }) } };
  return { service: new AuditService(prisma), prisma };
}

describe('AuditService', () => {
  it('writes an immutable audit event', async () => {
    const { service, prisma } = makeService();
    await service.record({ action: 'patient.create', resourceType: 'patient', resourceId: 'p1', after: { name: 'x' }, req: { ip: '10.0.0.1', userAgent: 'jest' } });
    expect(prisma.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: null,
        facilityId: null,
        actorId: null,
        action: 'patient.create',
        resourceType: 'patient',
        resourceId: 'p1',
        after: { name: 'x' },
        ip: '10.0.0.1',
        userAgent: 'jest',
      }),
    });
  });

  it('falls back to the acting user for organisation/facility/actor context', async () => {
    const { service, prisma } = makeService();
    const user = { id: 'u1', organizationId: 'org-1', facilityId: 'f1' } as any;
    await service.record({ action: 'cycle.create', resourceType: 'cycle', resourceId: 'c1' }, user);
    const data = prisma.auditEvent.create.mock.calls[0][0].data;
    expect(data.organizationId).toBe('org-1');
    expect(data.facilityId).toBe('f1');
    expect(data.actorId).toBe('u1');
  });

  it('allows explicit audit context to override the acting user', async () => {
    const { service, prisma } = makeService();
    const user = { id: 'u1', organizationId: 'org-1', facilityId: 'f1' } as any;
    await service.record({ organizationId: 'org-2', facilityId: 'f2', actorId: 'executed-as', action: 'org.audit', resourceType: 'org' }, user);
    const data = prisma.auditEvent.create.mock.calls[0][0].data;
    expect(data.organizationId).toBe('org-2');
    expect(data.facilityId).toBe('f2');
    expect(data.actorId).toBe('executed-as');
  });

  it('omits before/after when not supplied', async () => {
    const { service, prisma } = makeService();
    await service.record({ action: 'login', resourceType: 'session' });
    const data = prisma.auditEvent.create.mock.calls[0][0].data;
    expect(data.before).toBeUndefined();
    expect(data.after).toBeUndefined();
  });
});
