import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConsentsService } from './consents.service';

type Ctx = { prisma?: any; audit?: any };

const staff = { id: 'u1', organizationId: 'org-1', role: 'fertility_specialist' } as any;
const witness = { id: 'u2', organizationId: 'org-1', role: 'nurse' } as any;

function makeConsent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    organizationId: 'org-1',
    patientId: 'p1',
    title: 'IVF Treatment Consent',
    content: 'I consent to IVF treatment.',
    templateKey: 'ivf_treatment',
    status: 'DRAFT',
    version: 1,
    signedAt: null,
    signedByName: null,
    signedById: null,
    witnessName: null,
    witnessId: null,
    evidenceKey: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeService(overrides: Ctx = {}) {
  const prisma =
    overrides.prisma ??
    (() => {
      const base = {
        patient: {
          findFirst: jest.fn().mockResolvedValue({ id: 'p1', organizationId: 'org-1' }),
        },
        consent: {
          create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve(makeConsent(data))),
          findFirst: jest.fn().mockResolvedValue(makeConsent()),
          findMany: jest.fn().mockResolvedValue([makeConsent()]),
          update: jest.fn().mockImplementation(({ data }: any) =>
            Promise.resolve({ ...makeConsent(), ...data }),
          ),
          delete: jest.fn().mockResolvedValue({}),
        },
      };
      return Object.assign(base, {
        $transaction: jest.fn().mockImplementation((fn: any) => fn(base)),
      });
    })();
  const audit = overrides.audit ?? { record: jest.fn().mockResolvedValue(undefined) };
  const service = new ConsentsService(prisma, audit);
  return { service, prisma, audit };
}

const baseDto = {
  patientId: 'p1',
  title: 'IVF Treatment Consent',
  content: 'I consent to IVF treatment.',
};

describe('ConsentsService', () => {
  it('creates a draft consent and audits it', async () => {
    const { service, audit } = makeService();
    const result = await service.create(baseDto, staff);
    expect(result.status).toBe('DRAFT');
    expect(result.version).toBe(1);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'consent.create', resourceType: 'consent' }),
      staff,
    );
  });

  it('rejects a consent for a patient outside the organisation', async () => {
    const { service, prisma } = makeService();
    prisma.patient.findFirst.mockResolvedValue(null);
    await expect(service.create(baseDto, staff)).rejects.toThrow(NotFoundException);
  });

  it('requires an organisation context', async () => {
    const { service } = makeService();
    await expect(service.create(baseDto, { id: 'u3', organizationId: null } as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('signs a draft consent and records signer + witness', async () => {
    const { service, prisma, audit } = makeService();
    prisma.consent.findFirst.mockResolvedValue(makeConsent());
    const result = await service.sign(
      'c1',
      { signedByName: 'Jane Doe', witnessName: 'Nurse Kim', witnessId: 'u2' },
      staff,
    );
    expect(result.status).toBe('SIGNED');
    expect(result.signedById).toBe('u1');
    expect(result.signedByName).toBe('Jane Doe');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'consent.sign', resourceId: 'c1' }),
      staff,
    );
  });

  it('rejects signing an already-signed consent', async () => {
    const { service, prisma } = makeService();
    prisma.consent.findFirst.mockResolvedValue(makeConsent({ status: 'SIGNED' }));
    await expect(
      service.sign('c1', { signedByName: 'Jane Doe' }, staff),
    ).rejects.toThrow(ConflictException);
  });

  it('witnesses a signed consent', async () => {
    const { service, prisma } = makeService();
    prisma.consent.findFirst.mockResolvedValue(
      makeConsent({ status: 'SIGNED', signedById: 'u1' }),
    );
    const result = await service.witness('c1', { witnessName: 'Nurse Kim' }, witness);
    expect(result.status).toBe('WITNESSED');
    expect(result.witnessId).toBe('u2');
  });

  it('does not allow the signer to be their own witness (double-witness invariant)', async () => {
    const { service, prisma } = makeService();
    prisma.consent.findFirst.mockResolvedValue(
      makeConsent({ status: 'SIGNED', signedById: 'u1' }),
    );
    await expect(service.witness('c1', { witnessName: 'Staff User' }, staff)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('only witnesses a signed consent', async () => {
    const { service, prisma } = makeService();
    prisma.consent.findFirst.mockResolvedValue(makeConsent({ status: 'DRAFT' }));
    await expect(service.witness('c1', { witnessName: 'Nurse Kim' }, witness)).rejects.toThrow(
      ConflictException,
    );
  });

  it('revokes a signed/witnessed consent', async () => {
    const { service, prisma, audit } = makeService();
    prisma.consent.findFirst.mockResolvedValue(makeConsent({ status: 'WITNESSED' }));
    const result = await service.revoke('c1', { reason: 'Patient withdrew' }, staff);
    expect(result.status).toBe('REVOKED');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'consent.revoke', reason: 'Patient withdrew' }),
      staff,
    );
  });

  it('creates a new version without mutating the source consent', async () => {
    const { service, prisma, audit } = makeService();
    prisma.consent.findFirst.mockResolvedValue(makeConsent({ status: 'SIGNED', version: 2 }));
    const result = await service.createVersion('c1', staff);
    expect(result.status).toBe('DRAFT');
    expect(result.version).toBe(3);
    // Source is never mutated via update; only a new create happens.
    expect(prisma.consent.update).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'consent.version', resourceId: result.id }),
      staff,
    );
  });

  it('does not edit a signed consent in place', async () => {
    const { service, prisma } = makeService();
    prisma.consent.findFirst.mockResolvedValue(makeConsent({ status: 'SIGNED' }));
    await expect(service.update('c1', { title: 'Changed' }, staff)).rejects.toThrow(
      ConflictException,
    );
  });

  it('deletes only a draft', async () => {
    const { service, prisma } = makeService();
    prisma.consent.findFirst.mockResolvedValue(makeConsent({ status: 'DRAFT' }));
    await expect(service.delete('c1', staff)).resolves.toEqual({ deleted: true });
  });

  it('does not delete a signed consent', async () => {
    const { service, prisma } = makeService();
    prisma.consent.findFirst.mockResolvedValue(makeConsent({ status: 'SIGNED' }));
    await expect(service.delete('c1', staff)).rejects.toThrow(ConflictException);
  });
});
