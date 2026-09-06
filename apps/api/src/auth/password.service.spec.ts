import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const svc = new PasswordService();

  it('hashes and verifies a password', async () => {
    const hash = await svc.hash('SuperSecret123!');
    expect(hash).not.toContain('SuperSecret123!');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    await expect(svc.verify(hash, 'SuperSecret123!')).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await svc.hash('SuperSecret123!');
    await expect(svc.verify(hash, 'wrong')).resolves.toBe(false);
  });

  it('returns false for a missing hash', async () => {
    await expect(svc.verify(null, 'x')).resolves.toBe(false);
    await expect(svc.verify(undefined, 'x')).resolves.toBe(false);
  });
});
