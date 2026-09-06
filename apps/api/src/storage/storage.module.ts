import { Global, Module, Inject, Injectable } from '@nestjs/common';
import type { AppConfig } from '../config/config.module';
import { LocalStorageProvider } from './local.storage.provider';
import { S3StorageProvider } from './s3.storage.provider';
import { StorageProvider } from './storage.contracts';

/**
 * Resolves the active storage provider from the app config. Defaults to 'local'.
 * When 's3' is requested but the provider is unavailable, it reports a probe
 * failure so callers can fall back — but the module still provides something.
 */
export const STORAGE_PROVIDER_TOKEN = 'STORAGE_PROVIDER';

@Injectable()
export class StorageRouter {
  constructor(@Inject(STORAGE_PROVIDER_TOKEN) public readonly provider: StorageProvider) {}

  /** True if the resolved provider is object storage (not local fallback). */
  isObjectStore(): boolean {
    return this.provider.id === 's3';
  }
}

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_PROVIDER_TOKEN,
      inject: ['APP_CONFIG'],
      useFactory: (config: AppConfig): StorageProvider => {
        const kind = (config.storageProvider ?? 'local') as string;
        if (kind === 's3') {
          return new S3StorageProvider({
            endpoint: config.s3.endpoint,
            region: config.s3.region,
            bucket: config.s3.bucket,
            accessKeyId: config.s3.accessKeyId,
            secretAccessKey: config.s3.secretAccessKey,
            forcePathStyle: config.s3.forcePathStyle,
            publicBaseUrl: config.s3.publicBaseUrl,
          });
        }
        return new LocalStorageProvider();
      },
    },
    StorageRouter,
  ],
  exports: [STORAGE_PROVIDER_TOKEN, StorageRouter],
})
export class StorageModule {}
