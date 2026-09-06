import { Injectable } from '@nestjs/common';
import * as argon2 from '@node-rs/argon2';

/**
 * Argon2id password hashing. Uses recommended parameters:
 * memoryCost 65536 KiB (64 MiB), timeCost 3, parallelism 4.
 */
@Injectable()
export class PasswordService {
  private readonly options: argon2.Options = {
    algorithm: argon2.Algorithm.Argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  };

  hash(password: string): Promise<string> {
    return argon2.hash(password, this.options);
  }

  async verify(hash: string | null | undefined, password: string): Promise<boolean> {
    if (!hash) return false;
    try {
      return await argon2.verify(hash, password, this.options);
    } catch {
      return false;
    }
  }
}
