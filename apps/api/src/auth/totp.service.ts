import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';

/**
 * TOTP (time-based one-time password) for two-factor authentication.
 * Uses otplib defaults (SHA-1, 6 digits, 30s window) - interoperability with
 * standard authenticator apps.
 */
@Injectable()
export class TotpService {
  generateSecret(): string {
    return authenticator.generateSecret();
  }

  buildOtpauthUrl(secret: string, email: string, issuer: string): string {
    return authenticator.keyuri(email, issuer, secret);
  }

  /** Validate a submitted code against a stored secret. */
  verify(code: string, secret: string): boolean {
    if (!code || !secret) return false;
    try {
      return authenticator.verify({ token: code, secret });
    } catch {
      return false;
    }
  }

  /** Generate recovery codes (opaque single-use strings). */
  generateRecoveryCodes(count = 10): string[] {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      let code = '';
      for (let j = 0; j < 10; j++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      codes.push(code);
    }
    return codes;
  }
}
