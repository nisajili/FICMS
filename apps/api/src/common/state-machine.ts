import { ConflictException } from '@nestjs/common';

/**
 * Generic workflow state machine. Prevents invalid status changes and enforces
 * optimistic locking via `version` (compare-and-swap on update).
 */
export class StateMachine<T extends string> {
  constructor(
    private readonly transitions: Record<T, readonly T[]>,
    private readonly label = 'record',
  ) {}

  canTransition(from: T, to: T): boolean {
    return (this.transitions[from] ?? []).includes(to);
  }

  assertTransition(from: T, to: T): void {
    if (from === to) return;
    if (!this.canTransition(from, to)) {
      throw new ConflictException(
        `Invalid ${this.label} status change: "${from}" → "${to}" is not permitted.`,
      );
    }
  }
}

/** Optimistic locking helper: throws if the committed version differs. */
export function assertVersion(stored: number, submitted?: number, label = 'record'): void {
  if (submitted !== undefined && submitted !== stored) {
    throw new ConflictException(
      `${label} has been modified by another user. Refresh and retry.`,
    );
  }
}
