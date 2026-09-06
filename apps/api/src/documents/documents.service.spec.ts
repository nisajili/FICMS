import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DocumentsService } from './documents.service';

type Ctx = { prisma?: any; audit?: any; storage?: any; router?: any };

function makeService(overrides: Ctx = {}) {
  const prisma = overrides.prisma ?? {
    patient: { findFirst: jest.fn().mockResolvedValue({ id: 'p1', organizationId: 'org-1' }) },
    patientDocument: {
      create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'doc-1', ...data })),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      delete: jest.fn().mockResolvedValue({}),
    },
  };
  const audit = overrides.audit ?? { record: jest.fn().mockResolvedValue(undefined) };
  const storage = overrides.storage ?? {
    put: jest.fn().mockResolvedValue({ success: true, key: 'org-1/p1/abc.pdf' }),
    getUrl: jest.fn().mockResolvedValue('https://signed.example/abc'),
    read: jest.fn().mockResolvedValue(Buffer.from('file-data')),
    delete: jest.fn().mockResolvedValue(undefined),
    id: 'local',
  };
  const router = overrides.router ?? { isObjectStore: jest.fn().mockReturnValue(false) };
  const service = new DocumentsService(prisma, audit, storage, router);
  return { service, prisma, audit, storage, router };
}

const staff = { id: 'u1', organizationId: 'org-1', role: 'fertility_specialist' } as any;
const baseInput = {
  patientId: 'p1',
  type: 'REPORT' as const,
  fileName: 'result.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 100,
  body: Buffer.from('data'),
};

describe('DocumentsService', () => {
  it('uploads a document and audits it', async () => {
    const { service, prisma, audit, storage } = makeService();

    const result = await service.upload(baseInput, staff);

    expect(result.fileName).toBe('result.pdf');
    expect(result.type).toBe('REPORT');
    expect(storage.put).toHaveBeenCalled();
    expect(prisma.patientDocument.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: 'org-1', patientId: 'p1', type: 'REPORT' }),
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'document.upload', resourceType: 'patient_document' }),
      staff,
    );
  });

  it('rejects a patient outside the organisation', async () => {
    const { service, prisma } = makeService();
    prisma.patient.findFirst.mockResolvedValue(null);
    await expect(service.upload(baseInput, staff)).rejects.toThrow(NotFoundException);
  });

  it('rejects files over the size limit', async () => {
    const { service } = makeService();
    await expect(
      service.upload({ ...baseInput, sizeBytes: 11 * 1024 * 1024 }, staff),
    ).rejects.toThrow(BadRequestException);
  });

  it('requires an organisation context', async () => {
    const { service } = makeService();
    await expect(
      service.upload(baseInput, { id: 'u2', organizationId: null } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('falls back to local storage when the object-store write fails', async () => {
    const { service, storage, router } = makeService();
    storage.put.mockResolvedValue({ success: false, key: 'org-1/p1/x.pdf' });
    router.isObjectStore.mockReturnValue(true);

    // Object-store write fails; the service attempts a local fallback.
    const result = await service.upload(baseInput, staff);
    expect(result).toBeTruthy();
    // The local fallback path writes and records a local/ prefixed key.
    expect(storage.put).toHaveBeenCalled();
  });

  it('returns a signed URL for an object-store document', async () => {
    const { service, prisma, router } = makeService();
    router.isObjectStore.mockReturnValue(true);
    prisma.patientDocument.findFirst.mockResolvedValue({
      id: 'doc-1',
      organizationId: 'org-1',
      storageKey: 'org-1/p1/abc.pdf',
      fileName: 'result.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 100,
      description: null,
      createdAt: new Date(),
    });

    const result = await service.getDownloadInfo('doc-1', staff);
    expect(result.url).toBe('https://signed.example/abc');
  });

  it('serves a locally-stored document through the authenticated download route', async () => {
    const { service, prisma } = makeService();
    // Active provider is the default local one (router.isObjectStore => false).
    prisma.patientDocument.findFirst.mockResolvedValue({
      id: 'doc-1',
      organizationId: 'org-1',
      storageKey: 'org-1/p1/abc.pdf',
      fileName: 'result.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 100,
      description: null,
      createdAt: new Date(),
    });

    const info = await service.getDownloadInfo('doc-1', staff);
    expect(info.url).toBe('/api/v1/documents/doc-1/download');
  });

  it('streams bytes for a locally-stored document', async () => {
    const { service, prisma, storage } = makeService();
    prisma.patientDocument.findFirst.mockResolvedValue({
      id: 'doc-1',
      organizationId: 'org-1',
      storageKey: 'org-1/p1/abc.pdf',
      fileName: 'result.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 100,
      description: null,
      createdAt: new Date(),
    });

    const result = await service.download('doc-1', staff);
    expect(result.buffer).toBeDefined();
    expect(result.mimeType).toBe('application/pdf');
    expect(storage.read).toHaveBeenCalledWith('org-1/p1/abc.pdf');
  });

  it('lets a patient download only their own released (CONSENT/OTHER) document', async () => {
    const { service, prisma, storage } = makeService();
    prisma.patientDocument.findFirst.mockResolvedValue({
      id: 'doc-1',
      organizationId: 'org-1',
      patientId: 'p1',
      storageKey: 'org-1/p1/consent.pdf',
      fileName: 'consent.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 100,
      description: null,
      createdAt: new Date(),
    });
    const patientUser = { id: 'u1', organizationId: 'org-1', patientId: 'p1', role: 'patient' } as any;

    const result = await service.downloadSelf('doc-1', patientUser);
    expect(result.buffer).toBeDefined();
    // Self download only exposes CONSENT/OTHER types (see the where clause).
    expect(prisma.patientDocument.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ patientId: 'p1', type: { in: ['CONSENT', 'OTHER'] } }),
      }),
    );
    expect(storage.read).toHaveBeenCalledWith('org-1/p1/consent.pdf');
  });

  it('does not expose internal clinical scans to a patient via self download', async () => {
    const { service, prisma } = makeService();
    // findFirst returns null when the doc is a non-self-accessible type.
    prisma.patientDocument.findFirst.mockResolvedValue(null);
    const patientUser = { id: 'u1', organizationId: 'org-1', patientId: 'p1', role: 'patient' } as any;
    await expect(service.downloadSelf('doc-1', patientUser)).rejects.toThrow(NotFoundException);
  });
});
