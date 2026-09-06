import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CyclesService } from './cycles.service';
import { CycleStatusDto, TreatmentTypeDto } from './dto/cycle.dto';

type Ctx = { prisma?: any; audit?: any; records?: any };

const staff = { id: 'u1', organizationId: 'org-1', role: 'clinician', facilityId: 'f1' } as any;

function makeService(overrides: Ctx = {}) {
  const prisma =
    overrides.prisma ??
    (() => {
      const base = {
        patient: { findFirst: jest.fn().mockResolvedValue({ id: 'p1', organizationId: 'org-1' }) },
        cycle: {
          create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'c1', ...data })),
          findFirst: jest.fn().mockResolvedValue({ id: 'c1', organizationId: 'org-1', status: 'PLANNED', version: 1 }),
          findMany: jest.fn().mockResolvedValue([{ id: 'c1' }]),
          count: jest.fn().mockResolvedValue(1),
          update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'c1', status: data.status, ...data })),
        },
        cycleEvent: { create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'e1', ...data })) },
        cycleMedication: { create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'm1', ...data })) },
      };
      return Object.assign(base, { $transaction: jest.fn().mockImplementation((ops: any[]) => Promise.all(ops)) });
    })();
  const audit = overrides.audit ?? { record: jest.fn().mockResolvedValue(undefined) };
  const records = overrides.records ?? { next: jest.fn().mockResolvedValue('CY-2026-00001') };
  return { service: new CyclesService(prisma, audit, records), prisma, audit, records };
}

describe('CyclesService', () => {
  it('creates a cycle with a generated cycle number and audits it', async () => {
    const { service, prisma, audit, records } = makeService();
    const result = await service.create(
      { patientId: 'p1', treatmentType: TreatmentTypeDto.IVF, protocolTemplate: 'long-lupron' },
      staff,
    );
    expect(result.cycleNumber).toBe('CY-2026-00001');
    expect(result.status).toBe('PLANNED');
    expect(result.organizationId).toBe('org-1');
    expect(prisma.patient.findFirst).toHaveBeenCalledWith({ where: { id: 'p1', organizationId: 'org-1' } });
    expect(records.next).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'cycle.create', resourceId: 'c1' }),
      staff,
    );
  });

  it('rejects creation without an organisation context', async () => {
    const { service } = makeService();
    await expect(service.create({ patientId: 'p1', treatmentType: TreatmentTypeDto.IVF }, { id: 'u1' } as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects creation for a patient outside the organisation', async () => {
    const { service, prisma } = makeService();
    prisma.patient.findFirst.mockResolvedValue(null);
    await expect(service.create({ patientId: 'p1', treatmentType: TreatmentTypeDto.IVF }, staff)).rejects.toThrow(NotFoundException);
  });

  it('transitions a planned cycle to baseline assessment with a matching version', async () => {
    const { service, prisma, audit } = makeService();
    const result = await service.transition('c1', { status: CycleStatusDto.BASELINE_ASSESSMENT, version: 1 }, staff);
    expect(result.status).toBe(CycleStatusDto.BASELINE_ASSESSMENT);
    expect(prisma.cycle.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: CycleStatusDto.BASELINE_ASSESSMENT, version: { increment: 1 } }) }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'cycle.status_change', resourceId: 'c1' }),
      staff,
    );
  });

  it('rejects a transition with a stale version (optimistic concurrency)', async () => {
    const { service, prisma } = makeService();
    prisma.cycle.findFirst.mockResolvedValue({ id: 'c1', organizationId: 'org-1', status: 'PLANNED', version: 2 });
    await expect(service.transition('c1', { status: CycleStatusDto.BASELINE_ASSESSMENT, version: 1 }, staff)).rejects.toThrow(ConflictException);
  });

  it('rejects a transition that is not a valid state machine move', async () => {
    const { service, prisma } = makeService();
    // PLANNED cannot jump straight to RETRIEVAL.
    prisma.cycle.findFirst.mockResolvedValue({ id: 'c1', organizationId: 'org-1', status: 'PLANNED', version: 1 });
    await expect(service.transition('c1', { status: CycleStatusDto.RETRIEVAL, version: 1 }, staff)).rejects.toThrow(Error);
  });

  it('rejects a transition for a cycle outside the organisation', async () => {
    const { service, prisma } = makeService();
    prisma.cycle.findFirst.mockResolvedValue(null);
    await expect(service.transition('c1', { status: CycleStatusDto.BASELINE_ASSESSMENT, version: 1 }, staff)).rejects.toThrow(NotFoundException);
  });

  it('adds an event to a cycle and audits it', async () => {
    const { service, prisma, audit } = makeService();
    const event = await service.addEvent('c1', { eventType: 'SCAN', title: 'Follicle scan', scheduledAt: '2026-09-10T09:00:00Z' }, staff);
    expect(event.cycleId).toBe('c1');
    expect(event.organizationId).toBe('org-1');
    expect(event.createdBy).toBe('u1');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'cycle.add_event', resourceId: 'c1' }),
      staff,
    );
  });
});
