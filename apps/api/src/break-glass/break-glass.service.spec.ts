import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { BreakGlassService } from './break-glass.service';

type Ctx = {
  prisma: any;
  audit: any;
};

function makeService(overrides: Partial<Ctx> = {}) {
  const prisma = overrides.prisma ?? {
    organization: { findUnique: jest.fn().mockResolvedValue({ id: 'org-1', name: 'Demo Clinic' }) },
    breakGlassGrant: {
      create: jest.fn().mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'grant-1', ...data, status: 'PENDING' }),
      ),
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'grant-1', ...data })),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    patient: { findMany: jest.fn().mockResolvedValue([]) },
    labResult: { findMany: jest.fn().mockResolvedValue([]) },
    prescription: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const audit = overrides.audit ?? { record: jest.fn().mockResolvedValue(undefined) };
  const config = {
    breakGlassMaxMinutes: 60,
    breakGlassAllowSelfApprove: false,
  } as any;

  const service = new BreakGlassService(config, prisma, audit);
  return { service, prisma, audit };
}

const admin = { id: 'admin-1', role: 'platform_admin', isPlatformAdmin: true } as any;
const otherAdmin = { id: 'admin-2', role: 'platform_admin', isPlatformAdmin: true } as any;
const staff = { id: 'staff-1', role: 'nurse', isPlatformAdmin: false } as any;

describe('BreakGlassService', () => {
  it('rejects non-platform-admins', async () => {
    const { service } = makeService();
    await expect(
      service.request({ organizationId: 'org-1', reason: 'Emergency record access' }, staff as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('creates a PENDING request with a capped duration and audits it', async () => {
    const { service, prisma, audit } = makeService();
    const result = await service.request(
      { organizationId: 'org-1', reason: 'Org takeover after clinic outage', durationMinutes: 999 },
      admin,
    );

    expect(result.status).toBe('PENDING');
    expect(result.organizationId).toBe('org-1');
    expect(result.expiresAt).toBeInstanceOf(Date);
    // capped at 60 minutes
    const minutes = (result.expiresAt.getTime() - Date.now()) / 60_000;
    expect(minutes).toBeLessThanOrEqual(60);
    expect(minutes).toBeGreaterThan(0);
    expect(prisma.breakGlassGrant.create).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'breakglass.request', resourceType: 'break_glass_grant', organizationId: 'org-1' }),
      admin,
    );
  });

  it('approves a pending request from a different admin', async () => {
    const { service, prisma, audit } = makeService();
    prisma.breakGlassGrant.findUnique.mockResolvedValue({
      id: 'grant-1',
      organizationId: 'org-1',
      requestedById: admin.id,
      reason: 'Emergency',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 60_000),
      approvedById: null,
      approvedAt: null,
    });

    const result = await service.approve('grant-1', otherAdmin);
    expect(result.status).toBe('ACTIVE');
    expect(result.approvedById).toBe(otherAdmin.id);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'breakglass.approve' }),
      otherAdmin,
    );
  });

  it('blocks self-approval unless explicitly enabled', async () => {
    const { service } = makeService();
    service['prisma']!.breakGlassGrant.findUnique.mockResolvedValue({
      id: 'grant-1',
      organizationId: 'org-1',
      requestedById: admin.id,
      reason: 'Emergency',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(service.approve('grant-1', admin)).rejects.toThrow(ForbiddenException);
  });

  it('cannot approve an already-active grant', async () => {
    const { service } = makeService();
    service['prisma']!.breakGlassGrant.findUnique.mockResolvedValue({
      id: 'grant-1',
      organizationId: 'org-1',
      requestedById: admin.id,
      reason: 'Emergency',
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(service.approve('grant-1', otherAdmin)).rejects.toThrow(BadRequestException);
  });

  it('revokes an active grant and audits it', async () => {
    const { service, prisma, audit } = makeService();
    prisma.breakGlassGrant.findUnique.mockResolvedValue({
      id: 'grant-1',
      organizationId: 'org-1',
      requestedById: admin.id,
      reason: 'Emergency',
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.breakGlassGrant.update.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'grant-1', status: 'REVOKED', ...data }),
    );

    const result = await service.revoke('grant-1', otherAdmin);
    expect(result.status).toBe('REVOKED');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'breakglass.revoke' }),
      otherAdmin,
    );
  });

  it('denies emergency read without an active grant', async () => {
    const { service } = makeService();
    service['prisma']!.breakGlassGrant.findFirst.mockResolvedValue(null);

    await expect(service.emergency('org-1', admin)).rejects.toThrow(ForbiddenException);
  });

  it('returns a bounded emergency summary and audits access when a grant is active', async () => {
    const { service, prisma, audit } = makeService();
    prisma.breakGlassGrant.findFirst.mockResolvedValue({
      id: 'grant-1',
      organizationId: 'org-1',
      requestedById: admin.id,
      reason: 'Emergency',
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.organization.findUnique.mockResolvedValue({ id: 'org-1', name: 'Demo Clinic', status: 'ACTIVE' });
    prisma.patient.findMany.mockResolvedValue([{ id: 'p1', givenName: 'Ada', familyName: 'Lovelace' }]);
    prisma.labResult.findMany.mockResolvedValue([{ id: 'r1', testName: 'FSH', value: '4.2', unit: 'IU/L' }]);
    prisma.prescription.findMany.mockResolvedValue([{ id: 'rx1', patientId: 'p1', status: 'VERIFIED', items: [] }]);
    prisma.breakGlassGrant.count.mockResolvedValue(1);

    const result = await service.emergency('org-1', admin);
    expect(result.organization.name).toBe('Demo Clinic');
    expect(result.summary.patientCount).toBe(1);
    expect(result.summary.resultCount).toBe(1);
    expect(result.summary.prescriptionCount).toBe(1);
    expect(result.patients[0].familyName).toBe('Lovelace');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'breakglass.access', resourceId: 'grant-1' }),
      admin,
    );
  });

  it('treats an expired active grant as not available and lazily expires it', async () => {
    const { service, prisma } = makeService();
    prisma.breakGlassGrant.findFirst.mockResolvedValue({
      id: 'grant-1',
      organizationId: 'org-1',
      requestedById: admin.id,
      reason: 'Emergency',
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() - 1000),
    });

    const active = await service.resolveActiveGrant(admin.id, 'org-1');
    expect(active).toBeNull();
    expect(prisma.breakGlassGrant.updateMany).toHaveBeenCalled();
  });

  it('throws NotFound when the organisation does not exist on request', async () => {
    const { service } = makeService();
    service['prisma']!.organization.findUnique.mockResolvedValue(null);
    await expect(
      service.request({ organizationId: 'org-missing', reason: 'Emergency record access' }, admin),
    ).rejects.toThrow(NotFoundException);
  });
});
