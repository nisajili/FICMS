import { authenticator } from 'otplib';
import { TotpService } from './totp.service';

describe('TotpService', () => {
  const svc = new TotpService();

  it('generates a secret and an otpauth url', () => {
    const secret = svc.generateSecret();
    expect(secret.length).toBeGreaterThanOrEqual(16);
    const url = svc.buildOtpauthUrl(secret, 'admin@clinic.example', 'FICMS');
    expect(url).toContain('otpauth://totp/');
    expect(url).toContain(encodeURIComponent('FICMS'));
  });

  it('verifies a valid code generated from the secret', () => {
    const secret = svc.generateSecret();
    const code = authenticator.generate(secret);
    expect(svc.verify(code, secret)).toBe(true);
  });

  it('rejects an invalid code and empty inputs', () => {
    const secret = svc.generateSecret();
    expect(svc.verify('000000', secret)).toBe(false);
    expect(svc.verify('', '')).toBe(false);
  });

  it('generates recovery codes', () => {
    const codes = svc.generateRecoveryCodes(10);
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    expect(codes[0]).toBeTruthy();
  });
});
