import { BadRequestException } from '@nestjs/common';
import { NursingService } from './nursing.service';

type Ctx = { prisma?: any; audit?: any };

const staff = { id: 'u1', organizationId: 'org-1', role: 'nurse' } as any;

function makeService(overrides: Ctx = {}) {
  const prisma =
    overrides.prisma ??
    (() => {
      const base = {
        vitalSign: {
          create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'v1', ...data })),
          findMany: jest.fn().mockResolvedValue([{ id: 'v1' }]),
        },
        nursingNote: {
          create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'n1', ...data })),
        },
      };
      return Object.assign(base, { $transaction: jest.fn().mockImplementation((ops: any[]) => Promise.all(ops)) });
    })();
  const audit = overrides.audit ?? { record: jest.fn().mockResolvedValue(undefined) };
  return { service: new NursingService(prisma, audit), prisma, audit };
}

describe('NursingService', () => {
  it('records vitals within the organisation and audits them', async () => {
    const { service, prisma, audit } = makeService();
    const v = await service.recordVitals({ patientId: 'p1', temperatureC: 36.6, pulseBpm: 72 }, staff);
    expect(v.temperatureC).toBe(36.6);
    expect(prisma.vitalSign.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ organizationId: 'org-1', patientId: 'p1', recordedById: 'u1' }) }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'nursing.vitals' }),
      staff,
    );
  });

  it('requires an organisation context', async () => {
    const { service } = makeService();
    await expect(service.recordVitals({ patientId: 'p1' }, { id: 'u2', organizationId: null } as any)).rejects.toThrow(BadRequestException);
  });

  it('lists vitals scoped to patient and org', async () => {
    const { service, prisma } = makeService();
    await service.listVitals('p1', staff);
    expect(prisma.vitalSign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ patientId: 'p1', organizationId: 'org-1' }) }),
    );
  });

  it('adds a nursing note and audits it', async () => {
    const { service, prisma, audit } = makeService();
    const note = await service.addNote({ patientId: 'p1', administeredMedication: 'Cetrotide', observation: 'Stable' }, staff);
    expect(note.administeredMedication).toBe('Cetrotide');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'nursing.note' }),
      staff,
    );
  });
});
