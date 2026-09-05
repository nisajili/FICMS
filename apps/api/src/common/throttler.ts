import type { RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';

/**
 * Simple per-IP rate limiting for the API. In multi-org deployments this is
 * keyed by IP; a Redis-backed limiter can be swapped in for shared budgets.
 */
export function throttler(): RequestHandler {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, statusCode: 429, message: 'Too many requests.', code: 'RATE_LIMIT' },
  });
}
