import { lastWorkoutFromLogs } from './lastWorkoutFromLogs';
import type { SetLogEntry } from '@forma/core';

function log(dateKey: string, exerciseId: number): SetLogEntry {
  return { id: 'x', exerciseId, dateKey, weight: 60, reps: 8, rir: 2 };
}

describe('lastWorkoutFromLogs', () => {
  it('returns null for empty logs', () => {
    expect(lastWorkoutFromLogs([], {})).toBeNull();
  });

  it('picks latest date and dominant exercise name', () => {
    const logs = [
      log('2026-09-25', 1),
      log('2026-09-27', 10),
      log('2026-09-27', 10),
      log('2026-09-27', 20)
    ];
    const names = { 10: 'Жим лёжа', 20: 'Присед' };
    const hint = lastWorkoutFromLogs(logs, names);
    expect(hint?.completedAt).toBe('2026-09-27');
    expect(hint?.name).toBe('Жим лёжа');
    expect(hint?.sets).toBe(3);
  });
});
