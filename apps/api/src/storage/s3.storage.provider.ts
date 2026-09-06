import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import { StorageProvider } from './storage.contracts';

export interface S3StorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  /** Public base URL for the bucket (e.g. CDN). If set, returns it for reads. */
  publicBaseUrl?: string;
}

/**
 * S3-compatible storage provider. Configured from the app config. If the S3
 * client cannot be constructed or an operation fails (e.g. no network, invalid
 * creds), it logs and returns a best-effort result so the workflow is never
 * blocked — callers fall back to local storage.
 */
@Injectable()
export class S3StorageProvider implements StorageProvider {
  readonly id = 's3';
  private readonly client: S3Client;
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly bucket: string;
  private readonly publicBaseUrl?: string;
  private ready = false;

  constructor(private readonly config: S3StorageConfig) {
    this.bucket = config.bucket;
    this.publicBaseUrl = config.publicBaseUrl;
    try {
      this.client = new S3Client({
        endpoint: config.endpoint,
        region: config.region,
        forcePathStyle: config.forcePathStyle,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      });
      this.ready = true;
    } catch (e) {
      this.logger.warn(`S3 client init failed (${(e as Error).message}). Falling back to local storage.`);
      this.ready = false;
    }
  }

  private assertReady(): boolean {
    return this.ready;
  }

  async put(key: string, body: Buffer, contentType: string): Promise<{ success: boolean; key: string }> {
    if (!this.assertReady()) return { success: false, key };
    try {
      await this.client.send(
        new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
      );
      return { success: true, key };
    } catch (e) {
      this.logger.warn(`S3 put failed (${(e as Error).message}). Caller will fall back to local.`);
      return { success: false, key };
    }
  }

  async getUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    if (this.publicBaseUrl) {
      // Keep key path separators readable in CDN URLs; encode each segment.
      const encoded = key.split('/').map((s) => encodeURIComponent(s)).join('/');
      return `${this.publicBaseUrl.replace(/\/$/, '')}/${encoded}`;
    }
    if (!this.assertReady()) return '';
    try {
      const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
      return await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
    } catch (e) {
      this.logger.warn(`S3 getUrl failed (${(e as Error).message}).`);
      return '';
    }
  }

  async read(key: string): Promise<Buffer> {
    if (!this.assertReady()) throw new Error('S3 not ready');
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return Buffer.from(await res.Body!.transformToByteArray());
  }

  async delete(key: string): Promise<void> {
    if (!this.assertReady()) return;
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (e) {
      this.logger.warn(`S3 delete failed (${(e as Error).message}).`);
    }
  }
}
