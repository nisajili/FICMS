import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';

type Ctx = { prisma?: any; audit?: any };

const staff = { id: 'u1', organizationId: 'org-1', role: 'inventory_officer' } as any;

function makeService(overrides: Ctx = {}) {
  const prisma =
    overrides.prisma ??
    (() => {
      const base = {
        inventoryItem: {
          findFirst: jest.fn().mockResolvedValue({ id: 'i1', organizationId: 'org-1', quantityOnHand: 10, minimumStock: 2 }),
          create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'i1', ...data })),
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0),
          update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'i1', ...data })),
        },
        stockMovement: { create: jest.fn().mockResolvedValue({ id: 'm1' }) },
      };
      return Object.assign(base, {
        $transaction: jest.fn().mockImplementation((fn: any) => fn(base)),
      });
    })();
  const audit = overrides.audit ?? { record: jest.fn().mockResolvedValue(undefined) };
  return { service: new InventoryService(prisma, audit), prisma, audit };
}

describe('InventoryService', () => {
  it('issues stock (movement + audit + decrement + non-negative)', async () => {
    const { service, prisma, audit } = makeService();
    const updated = await service.adjust('i1', { type: 'issue', quantity: 4, reason: 'dispensed' }, staff);
    expect(updated.quantityOnHand).toBe(6);
    expect(prisma.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ inventoryItemId: 'i1', type: 'issue', quantity: 4, performedById: 'u1' }),
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'inventory.issue', resourceId: 'i1' }),
      staff,
    );
  });

  it('rejects an issue that would drive stock negative', async () => {
    const { service } = makeService();
    await expect(service.adjust('i1', { type: 'issue', quantity: 11 }, staff)).rejects.toThrow(BadRequestException);
  });

  it('restocks positive inventory and records an inbound movement', async () => {
    const { service, prisma } = makeService();
    const updated = await service.adjust('i1', { type: 'receipt', quantity: 5 }, staff);
    expect(updated.quantityOnHand).toBe(15);
    expect(prisma.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'receipt', quantity: 5 }) }),
    );
  });

  it('rejects adjustment for an item outside the organisation', async () => {
    const { service, prisma } = makeService();
    prisma.inventoryItem.findFirst.mockResolvedValue(null);
    await expect(service.adjust('i1', { type: 'receipt', quantity: 1 }, staff)).rejects.toThrow(NotFoundException);
  });
});
