import type { NextFunction, Request, Response } from 'express';

/**
 * Adds security headers that are not covered by helmet defaults, and redacts
 * sensitive headers from downstream logging / responses. Never logs secrets.
 */
export function getSensitiveHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  next();
}

/** Fields never to include in logs (defence in depth). */
export const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'mfaSecret',
  'refreshTokenHash',
  'accessToken',
  'refreshToken',
  'token',
  'secret',
  'authorization',
  'cookie',
]);

export function redact(obj: unknown, depth = 0): unknown {
  if (depth > 4) return '[redacted]';
  if (Array.isArray(obj)) {
    return obj.map((v) => redact(v, depth + 1));
  }
  if (obj && typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        out[k] = '[redacted]';
      } else {
        out[k] = redact(v, depth + 1);
      }
    }
    return out;
  }
  return obj;
}
