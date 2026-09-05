import { RecordNumberService } from './record-number.service';
import { ConflictException } from '@nestjs/common';

describe('RecordNumberService', () => {
  const svc = new RecordNumberService();

  it('generates a prefix-year-sequence number', async () => {
    const number = await svc.next(async () => 41, { prefix: 'MRN', suffixLength: 5 });
    expect(number).toMatch(/^MRN-\d{4}-\d{5}$/);
    expect(number.endsWith('00042')).toBe(true);
  });

  it('uses the current year by default', async () => {
    const number = await svc.next(async () => 0, { prefix: 'INV' });
    expect(number.startsWith(`INV-${new Date().getUTCFullYear()}`)).toBe(true);
  });

  it('honours an explicit year', async () => {
    const number = await svc.next(async () => 7, { prefix: 'CY', year: 2024 });
    expect(number).toBe('CY-2024-00008');
  });

  it('throws when the underlying store returns an error', async () => {
    await expect(svc.next(async () => { throw new ConflictException('x'); }, { prefix: 'X' })).rejects.toThrow(ConflictException);
  });
});
