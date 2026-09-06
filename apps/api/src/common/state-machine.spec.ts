import { ConflictException } from '@nestjs/common';
import { StateMachine, assertVersion } from './state-machine';
import { APPOINTMENT_TRANSITIONS, CYCLE_TRANSITIONS, LAB_RESULT_TRANSITIONS } from '@ficms/config';

describe('StateMachine', () => {
  it('allows a valid transition', () => {
    const sm = new StateMachine(APPOINTMENT_TRANSITIONS as Record<string, readonly string[]>, 'appointment');
    expect(sm.canTransition('REQUESTED', 'SCHEDULED')).toBe(true);
    expect(() => sm.assertTransition('REQUESTED', 'SCHEDULED')).not.toThrow();
  });

  it('rejects an invalid transition', () => {
    const sm = new StateMachine(APPOINTMENT_TRANSITIONS as Record<string, readonly string[]>, 'appointment');
    expect(sm.canTransition('COMPLETED', 'SCHEDULED')).toBe(false);
    expect(() => sm.assertTransition('COMPLETED', 'SCHEDULED')).toThrow(ConflictException);
  });

  it('allows a self-transition (no-op)', () => {
    const sm = new StateMachine(APPOINTMENT_TRANSITIONS as Record<string, readonly string[]>, 'appointment');
    expect(() => sm.assertTransition('SCHEDULED', 'SCHEDULED')).not.toThrow();
  });

  it('cycle machine progresses through IVF lifecycle', () => {
    const sm = new StateMachine(CYCLE_TRANSITIONS as Record<string, readonly string[]>, 'cycle');
    expect(sm.canTransition('PLANNED', 'BASELINE_ASSESSMENT')).toBe(true);
    expect(sm.canTransition('STIMULATION', 'MONITORING')).toBe(true);
    expect(sm.canTransition('TRIGGER', 'RETRIEVAL')).toBe(true);
    expect(sm.canTransition('RETRIEVAL', 'FERTILIZATION')).toBe(true);
    expect(sm.canTransition('OUTCOME', 'PLANNED')).toBe(false);
  });

  it('lab order machine enforces verify-before-release ordering', () => {
    const sm = new StateMachine(LAB_RESULT_TRANSITIONS as Record<string, readonly string[]>, 'lab order');
    expect(sm.canTransition('ACCESSED', 'PROCESSING')).toBe(true);
    expect(sm.canTransition('PROCESSING', 'VERIFIED')).toBe(true);
    expect(sm.canTransition('VERIFIED', 'RELEASED')).toBe(true);
    expect(sm.canTransition('REQUESTED', 'RELEASED')).toBe(false);
  });
});

describe('assertVersion', () => {
  it('throws on a version mismatch (optimistic lock)', () => {
    expect(() => assertVersion(2, 1, 'record')).toThrow(ConflictException);
  });
  it('passes when versions match or are omitted', () => {
    expect(() => assertVersion(2, 2)).not.toThrow();
    expect(() => assertVersion(2, undefined)).not.toThrow();
  });
});
