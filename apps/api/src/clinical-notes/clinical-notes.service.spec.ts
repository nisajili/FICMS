import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ClinicalNotesService } from './clinical-notes.service';

function makeService(overrides: { prisma?: any; audit?: any } = {}) {
  const prisma = overrides.prisma ?? {
    patient: { findFirst: jest.fn().mockResolvedValue({ id: 'p1', organizationId: 'org-1' }) },
    clinicalNote: {
      create: jest.fn().mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'note-' + Math.random().toString(36).slice(2), ...data }),
      ),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'note-1', ...data })),
    },
    $transaction: jest.fn().mockImplementation(async (fn: any) => fn(prisma as any)),
  };
  const audit = overrides.audit ?? { record: jest.fn().mockResolvedValue(undefined) };
  const service = new ClinicalNotesService(prisma, audit);
  return { service, prisma, audit };
}

const doctor = { id: 'u1', organizationId: 'org-1', role: 'fertility_specialist' } as any;

describe('ClinicalNotesService', () => {
  it('creates an unsigned note and audits it', async () => {
    const { service, prisma, audit } = makeService();
    const note = await service.create({ patientId: 'p1', body: 'Initial consult findings.' }, doctor);

    expect(note.body).toBe('Initial consult findings.');
    expect(note.signed).toBe(false);
    expect(note.version).toBe(1);
    expect(note.organizationId).toBe('org-1');
    expect(prisma.clinicalNote.create).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'clinical_note.create', resourceType: 'clinical_note' }),
      doctor,
    );
  });

  it('requires an organisation context', async () => {
    const { service } = makeService();
    await expect(
      service.create({ patientId: 'p1', body: 'x' }, { id: 'u2', organizationId: null } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a patient outside the organisation', async () => {
    const { service, prisma } = makeService();
    prisma.patient.findFirst.mockResolvedValue(null);
    await expect(service.create({ patientId: 'p-other', body: 'x' }, doctor)).rejects.toThrow(NotFoundException);
  });

  it('signs a note and audits it', async () => {
    const { service, prisma, audit } = makeService();
    prisma.clinicalNote.findFirst.mockResolvedValue({ id: 'n1', signed: false });
    prisma.clinicalNote.update.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'n1', signed: true, ...data, signedAt: data.signedAt }),
    );

    const result = await service.sign('n1', doctor);
    expect(result.signed).toBe(true);
    expect(result.signedById).toBe(doctor.id);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'clinical_note.sign' }),
      doctor,
    );
  });

  it('rejects signing an already-signed note', async () => {
    const { service, prisma } = makeService();
    prisma.clinicalNote.findFirst.mockResolvedValue({ id: 'n1', signed: true });
    await expect(service.sign('n1', doctor)).rejects.toThrow(ConflictException);
  });

  it('edits an unsigned note in place', async () => {
    const { service, prisma, audit } = makeService();
    prisma.clinicalNote.findFirst.mockResolvedValue({ id: 'n1', signed: false });
    prisma.clinicalNote.update.mockImplementation(({ data }: any) => Promise.resolve({ id: 'n1', body: data.body, signed: false }));

    const result = await service.correct('n1', { body: 'Amended while draft.' }, doctor);
    expect(result.body).toBe('Amended while draft.');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'clinical_note.correct_unsigned' }),
      doctor,
    );
  });

  it('never overwrites a SIGNED note: creates a new revision and couples via previousId/supersededById', async () => {
    const { service, prisma, audit } = makeService();
    prisma.clinicalNote.findFirst.mockResolvedValue({
      id: 'n-signed',
      organizationId: 'org-1',
      patientId: 'p1',
      encounterId: null,
      authorId: 'author-1',
      category: 'clinical',
      body: 'ORIGINAL SIGNED CONTENT',
      signed: true,
      version: 1,
    });
    prisma.clinicalNote.create.mockResolvedValue({
      id: 'n-rev',
      organizationId: 'org-1',
      patientId: 'p1',
      authorId: doctor.id,
      category: 'clinical',
      body: 'Corrected content',
      signed: false,
      previousId: 'n-signed',
      version: 2,
    });
    prisma.clinicalNote.update.mockResolvedValue({ id: 'n-signed', supersededById: 'n-rev' });

    const revision = await service.correct('n-signed', { body: 'Corrected content', reason: 'Typo' }, doctor);

    expect(revision.id).toBe('n-rev');
    expect(revision.version).toBe(2);
    expect(revision.previousId).toBe('n-signed');
    expect(revision.signed).toBe(false);

    // The transaction must update the signed note's superseded pointer, not its body.
    const txUpdateCall = prisma.$transaction.mock.calls[0][0].toString();
    expect(txUpdateCall).toContain('supersededById');
    // The original signed body was never passed to an update of the signed note.
    const signedUpdateArgs = prisma.clinicalNote.update.mock.calls.filter(
      (c: any) => c[0].where && c[0].where.id === 'n-signed',
    );
    expect(signedUpdateArgs).toHaveLength(1);
    expect(signedUpdateArgs[0][0].data).not.toHaveProperty('body');

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'clinical_note.correct_signed_revision', resourceId: 'n-rev' }),
      doctor,
    );
  });
});
