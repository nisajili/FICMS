import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { apiEnvSchema } from '@ficms/config';

export interface AppConfig {
  nodeEnv: string;
  databaseUrl: string;
  redisUrl: string;
  apiPrefix: string;
  corsOrigins: string[];
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtAccessTtl: string;
  jwtRefreshTtl: string;
  cookieSecure: boolean;
  sessionTimeoutMinutes: number;
  platformBootstrapToken: string;
  s3: {
    endpoint: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    forcePathStyle: boolean;
    publicBaseUrl?: string;
  };
  storageProvider: string;
  smsProvider: string;
  emailProvider: string;
  paymentProvider: string;
  paymentWebhookSecret?: string;
  logLevel: string;
  breakGlassMaxMinutes: number;
  breakGlassAllowSelfApprove: boolean;
}

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
      validate: (config: Record<string, unknown>) => {
        const parsed = apiEnvSchema.parse(config);
        return parsed as Record<string, unknown>;
      },
    }),
  ],
  providers: [
    {
      provide: 'APP_CONFIG',
      inject: [ConfigModule],
      useFactory: (): AppConfig => {
        const parsed = apiEnvSchema.parse(process.env);
        return {
          nodeEnv: parsed.NODE_ENV,
          databaseUrl: parsed.DATABASE_URL,
          redisUrl: parsed.REDIS_URL,
          apiPrefix: parsed.API_PREFIX,
          corsOrigins: parsed.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
          jwtAccessSecret: parsed.JWT_ACCESS_SECRET,
          jwtRefreshSecret: parsed.JWT_REFRESH_SECRET,
          jwtAccessTtl: parsed.JWT_ACCESS_TTL,
          jwtRefreshTtl: parsed.JWT_REFRESH_TTL,
          cookieSecure: parsed.COOKIE_SECURE ?? false,
          sessionTimeoutMinutes: parsed.SESSION_TIMEOUT_MINUTES,
          platformBootstrapToken: parsed.PLATFORM_BOOTSTRAP_TOKEN,
          s3: {
            endpoint: parsed.S3_ENDPOINT,
            region: parsed.S3_REGION,
            bucket: parsed.S3_BUCKET,
            accessKeyId: parsed.S3_ACCESS_KEY_ID,
            secretAccessKey: parsed.S3_SECRET_ACCESS_KEY,
            forcePathStyle: parsed.S3_FORCE_PATH_STYLE ?? true,
            publicBaseUrl: parsed.S3_PUBLIC_BASE_URL,
          },
          storageProvider: parsed.STORAGE_PROVIDER,
          smsProvider: parsed.SMS_PROVIDER,
          emailProvider: parsed.EMAIL_PROVIDER,
          paymentProvider: parsed.PAYMENT_PROVIDER,
          paymentWebhookSecret: parsed.PAYMENT_WEBHOOK_SECRET,
          logLevel: parsed.LOG_LEVEL,
          breakGlassMaxMinutes: parsed.BREAK_GLASS_MAX_MINUTES,
          breakGlassAllowSelfApprove: parsed.BREAK_GLASS_ALLOW_SELF_APPROVE ?? false,
        };
      },
    },
  ],
  exports: ['APP_CONFIG'],
})
export class AppConfigModule {}
