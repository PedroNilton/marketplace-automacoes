import { Clock } from './clock';

describe('Clock', () => {
  it('allows a fake clock to control expiration deterministically', () => {
    const clock = new FakeClock(new Date('2026-08-11T12:00:00.000Z'));
    const expiresAt = new Date('2026-08-11T12:30:00.000Z');

    expect(hasExpired(expiresAt, clock)).toBe(false);

    clock.advanceBy(30 * 60 * 1000);

    expect(hasExpired(expiresAt, clock)).toBe(true);
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

function hasExpired(expiresAt: Date, clock: Clock): boolean {
  return clock.now().getTime() >= expiresAt.getTime();
}
