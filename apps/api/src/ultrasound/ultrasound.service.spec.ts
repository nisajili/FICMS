import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UltrasoundService } from './ultrasound.service';

type Ctx = { prisma?: any; audit?: any };

const staff = { id: 'u1', organizationId: 'org-1', role: 'sonographer' } as any;

function makeService(overrides: Ctx = {}) {
  const prisma =
    overrides.prisma ??
    (() => {
      const base = {
        patient: { findFirst: jest.fn().mockResolvedValue({ id: 'p1', organizationId: 'org-1' }) },
        ultrasoundScan: {
          create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 's1', ...data })),
          findFirst: jest.fn().mockResolvedValue({ id: 's1', organizationId: 'org-1' }),
          findMany: jest.fn().mockResolvedValue([{ id: 's1' }]),
          update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 's1', ...data })),
        },
      };
      return Object.assign(base, { $transaction: jest.fn().mockImplementation((ops: any[]) => Promise.all(ops)) });
    })();
  const audit = overrides.audit ?? { record: jest.fn().mockResolvedValue(undefined) };
  return { service: new UltrasoundService(prisma, audit), prisma, audit };
}

describe('UltrasoundService', () => {
  it('creates a scan for an in-org patient and audits it', async () => {
    const { service, prisma, audit } = makeService();
    const scan = await service.create(
      { patientId: 'p1', type: 'follicular_monitoring', endometrialThicknessMm: 8.5 },
      staff,
    );
    expect(scan.type).toBe('follicular_monitoring');
    expect(prisma.ultrasoundScan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: 'org-1', patientId: 'p1', endometrialThicknessMm: 8.5 }),
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ultrasound.create' }),
      staff,
    );
  });

  it('rejects a scan for a patient outside the organisation', async () => {
    const { service, prisma } = makeService();
    prisma.patient.findFirst.mockResolvedValue(null);
    await expect(service.create({ patientId: 'p1', type: 'pelvic' }, staff)).rejects.toThrow(NotFoundException);
  });

  it('lists scans scoped to the patient and org', async () => {
    const { service, prisma } = makeService();
    await service.listForPatient('p1', staff);
    expect(prisma.ultrasoundScan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ patientId: 'p1', organizationId: 'org-1' }) }),
    );
  });

  it('verifies a scan and records the verifying user', async () => {
    const { service, prisma, audit } = makeService();
    const result = await service.verify('s1', staff);
    expect(prisma.ultrasoundScan.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 's1' }, data: expect.objectContaining({ verifiedById: 'u1' }) }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ultrasound.verify', resourceId: 's1' }),
      staff,
    );
  });

  it('cannot verify a scan from another organisation', async () => {
    const { service, prisma } = makeService();
    prisma.ultrasoundScan.findFirst.mockResolvedValue(null);
    await expect(service.verify('s1', staff)).rejects.toThrow(NotFoundException);
  });
});
