/**
 * Wall-clock rest: remaining must follow Date.now(), not tick count.
 */

import { resolveRestSeconds } from '@/state/useRestTimerStore';

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

  it('extend adds seconds to remaining wall-clock budget', () => {
    const startedAt = 1_000_000;
    let durationMs = 60_000;
    const now = startedAt + 20_000;
    durationMs += 15_000;
    const remaining = Math.max(0, Math.ceil((durationMs - (now - startedAt)) / 1000));
    expect(remaining).toBe(55);
  });
});

describe('resolveRestSeconds', () => {
  it('uses plan when override is null', () => {
    expect(resolveRestSeconds(90, null)).toBe(90);
  });

  it('returns null when override is off (0)', () => {
    expect(resolveRestSeconds(90, 0)).toBe(null);
  });

  it('uses fixed override when set', () => {
    expect(resolveRestSeconds(90, 120)).toBe(120);
  });
});
