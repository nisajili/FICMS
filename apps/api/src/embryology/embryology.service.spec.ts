import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EmbryologyService } from './embryology.service';

type Ctx = { prisma?: any; audit?: any };

const staff = { id: 'u1', organizationId: 'org-1', role: 'embryologist' } as any;
const witness = { id: 'u2', organizationId: 'org-1', role: 'embryologist' } as any;

function makeService(overrides: Ctx = {}) {
  const prisma =
    overrides.prisma ??
    (() => {
      const base = {
        cycle: { findFirst: jest.fn().mockResolvedValue({ id: 'c1', organizationId: 'org-1' }) },
        patient: { findFirst: jest.fn().mockResolvedValue({ id: 'p1', organizationId: 'org-1' }) },
        embryo: {
          create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'e1', ...data })),
          findFirst: jest.fn().mockResolvedValue({ id: 'e1', organizationId: 'org-1', status: 'CULTURING' }),
          findMany: jest.fn().mockResolvedValue([{ id: 'e1' }]),
          count: jest.fn().mockResolvedValue(1),
          update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'e1', ...data })),
        },
        embryoObservation: {
          create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'o1', ...data })),
        },
        user: { findFirst: jest.fn().mockResolvedValue({ id: 'u2', organizationId: 'org-1', status: 'ACTIVE', name: 'Nurse Kim' }) },
      };
      // `list` uses the array form of $transaction: [findMany, count].
      return Object.assign(base, {
        $transaction: jest.fn().mockImplementation((ops: any[]) =>
          Promise.all(ops),
        ),
      });
    })();
  const audit = overrides.audit ?? { record: jest.fn().mockResolvedValue(undefined) };
  return { service: new EmbryologyService(prisma, audit), prisma, audit };
}

describe('EmbryologyService', () => {
  it('creates an embryo within the organisation and audits it', async () => {
    const { service, prisma, audit } = makeService();
    const result = await service.create(
      { cycleId: 'c1', patientId: 'p1', label: '2PN' },
      staff,
    );
    expect(result.status).toBe('OOCYTE');
    expect(prisma.embryo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: 'org-1', cycleId: 'c1', patientId: 'p1', label: '2PN' }),
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'embryology.create' }),
      staff,
    );
  });

  it('rejects a create for an external patient (org mismatch)', async () => {
    const { service, prisma } = makeService();
    prisma.patient.findFirst.mockResolvedValue(null);
    await expect(service.create({ cycleId: 'c1', patientId: 'p1', label: '2PN' }, staff)).rejects.toThrow(NotFoundException);
  });

  it('double-witness verifies a transfer with a different witness', async () => {
    const { service, prisma, audit } = makeService();
    prisma.embryo.findFirst.mockResolvedValue({ id: 'e1', organizationId: 'org-1', status: 'CULTURING' });
    const result = await service.verifyWithWitness('e1', { witnessId: 'u2', note: 'confirmed' }, 'transfer', staff);
    expect(result.witness.id).toBe('u2');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'embryology.transfer.double_witness', reason: 'confirmed' }),
      staff,
    );
  });

  it('cannot be double-witnessed by the acting user (no self-witness)', async () => {
    const { service } = makeService();
    await expect(service.verifyWithWitness('e1', { witnessId: 'u1' }, 'freeze', staff)).rejects.toThrow(ConflictException);
  });

  it('rejects a witness outside the organisation / not active', async () => {
    const { service, prisma } = makeService();
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.verifyWithWitness('e1', { witnessId: 'u2' }, 'freeze', staff)).rejects.toThrow(NotFoundException);
  });

  it('lists embryos filtered by patient', async () => {
    const { service, prisma } = makeService();
    const res = await service.list({ patientId: 'p1' }, staff);
    expect(res.data).toEqual([{ id: 'e1' }]);
    expect(prisma.embryo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: 'org-1', patientId: 'p1' }) }),
    );
  });

  it('records a day observation and updates the embryo', async () => {
    const { service, prisma, audit } = makeService();
    const obs = await service.addObservation('e1', { day: 3, grade: 'AA' }, staff);
    expect(obs.day).toBe(3);
    expect(prisma.embryo.update).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'embryology.observe' }),
      staff,
    );
  });
});
