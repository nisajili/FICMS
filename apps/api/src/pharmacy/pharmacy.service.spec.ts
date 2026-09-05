import { ConflictException, NotFoundException } from '@nestjs/common';
import { PharmacyService } from './pharmacy.service';

function makeService(overrides: { prisma?: any; audit?: any } = {}) {
  const prisma = overrides.prisma ?? {
    prescription: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ ...data })),
      create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'rx1', ...data })),
    },
    patient: { findFirst: jest.fn().mockResolvedValue({ id: 'p1' }) },
    inventoryItem: { findFirst: jest.fn().mockResolvedValue(null), findUnique: jest.fn().mockResolvedValue(null) },
    prescriptionItem: { update: jest.fn().mockResolvedValue({}) },
    stockMovement: { create: jest.fn().mockResolvedValue({}) },
    dispensation: { create: jest.fn().mockResolvedValue({ id: 'd1' }) },
    $transaction: jest.fn().mockImplementation(async (fn: any) => fn(prisma as any)),
  };
  const audit = overrides.audit ?? { record: jest.fn().mockResolvedValue(undefined) };
  const service = new PharmacyService(prisma, audit);
  return { service, prisma, audit };
}

const pharmacist = { id: 'u1', organizationId: 'org-1', role: 'pharmacist' } as any;

describe('PharmacyService', () => {
  it('lists prescriptions tenant-scoped with filters', async () => {
    const { service, prisma } = makeService();
    prisma.prescription.findMany.mockResolvedValue([{ id: 'rx1', status: 'VERIFIED' }]);
    prisma.prescription.count.mockResolvedValue(1);

    const result = await service.listPrescriptions({ status: 'VERIFIED', patientId: 'p1' }, pharmacist);

    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    const call = prisma.prescription.findMany.mock.calls[0][0];
    expect(call.where.organizationId).toBe('org-1');
    expect(call.where.status).toBe('VERIFIED');
    expect(call.where.patientId).toBe('p1');
  });

  it('returns an empty page when there is no org context', async () => {
    const { service } = makeService();
    const result = await service.listPrescriptions({}, { id: 'u2', organizationId: null } as any);
    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(0);
  });

  it('blocks dispensing beyond the remaining prescribed quantity', async () => {
    const { service, prisma } = makeService();
    prisma.prescription.findFirst.mockResolvedValue({
      id: 'rx1',
      organizationId: 'org-1',
      status: 'VERIFIED',
      items: [{ id: 'item1', quantity: 5, issuedQuantity: 4 }],
    });

    await expect(
      service.dispense('rx1', { prescriptionItemId: 'item1', quantity: 5 }, pharmacist),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects dispensing a prescription that is not verified', async () => {
    const { service, prisma } = makeService();
    prisma.prescription.findFirst.mockResolvedValue({
      id: 'rx1',
      organizationId: 'org-1',
      status: 'PRESCRIBED',
      items: [{ id: 'item1', quantity: 5, issuedQuantity: 0 }],
    });

    await expect(
      service.dispense('rx1', { prescriptionItemId: 'item1', quantity: 1 }, pharmacist),
    ).rejects.toThrow(ConflictException);
  });

  it('throws NotFound for an unknown prescription item', async () => {
    const { service, prisma } = makeService();
    prisma.prescription.findFirst.mockResolvedValue({
      id: 'rx1',
      organizationId: 'org-1',
      status: 'VERIFIED',
      items: [{ id: 'other', quantity: 5, issuedQuantity: 0 }],
    });

    await expect(
      service.dispense('rx1', { prescriptionItemId: 'missing', quantity: 1 }, pharmacist),
    ).rejects.toThrow(NotFoundException);
  });
});
