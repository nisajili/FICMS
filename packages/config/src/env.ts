import { z } from 'zod';

/**
 * Environment validation. Fail fast on missing/invalid config at boot time.
 * Kept org-/branding-agnostic: no clinic name, currency, or branding here.
 */

export const commonEnv = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production', 'staging'])
    .default('development'),
  LOG_LEVEL: z.string().default('info'),
});

export const apiEnvSchema = commonEnv.extend({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  API_PORT: z.coerce.number().default(4000),
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('900s'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  SESSION_TIMEOUT_MINUTES: z.coerce.number().default(30),
  PLATFORM_BOOTSTRAP_TOKEN: z
    .string()
    .default('change-me-bootstrap-token'),
  S3_ENDPOINT: z.string().default('http://localhost:9000'),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('ficms'),
  S3_ACCESS_KEY_ID: z.string().default('minio'),
  S3_SECRET_ACCESS_KEY: z.string().default('minio123'),
  S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  SMS_PROVIDER: z.string().default('manual'),
  EMAIL_PROVIDER: z.string().default('console'),
  PAYMENT_PROVIDER: z.string().default('offline'),
  PAYMENT_WEBHOOK_SECRET: z.string().optional(),
  // Break-glass emergency access (platform-admin clinical access).
  BREAK_GLASS_MAX_MINUTES: z.coerce.number().default(60),
  BREAK_GLASS_ALLOW_SELF_APPROVE: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
});

export const webEnvSchema = commonEnv.extend({
  NEXT_PUBLIC_API_URL: z.string().default('http://localhost:4000/api/v1'),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;
export type WebEnv = z.infer<typeof webEnvSchema>;

export function loadApiEnv(env: NodeJS.ProcessEnv = process.env): ApiEnv {
  const parsed = apiEnvSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid API environment:\n${issues}`);
  }
  return parsed.data;
}

export function loadWebEnv(env: NodeJS.ProcessEnv = process.env): WebEnv {
  const parsed = webEnvSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid web environment:\n${issues}`);
  }
  return parsed.data;
}
