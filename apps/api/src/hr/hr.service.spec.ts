import { BadRequestException, NotFoundException } from '@nestjs/common';
import { HrService } from './hr.service';

type Ctx = { prisma?: any; audit?: any };

const staff = { id: 'u1', organizationId: 'org-1', role: 'admin' } as any;

function makeService(overrides: Ctx = {}) {
  const prisma =
    overrides.prisma ??
    (() => {
      const base = {
        staffProfile: {
          upsert: jest.fn().mockImplementation(({ create }: any) => Promise.resolve({ id: 'sp1', ...create })),
          findMany: jest.fn().mockResolvedValue([{ id: 'sp1' }]),
        },
        leaveRequest: {
          create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'l1', ...data })),
          findFirst: jest.fn().mockResolvedValue({ id: 'l1', organizationId: 'org-1', status: 'PENDING' }),
          update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'l1', ...data })),
          findMany: jest.fn().mockResolvedValue([{ id: 'l1' }]),
        },
      };
      return base;
    })();
  const audit = overrides.audit ?? { record: jest.fn().mockResolvedValue(undefined) };
  return { service: new HrService(prisma, audit), prisma, audit };
}

describe('HrService', () => {
  it('upserts a staff profile scoped to the organisation and audits it', async () => {
    const { service, prisma, audit } = makeService();
    const result = await service.upsertStaff({ userId: 'u2', jobTitle: 'Embryologist', licenseExpiry: '2027-12-31' }, staff);
    expect(result.id).toBe('sp1');
    expect(result.organizationId).toBe('org-1');
    expect(prisma.staffProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ jobTitle: 'Embryologist' }) }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'hr.upsert_staff', resourceId: 'sp1', after: { jobTitle: 'Embryologist' } }),
      staff,
    );
  });

  it('rejects upsert without an organisation context', async () => {
    const { service } = makeService();
    await expect(service.upsertStaff({ jobTitle: 'Nurse' }, { id: 'u1' } as any)).rejects.toThrow(BadRequestException);
  });

  it('lists staff scoped to the organisation', async () => {
    const { service, prisma } = makeService();
    await service.listStaff(staff);
    expect(prisma.staffProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'org-1' } }),
    );
  });

  it('submits a leave request as PENDING and audits it', async () => {
    const { service, prisma, audit } = makeService();
    const result = await service.submitLeave({ userId: 'u2', type: 'ANNUAL', startDate: '2026-10-01', endDate: '2026-10-05' }, staff);
    expect(result.status).toBe('PENDING');
    expect(result.organizationId).toBe('org-1');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'hr.submit_leave', resourceId: 'l1', after: { type: 'ANNUAL' } }),
      staff,
    );
  });

  it('cannot decide a leave request outside the organisation', async () => {
    const { service, prisma } = makeService();
    prisma.leaveRequest.findFirst.mockResolvedValue(null);
    await expect(service.approveLeave('l1', true, staff)).rejects.toThrow(NotFoundException);
  });

  it('rejects deciding a leave request that is not pending', async () => {
    const { service, prisma } = makeService();
    prisma.leaveRequest.findFirst.mockResolvedValue({ id: 'l1', organizationId: 'org-1', status: 'APPROVED' });
    await expect(service.approveLeave('l1', true, staff)).rejects.toThrow(BadRequestException);
  });

  it('approves a pending leave request and audits the decision', async () => {
    const { service, prisma, audit } = makeService();
    await service.approveLeave('l1', true, staff);
    expect(prisma.leaveRequest.update).toHaveBeenCalledWith({
      where: { id: 'l1' },
      data: { status: 'APPROVED', approvedById: 'u1', approvedAt: expect.any(Date) },
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'hr.approve_leave', resourceId: 'l1' }),
      staff,
    );
  });

  it('lists leave requests scoped to the organisation with optional filters', async () => {
    const { service, prisma } = makeService();
    await service.listLeave({ status: 'PENDING', userId: 'u2' }, staff);
    expect(prisma.leaveRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'org-1', status: 'PENDING', userId: 'u2' } }),
    );
  });
});
