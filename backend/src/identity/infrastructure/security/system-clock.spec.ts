import { SystemClock } from './system-clock';

describe('SystemClock', () => {
  it('returns the current instant', () => {
    const before = Date.now();
    const current = new SystemClock().now();
    const after = Date.now();

    expect(current).toBeInstanceOf(Date);
    expect(current.getTime()).toBeGreaterThanOrEqual(before);
    expect(current.getTime()).toBeLessThanOrEqual(after);
  });
});
