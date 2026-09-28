import { estimateWorkoutBurnKcal } from './estimateWorkoutBurn';
import type { SetLogEntry } from '@forma/core';

function log(partial: Partial<SetLogEntry> & Pick<SetLogEntry, 'dateKey'>): SetLogEntry {
  return {
    id: 'x',
    exerciseId: 1,
    weight: 60,
    reps: 8,
    rir: 2,
    ...partial
  };
}

describe('estimateWorkoutBurnKcal', () => {
  it('returns 0 without body mass or sets', () => {
    expect(estimateWorkoutBurnKcal([], '2026-09-27', 80)).toBe(0);
    expect(estimateWorkoutBurnKcal([log({ dateKey: '2026-09-27' })], '2026-09-27', null)).toBe(0);
  });

  it('scales with set count and bodyKg', () => {
    const logs = Array.from({ length: 12 }, () => log({ dateKey: '2026-09-27' }));
    const a = estimateWorkoutBurnKcal(logs, '2026-09-27', 70);
    const b = estimateWorkoutBurnKcal(logs, '2026-09-27', 90);
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(a);
  });

  it('ignores other days', () => {
    const logs = [log({ dateKey: '2026-09-26' }), log({ dateKey: '2026-09-27' })];
    const one = estimateWorkoutBurnKcal([log({ dateKey: '2026-09-27' })], '2026-09-27', 80);
    const filtered = estimateWorkoutBurnKcal(logs, '2026-09-27', 80);
    expect(filtered).toBe(one);
  });
});
