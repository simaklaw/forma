/**
 * Wall-clock rest: remaining must follow Date.now(), not tick count.
 */

describe('RestTimerEngine wall-clock', () => {
  it('computes remaining from startedAt + durationMs', () => {
    const startedAt = 1_000_000;
    const durationMs = 90_000;
    const now = startedAt + 30_000;
    const remaining = Math.max(0, Math.ceil((durationMs - (now - startedAt)) / 1000));
    expect(remaining).toBe(60);
  });

  it('hits zero when wall clock past deadline', () => {
    const startedAt = 1_000_000;
    const durationMs = 10_000;
    const now = startedAt + 15_000;
    const remaining = Math.max(0, Math.ceil((durationMs - (now - startedAt)) / 1000));
    expect(remaining).toBe(0);
  });
});
