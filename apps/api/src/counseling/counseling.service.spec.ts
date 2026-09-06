import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CounselingService } from './counseling.service';

type Ctx = { prisma?: any; audit?: any };

const staff = { id: 'u1', organizationId: 'org-1', role: 'counselor' } as any;

function makeService(overrides: Ctx = {}) {
  const prisma =
    overrides.prisma ??
    (() => {
      const base = {
        patient: { findFirst: jest.fn().mockResolvedValue({ id: 'p1', organizationId: 'org-1' }) },
        counselingSession: {
          create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 's1', ...data })),
          findMany: jest.fn().mockResolvedValue([{ id: 's1' }]),
        },
      };
      return base;
    })();
  const audit = overrides.audit ?? { record: jest.fn().mockResolvedValue(undefined) };
  return { service: new CounselingService(prisma, audit), prisma, audit };
}

describe('CounselingService', () => {
  it('creates a confidential counseling session and audits it without clinical content', async () => {
    const { service, prisma, audit } = makeService();
    const result = await service.create(
      { patientId: 'p1', sessionType: 'IVF_EMOTIONAL_SUPPORT', summary: 'Very sensitive detail' },
      staff,
    );
    expect(result.id).toBe('s1');
    expect(result.confidential).toBe(true);
    expect(result.counselorId).toBe('u1');
    // Confidentiality: the audit record must not leak the clinical summary.
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'counseling.create', resourceId: 's1', after: { sessionType: 'IVF_EMOTIONAL_SUPPORT' } }),
      staff,
    );
    expect(audit.record).not.toHaveBeenCalledWith(expect.objectContaining({ after: expect.objectContaining({ summary: expect.anything() }) }));
  });

  it('honours an explicit confidential flag', async () => {
    const { service, prisma } = makeService();
    const result = await service.create({ patientId: 'p1', sessionType: 'COUNSELING', confidential: false }, staff);
    expect(result.confidential).toBe(false);
  });

  it('rejects creation without an organisation context', async () => {
    const { service } = makeService();
    await expect(service.create({ patientId: 'p1', sessionType: 'COUNSELING' }, { id: 'u1' } as any)).rejects.toThrow(BadRequestException);
  });

  it('rejects creation for a patient outside the organisation', async () => {
    const { service, prisma } = makeService();
    prisma.patient.findFirst.mockResolvedValue(null);
    await expect(service.create({ patientId: 'p1', sessionType: 'COUNSELING' }, staff)).rejects.toThrow(NotFoundException);
  });

  it('lists sessions scoped to the patient and organisation', async () => {
    const { service, prisma } = makeService();
    const result = await service.list('p1', staff);
    expect(result).toHaveLength(1);
    expect(prisma.counselingSession.findMany).toHaveBeenCalledWith({
      where: { patientId: 'p1', organizationId: 'org-1' },
      orderBy: { sessionDate: 'desc' },
    });
  });

  it('does not error when no organisation context is available', async () => {
    const { service, prisma } = makeService();
    prisma.counselingSession.findMany.mockResolvedValue([]);
    await expect(service.list('p1', { id: 'u1' } as any)).resolves.toEqual([]);
    expect(prisma.counselingSession.findMany).toHaveBeenCalledWith({
      where: { patientId: 'p1', organizationId: undefined },
      orderBy: { sessionDate: 'desc' },
    });
  });
});
