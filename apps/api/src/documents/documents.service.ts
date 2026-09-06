import { randomUUID } from 'crypto';
import { extname } from 'path';
import type { SessionUser } from '@ficms/types';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type { StorageProvider } from '../storage/storage.contracts';
import { STORAGE_PROVIDER_TOKEN, StorageRouter } from '../storage/storage.module';

const ALLOWED_TYPES = ['ID', 'SCAN', 'REPORT', 'CONSENT', 'OTHER'] as const;
type DocType = (typeof ALLOWED_TYPES)[number];

const MAX_SIZE = 10 * 1024 * 1024; // 10 MiB

export interface UploadDocumentInput {
  patientId: string;
  type: DocType;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  body: Buffer;
  description?: string;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(STORAGE_PROVIDER_TOKEN) private readonly storage: StorageProvider,
    private readonly router: StorageRouter,
  ) {}

  private storageKey(orgId: string, patientId: string, fileName: string): string {
    const ext = extname(fileName).slice(0, 12);
    return `${orgId}/${patientId}/${randomUUID()}${ext}`;
  }

  async upload(input: UploadDocumentInput, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');

    const patient = await this.prisma.patient.findFirst({
      where: { id: input.patientId, organizationId: org },
    });
    if (!patient) throw new NotFoundException('Patient not found in this organisation.');
    if (input.sizeBytes > MAX_SIZE) {
      throw new BadRequestException('File exceeds the 10 MiB limit.');
    }
    if (!ALLOWED_TYPES.includes(input.type)) {
      throw new BadRequestException('Unsupported document type.');
    }

    const key = this.storageKey(org, input.patientId, input.fileName);

    // Persist to storage first; if the provider is unavailable, fall back to local.
    let stored: { success: boolean; key: string } | null = null;
    stored = await this.storage.put(key, input.body, input.mimeType);
    let effectiveKey = key;
    // If object-store write failed and we're not already local, try local.
    if (!stored.success && this.router.isObjectStore()) {
      effectiveKey = `local/${key}`;
      await import('../storage/local.storage.provider').then(async ({ LocalStorageProvider }) => {
        const local = new LocalStorageProvider();
        await local.put(key, input.body, input.mimeType);
      });
    }

    const doc = await this.prisma.patientDocument.create({
      data: {
        organizationId: org,
        patientId: input.patientId,
        type: input.type as never,
        fileName: input.fileName,
        storageKey: effectiveKey,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        description: input.description ?? null,
        uploadedById: user.id,
      },
    });

    await this.audit.record(
      { action: 'document.upload', resourceType: 'patient_document', resourceId: doc.id, after: { patientId: input.patientId, type: input.type, fileName: input.fileName } },
      user,
    );

    return this.toPublic(doc);
  }

  async listForPatient(patientId: string, user: SessionUser) {
    const org = user.organizationId;
    if (!org) return [];
    const rows = await this.prisma.patientDocument.findMany({
      where: { patientId, organizationId: org },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((d: any) => this.toPublic(d));
  }

  /** True when a document's bytes live on the local filesystem (active provider
   *  is local, or the doc was written as a fallback from a failed object store). */
  private isLocal(key: string): boolean {
    return !this.router.isObjectStore() || key.startsWith('local/');
  }

  private localKey(key: string): string {
    return key.startsWith('local/') ? key.replace('local/', '') : key;
  }

  /** Resolve the provider that owns the bytes for a local-stored document. When
   *  the active provider is local we can reuse the injected instance (makes the
   *  service testable); when S3 is active but this doc was fallback-written we
   *  construct a dedicated local provider with the same default root. */
  private async localProvider(): Promise<StorageProvider> {
    if (!this.router.isObjectStore()) return this.storage;
    const { LocalStorageProvider } = await import('../storage/local.storage.provider');
    return new LocalStorageProvider();
  }

  async getDownloadInfo(id: string, user: SessionUser) {
    const org = user.organizationId;
    const doc = await this.prisma.patientDocument.findFirst({
      where: { id, organizationId: org ?? undefined },
    });
    if (!doc) throw new NotFoundException('Document not found.');
    // Local bytes are always served through the authenticated download route.
    const url = this.isLocal(doc.storageKey)
      ? `/api/v1/documents/${doc.id}/download`
      : await this.storage.getUrl(doc.storageKey, 3600).catch(() => `/api/v1/documents/${doc.id}/download`);
    return { ...this.toPublic(doc), url };
  }

  async download(id: string, user: SessionUser) {
    const org = user.organizationId;
    const doc = await this.prisma.patientDocument.findFirst({
      where: { id, organizationId: org ?? undefined },
    });
    if (!doc) throw new NotFoundException('Document not found.');

    await this.audit.record(
      { action: 'document.download', resourceType: 'patient_document', resourceId: doc.id, after: { fileName: doc.fileName } },
      user,
    );

    // Local storage: read bytes and stream them (permission-gated). Object
    // store: return a signed / public-base URL for a client-side redirect.
    if (this.isLocal(doc.storageKey)) {
      const provider = await this.localProvider();
      const buf = await provider.read!(this.localKey(doc.storageKey));
      return { buffer: buf, mimeType: doc.mimeType, fileName: doc.fileName };
    }
    const url = await this.storage.getUrl(doc.storageKey, 3600);
    return { url, mimeType: doc.mimeType, fileName: doc.fileName };
  }

  /**
   * Patient self-service download. Only the patient's own, clinic-released
   * document types (CONSENT/OTHER — mirroring the self list) are exposed;
   * internal clinical scans/reports are never surfaced to the patient.
   */
  async downloadSelf(id: string, user: SessionUser) {
    const patientId = user.patientId;
    if (!patientId) throw new NotFoundException('No patient record is linked to this account.');
    const doc = await this.prisma.patientDocument.findFirst({
      where: {
        id,
        patientId,
        organizationId: user.organizationId ?? undefined,
        type: { in: ['CONSENT', 'OTHER'] },
      },
    });
    if (!doc) throw new NotFoundException('Document not found or not available to you.');

    await this.audit.record(
      { action: 'document.self_download', resourceType: 'patient_document', resourceId: doc.id, after: { fileName: doc.fileName } },
      user,
    );

    if (this.isLocal(doc.storageKey)) {
      const provider = await this.localProvider();
      const buf = await provider.read!(this.localKey(doc.storageKey));
      return { buffer: buf, mimeType: doc.mimeType, fileName: doc.fileName };
    }
    const url = await this.storage.getUrl(doc.storageKey, 3600);
    return { url, mimeType: doc.mimeType, fileName: doc.fileName };
  }

  async delete(id: string, user: SessionUser) {
    const org = user.organizationId;
    const doc = await this.prisma.patientDocument.findFirst({
      where: { id, organizationId: org ?? undefined },
    });
    if (!doc) throw new NotFoundException('Document not found.');
    if (this.isLocal(doc.storageKey)) {
      const provider = await this.localProvider();
      await provider.delete(this.localKey(doc.storageKey)).catch(() => undefined);
    } else {
      await this.storage.delete(doc.storageKey).catch(() => undefined);
    }
    await this.prisma.patientDocument.delete({ where: { id } });
    await this.audit.record(
      { action: 'document.delete', resourceType: 'patient_document', resourceId: doc.id, after: { fileName: doc.fileName } },
      user,
    );
    return { deleted: true };
  }

  private toPublic(doc: {
    id: string;
    type: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    description: string | null;
    createdAt: Date;
  }) {
    return {
      id: doc.id,
      type: doc.type,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      description: doc.description,
      createdAt: doc.createdAt,
    };
  }
}
