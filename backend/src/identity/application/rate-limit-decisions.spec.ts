import { Clock } from './ports/clock';
import { RateLimitDecisions } from './rate-limit-decisions';
import { RateLimitState } from '../domain/rate-limit';

describe('RateLimitDecisions', () => {
  let clock: FakeClock;
  let decisions: RateLimitDecisions;

  beforeEach(() => {
    clock = new FakeClock(new Date('2026-08-13T12:00:00.000Z'));
    decisions = new RateLimitDecisions(clock);
  });

  it('allows an unblocked state without Retry-After', () => {
    expect(decisions.evaluate(stateWithBlock(null))).toEqual({
      limited: false,
      retryAfterSeconds: null,
    });
  });

  it('rounds Retry-After up to a complete second', () => {
    expect(
      decisions.evaluate(stateWithBlock(new Date('2026-08-13T12:00:01.001Z'))),
    ).toEqual({ limited: true, retryAfterSeconds: 2 });
  });

  it('stops limiting exactly at the controlled expiration time', () => {
    const state = stateWithBlock(new Date('2026-08-13T12:00:10.000Z'));

    expect(decisions.evaluate(state).limited).toBe(true);
    clock.advanceBy(10_000);
    expect(decisions.evaluate(state)).toEqual({
      limited: false,
      retryAfterSeconds: null,
    });
  });
});

class FakeClock extends Clock {
  constructor(private current: Date) {
    super();
  }

  now(): Date {
    return new Date(this.current);
  }

  advanceBy(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds);
  }
}

function stateWithBlock(blockedUntil: Date | null): RateLimitState {
  const now = new Date('2026-08-13T12:00:00.000Z');

  return {
    action: 'LOGIN',
    keyDigest: 'a'.repeat(64),
    windowStartedAt: now,
    attemptCount: 6,
    blockedUntil,
    updatedAt: now,
  };
}
