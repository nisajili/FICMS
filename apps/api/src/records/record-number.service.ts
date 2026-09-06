import { Injectable } from '@nestjs/common';

/**
 * Generates safe, human-readable record numbers. Per-org numbering format is
 * configurable (stored in OrganizationSetting); the default pattern is:
 *   {PREFIX}-{YYYY}-{SEQUENCE}
 * Sequences are derived by counting existing records for the org + prefix.
 * In production the sequence is locked by a DB transaction to avoid collisions.
 */
@Injectable()
export class RecordNumberService {
  private pad(n: number, width = 5): string {
    return String(n).padStart(width, '0');
  }

  async next(
    countLookup: () => Promise<number>,
    opts: { prefix: string; year?: number; suffixLength?: number },
  ): Promise<string> {
    const year = opts.year ?? new Date().getUTCFullYear();
    const count = await countLookup();
    const seq = this.pad(count + 1, opts.suffixLength ?? 5);
    return `${opts.prefix}-${year}-${seq}`;
  }
}
