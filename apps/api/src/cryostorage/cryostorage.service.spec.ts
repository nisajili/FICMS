import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CryostorageService } from './cryostorage.service';

type Ctx = { prisma?: any; audit?: any };

const staff = { id: 'u1', organizationId: 'org-1', role: 'embryologist' } as any;
const witness = { id: 'u2', organizationId: 'org-1', role: 'embryologist' } as any;

function makeService(overrides: Ctx = {}) {
  const prisma =
    overrides.prisma ??
    (() => {
      const base = {
        cryoTank: {
          findFirst: jest.fn().mockResolvedValue({ id: 'tank-1', name: 'LN2-1', alarmLowC: -190, alarmHighC: -170 }),
          create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve(data)),
          update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve(data)),
          findMany: jest.fn().mockResolvedValue([]),
        },
        cryoPosition: {
          findFirst: jest.fn().mockResolvedValue({ id: 'pos-1', organizationId: 'org-1', storageItem: null }),
          create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve(data)),
        },
        cryoStorageItem: {
          create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'item-1', ...data })),
          findFirst: jest.fn().mockResolvedValue({ id: 'item-1', organizationId: 'org-1', status: 'STORED' }),
          update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'item-1', ...data })),
          findMany: jest.fn().mockResolvedValue([]),
        },
        patient: { findFirst: jest.fn().mockResolvedValue({ id: 'p1', organizationId: 'org-1' }) },
        user: { findFirst: jest.fn().mockResolvedValue({ id: 'u2', organizationId: 'org-1', status: 'ACTIVE' }) },
        temperatureLog: { create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'log-1', ...data })) },
      };
      return Object.assign(base, { $transaction: jest.fn().mockImplementation((fn: any) => fn(base)) });
    })();
  const audit = overrides.audit ?? { record: jest.fn().mockResolvedValue(undefined) };
  const service = new CryostorageService(prisma, audit);
  return { service, prisma, audit };
}

describe('CryostorageService', () => {
  it('stores an item into a free position and audits it', async () => {
    const { service, prisma, audit } = makeService();
    const result = await service.store(
      { positionId: 'pos-1', patientId: 'p1', type: 'EMBRYO', label: 'Embryo A' },
      staff,
    );
    expect(result.type).toBe('EMBRYO');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'cryo.store_item' }),
      staff,
    );
  });

  it('rejects storing into an occupied position', async () => {
    const { service, prisma } = makeService();
    prisma.cryoPosition.findFirst.mockResolvedValue({ id: 'pos-1', organizationId: 'org-1', storageItem: { id: 'other' } });
    await expect(service.store({ positionId: 'pos-1', patientId: 'p1', type: 'EMBRYO', label: 'X' }, staff)).rejects.toThrow(ConflictException);
  });

  it('releases a stored item with a different witness', async () => {
    const { service, prisma, audit } = makeService();
    prisma.cryoStorageItem.findFirst.mockResolvedValue({ id: 'item-1', organizationId: 'org-1', status: 'STORED' });
    const result = await service.release('item-1', { witnessId: 'u2', reason: 'transfer' }, staff);
    expect(result.status).toBe('RELEASED');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'cryo.release_item', reason: 'transfer' }),
      staff,
    );
  });

  it('cannot release with the same staff member as witness (double-witness)', async () => {
    const { service, prisma } = makeService();
    prisma.cryoStorageItem.findFirst.mockResolvedValue({ id: 'item-1', organizationId: 'org-1', status: 'STORED' });
    // The witness is the acting user themselves.
    prisma.user.findFirst.mockResolvedValue({ id: 'u1', organizationId: 'org-1', status: 'ACTIVE' });
    await expect(service.release('item-1', { witnessId: 'u1', reason: 'transfer' }, staff)).rejects.toThrow(ConflictException);
  });

  it('cannot release an item that is not currently stored', async () => {
    const { service, prisma } = makeService();
    prisma.cryoStorageItem.findFirst.mockResolvedValue({ id: 'item-1', organizationId: 'org-1', status: 'RELEASED' });
    await expect(service.release('item-1', { witnessId: 'u2', reason: 'transfer' }, staff)).rejects.toThrow(ConflictException);
  });

  it('flags an out-of-range temperature as an alarm and updates the tank', async () => {
    const { service, prisma } = makeService();
    const log = await service.logTemperature({ tankId: 'tank-1', tempC: -200, source: 'manual' }, staff);
    expect(log.isAlarm).toBe(true);
    expect(prisma.cryoTank.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'tank-1' }, data: expect.objectContaining({ currentTempC: -200 }) }),
    );
  });

  it('rejects a store for a patient outside the organisation', async () => {
    const { service, prisma } = makeService();
    prisma.patient.findFirst.mockResolvedValue(null);
    await expect(service.store({ positionId: 'pos-1', patientId: 'p1', type: 'EMBRYO', label: 'X' }, staff)).rejects.toThrow(NotFoundException);
  });
});
