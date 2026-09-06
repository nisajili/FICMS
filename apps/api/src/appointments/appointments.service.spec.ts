import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentStatusDto } from './dto/appointment.dto';

type Ctx = { prisma?: any; audit?: any; records?: any };

const staff = { id: 'u1', organizationId: 'org-1', role: 'receptionist', facilityId: 'f1' } as any;

function makeService(overrides: Ctx = {}) {
  const prisma =
    overrides.prisma ??
    (() => {
      const base = {
        patient: { findFirst: jest.fn().mockResolvedValue({ id: 'p1', organizationId: 'org-1' }) },
        appointment: {
          create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'a1', ...data })),
          findFirst: jest.fn().mockResolvedValue({ id: 'a1', organizationId: 'org-1', status: 'SCHEDULED', version: 1, scheduledStart: new Date(), scheduledEnd: new Date() }),
          findMany: jest.fn().mockResolvedValue([{ id: 'a1' }]),
          count: jest.fn().mockResolvedValue(1),
          update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'a1', status: data.status, ...data })),
        },
      };
      return Object.assign(base, { $transaction: jest.fn().mockImplementation((ops: any[]) => Promise.all(ops)) });
    })();
  const audit = overrides.audit ?? { record: jest.fn().mockResolvedValue(undefined) };
  const records = overrides.records ?? { next: jest.fn().mockResolvedValue('APT-2026-00001') };
  return { service: new AppointmentsService(prisma, audit, records), prisma, audit, records };
}

describe('AppointmentsService', () => {
  it('creates an appointment with a generated code and audits it', async () => {
    const { service, prisma, audit, records } = makeService();
    const result = await service.create(
      {
        patientId: 'p1',
        scheduledStart: '2026-09-10T09:00:00Z',
        scheduledEnd: '2026-09-10T09:30:00Z',
        serviceType: 'consultation',
      },
      staff,
    );
    expect(result.code).toBe('APT-2026-00001');
    expect(result.status).toBe('SCHEDULED');
    expect(records.next).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'appointment.create', resourceId: 'a1' }),
      staff,
    );
  });

  it('rejects an appointment whose end is before its start', async () => {
    const { service } = makeService();
    await expect(
      service.create({ patientId: 'p1', scheduledStart: '2026-09-10T10:00:00Z', scheduledEnd: '2026-09-10T09:00:00Z' }, staff),
    ).rejects.toThrow(BadRequestException);
  });

  it('transitions a scheduled appointment to checked-in with a matching version', async () => {
    const { service, prisma, audit } = makeService();
    const result = await service.transition('a1', { status: AppointmentStatusDto.CHECKED_IN, version: 1 }, staff);
    expect(result.status).toBe('CHECKED_IN');
    expect(prisma.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'CHECKED_IN' }) }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'appointment.status_change', resourceId: 'a1' }),
      staff,
    );
  });

  it('rejects a transition with a stale version (optimistic concurrency)', async () => {
    const { service, prisma } = makeService();
    // The stored appointment is at version 2; the caller sends version 1.
    prisma.appointment.findFirst.mockResolvedValue({ id: 'a1', organizationId: 'org-1', status: 'SCHEDULED', version: 2 });
    await expect(service.transition('a1', { status: AppointmentStatusDto.CHECKED_IN, version: 1 }, staff)).rejects.toThrow(ConflictException);
  });

  it('rejects an invalid status transition', async () => {
    const { service, prisma } = makeService();
    // CANCELLED → CHECKED_IN is not a valid transition.
    prisma.appointment.findFirst.mockResolvedValue({ id: 'a1', organizationId: 'org-1', status: 'CANCELLED', version: 1 });
    await expect(service.transition('a1', { status: AppointmentStatusDto.CHECKED_IN, version: 1 }, staff)).rejects.toThrow(Error);
  });

  it('rejects a transition for an appointment outside the org', async () => {
    const { service, prisma } = makeService();
    prisma.appointment.findFirst.mockResolvedValue(null);
    await expect(service.transition('a1', { status: AppointmentStatusDto.CHECKED_IN, version: 1 }, staff)).rejects.toThrow(NotFoundException);
  });
});
