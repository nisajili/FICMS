import { BadRequestException } from '@nestjs/common';
import { LabService } from './lab.service';

function makeService(overrides: { prisma?: any; audit?: any; records?: any } = {}) {
  const prisma = overrides.prisma ?? {
    labOrder: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'lo1', ...data })),
    },
    labTestCatalog: { create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 't1', ...data })) },
    labResult: { count: jest.fn().mockResolvedValue(0) },
    $transaction: jest.fn().mockImplementation(async (q: any) => {
      const [f, c] = q;
      return [await f, await c];
    }),
  };
  const audit = overrides.audit ?? { record: jest.fn().mockResolvedValue(undefined) };
  const records = overrides.records ?? { next: jest.fn().mockResolvedValue('LAB-1') };
  const service = new LabService(prisma, audit, records);
  return { service, prisma, audit };
}

const scientist = { id: 'u1', organizationId: 'org-1', role: 'lab_scientist' } as any;

describe('LabService listOrders', () => {
  it('scopes to the organisation and applies patientId filter', async () => {
    const { service, prisma } = makeService();
    prisma.labOrder.findMany.mockResolvedValue([{ id: 'lo1', patientId: 'p1' }]);
    prisma.labOrder.count.mockResolvedValue(1);

    const result = await service.listOrders({ patientId: 'p1' }, scientist);

    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    const call = prisma.labOrder.findMany.mock.calls[0][0];
    expect(call.where.organizationId).toBe('org-1');
    expect(call.where.patientId).toBe('p1');
  });

  it('returns an empty page when there is no org context', async () => {
    const { service } = makeService();
    const result = await service.listOrders({}, { id: 'u2', organizationId: null } as any);
    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(0);
  });

  it('requires org context to create a test', async () => {
    const { service } = makeService();
    await expect(
      service.createTest({ name: 'FSH' } as any, { id: 'u2', organizationId: null } as any),
    ).rejects.toThrow(BadRequestException);
  });
});
