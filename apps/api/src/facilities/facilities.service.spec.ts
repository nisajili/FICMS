import { BadRequestException } from '@nestjs/common';
import { FacilitiesService } from './facilities.service';

type Ctx = { prisma?: any; audit?: any; records?: any };

const staff = { id: 'u1', organizationId: 'org-1', role: 'admin' } as any;

function makeService(overrides: Ctx = {}) {
  const prisma =
    overrides.prisma ??
    (() => {
      const base = {
        facility: {
          create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'f1', ...data })),
          findMany: jest.fn().mockResolvedValue([{ id: 'f1' }]),
        },
        department: {
          create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'dep1', ...data })),
          findMany: jest.fn().mockResolvedValue([{ id: 'dep1' }]),
        },
      };
      return base;
    })();
  const audit = overrides.audit ?? { record: jest.fn().mockResolvedValue(undefined) };
  const records = overrides.records ?? { next: jest.fn().mockResolvedValue('FAC-00001') };
  return { service: new FacilitiesService(prisma, audit, records), prisma, audit };
}

describe('FacilitiesService', () => {
  it('creates a facility and derives a default code from its name', async () => {
    const { service, prisma, audit } = makeService();
    const result = await service.create({ name: 'Nairobi Fertility Centre' }, staff);
    expect(result.code).toBe('NAIR');
    expect(result.status).toBe('ACTIVE');
    expect(result.organizationId).toBe('org-1');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'facility.create', resourceId: 'f1', after: { name: 'Nairobi Fertility Centre' } }),
      staff,
    );
  });

  it('uses an explicit facility code when provided', async () => {
    const { service, prisma } = makeService();
    await service.create({ name: 'Main Clinic', code: 'MAIN' }, staff);
    expect(prisma.facility.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ code: 'MAIN' }) }),
    );
  });

  it('rejects creation without an organisation context', async () => {
    const { service } = makeService();
    await expect(service.create({ name: 'Clinic' }, { id: 'u1' } as any)).rejects.toThrow(BadRequestException);
  });

  it('creates a department scoped to the organisation', async () => {
    const { service, audit } = makeService();
    const result = await service.createDepartment({ name: 'Laboratory' }, staff);
    expect(result.organizationId).toBe('org-1');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'facility.create_department', resourceId: 'dep1' }),
      staff,
    );
  });

  it('lists facilities scoped to the organisation', async () => {
    const { service, prisma } = makeService();
    await service.list(staff);
    expect(prisma.facility.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'org-1' } }),
    );
  });

  it('lists departments scoped to the organisation', async () => {
    const { service, prisma } = makeService();
    await service.listDepartments(staff);
    expect(prisma.department.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'org-1' } }),
    );
  });
});
