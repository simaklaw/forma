import {
  selectWeeklyVolume,
  selectWeekDaysFullyCompleted,
  selectPersonalRecord,
  selectOverallPersonalRecord,
  pruneOldSetLogs,
  selectCurrentStreak,
  selectStreakDays,
  ruDayWord,
  roundToStep,
  toDateKey,
  SetLogEntry,
  DayProgress
} from './WorkoutStats';

// Fixed "now" so date-window tests are deterministic regardless of when CI runs.
const NOW = new Date(2026, 8, 14); // Mon 14 Sep 2026 (local time, matches toDateKey's local-day semantics)

function daysAgo(n: number): Date {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return d;
}

describe('selectWeeklyVolume', () => {
  it('returns 7 days, oldest first, all zero when there are no logs', () => {
    const result = selectWeeklyVolume([], 7, NOW);
    expect(result).toHaveLength(7);
    expect(result[6].dateKey).toBe(toDateKey(NOW));
    expect(result.every((r) => r.volumeKg === 0 && r.pct === 0)).toBe(true);
  });

  it('sums weight × reps per day across multiple sets and exercises', () => {
    const logs: SetLogEntry[] = [
      { id: '1', exerciseId: 1, dateKey: toDateKey(NOW), weight: 80, reps: 8, rir: 2 },
      { id: '2', exerciseId: 1, dateKey: toDateKey(NOW), weight: 80, reps: 8, rir: 2 },
      { id: '3', exerciseId: 2, dateKey: toDateKey(NOW), weight: 100, reps: 5, rir: 1 },
      { id: '4', exerciseId: 1, dateKey: toDateKey(daysAgo(1)), weight: 80, reps: 8, rir: 2 }
    ];
    const result = selectWeeklyVolume(logs, 7, NOW);
    const today = result.find((r) => r.dateKey === toDateKey(NOW))!;
    const yesterday = result.find((r) => r.dateKey === toDateKey(daysAgo(1)))!;

    expect(today.volumeKg).toBe(80 * 8 * 2 + 100 * 5); // 1780
    expect(yesterday.volumeKg).toBe(80 * 8); // 640
    expect(today.pct).toBe(100); // max day in window
    expect(yesterday.pct).toBe(Math.round((640 / 1780) * 100));
  });

  it('ignores logs outside the requested window', () => {
    const logs: SetLogEntry[] = [{ id: '1', exerciseId: 1, dateKey: toDateKey(daysAgo(30)), weight: 80, reps: 8, rir: 2 }];
    const result = selectWeeklyVolume(logs, 7, NOW);
    expect(result.every((r) => r.volumeKg === 0)).toBe(true);
  });
});

describe('selectWeekDaysFullyCompleted', () => {
  const exercises = [
    { id: 1, totalSets: 4 },
    { id: 2, totalSets: 3 },
    { id: 3, totalSets: 3 }
  ];

  it('counts a day only when every exercise reached its total sets', () => {
    const dayProgress: DayProgress = {
      [toDateKey(NOW)]: { 1: 4, 2: 3, 3: 3 }, // fully done
      [toDateKey(daysAgo(1))]: { 1: 4, 2: 3, 3: 2 }, // exercise 3 short
      [toDateKey(daysAgo(2))]: { 1: 4, 2: 3, 3: 3 } // fully done
    };
    expect(selectWeekDaysFullyCompleted(dayProgress, exercises, 7, NOW)).toBe(2);
  });

  it('returns 0 for an empty log', () => {
    expect(selectWeekDaysFullyCompleted({}, exercises, 7, NOW)).toBe(0);
  });

  it('does not count a day where an exercise was never logged', () => {
    const dayProgress: DayProgress = { [toDateKey(NOW)]: { 1: 4, 2: 3 } }; // exercise 3 missing entirely
    expect(selectWeekDaysFullyCompleted(dayProgress, exercises, 7, NOW)).toBe(0);
  });
});

describe('selectPersonalRecord', () => {
  it('returns null when there are no logs', () => {
    expect(selectPersonalRecord([])).toBeNull();
  });

  it('returns the heaviest weight across all exercises when exerciseId is omitted', () => {
    const logs: SetLogEntry[] = [
      { id: '1', exerciseId: 1, dateKey: '2026-09-10', weight: 80, reps: 8, rir: 2 },
      { id: '2', exerciseId: 2, dateKey: '2026-09-11', weight: 100, reps: 5, rir: 1 },
      { id: '3', exerciseId: 3, dateKey: '2026-09-12', weight: 14, reps: 12, rir: 2 }
    ];
    expect(selectPersonalRecord(logs)).toBe(100);
  });

  it('filters to one exercise when exerciseId is given', () => {
    const logs: SetLogEntry[] = [
      { id: '1', exerciseId: 1, dateKey: '2026-09-10', weight: 80, reps: 8, rir: 2 },
      { id: '2', exerciseId: 1, dateKey: '2026-09-11', weight: 82.5, reps: 8, rir: 1 },
      { id: '3', exerciseId: 2, dateKey: '2026-09-11', weight: 100, reps: 5, rir: 1 }
    ];
    expect(selectPersonalRecord(logs, 1)).toBe(82.5);
    expect(selectPersonalRecord(logs, 2)).toBe(100);
  });

  it('returns null for an exercise with no logs even if other exercises have some', () => {
    const logs: SetLogEntry[] = [{ id: '1', exerciseId: 1, dateKey: '2026-09-10', weight: 80, reps: 8, rir: 2 }];
    expect(selectPersonalRecord(logs, 99)).toBeNull();
  });
});

describe('selectOverallPersonalRecord', () => {
  it('returns null when the map is empty (nothing logged yet)', () => {
    expect(selectOverallPersonalRecord({})).toBeNull();
  });

  it('returns the max across all exercises, independent of setLogs', () => {
    expect(selectOverallPersonalRecord({ 1: 82.5, 2: 100, 3: 14 })).toBe(100);
  });
});

describe('pruneOldSetLogs', () => {
  it('keeps entries within the retention window and drops older ones', () => {
    const logs: SetLogEntry[] = [
      { id: 'old', exerciseId: 1, dateKey: toDateKey(daysAgo(200)), weight: 70, reps: 8, rir: 2 },
      { id: 'edge', exerciseId: 1, dateKey: toDateKey(daysAgo(180)), weight: 75, reps: 8, rir: 2 },
      { id: 'recent', exerciseId: 1, dateKey: toDateKey(daysAgo(1)), weight: 80, reps: 8, rir: 2 }
    ];
    const result = pruneOldSetLogs(logs, 180, NOW);
    expect(result.map((e) => e.id).sort()).toEqual(['edge', 'recent']);
  });

  it('keeps everything when nothing is old enough to prune', () => {
    const logs: SetLogEntry[] = [{ id: '1', exerciseId: 1, dateKey: toDateKey(daysAgo(5)), weight: 80, reps: 8, rir: 2 }];
    expect(pruneOldSetLogs(logs, 180, NOW)).toHaveLength(1);
  });

  it('returns an empty array unchanged', () => {
    expect(pruneOldSetLogs([], 180, NOW)).toEqual([]);
  });
});

describe('roundToStep', () => {
  it('rounds to the nearest step', () => {
    expect(roundToStep(81, 2.5)).toBe(80);
    expect(roundToStep(82, 2.5)).toBe(82.5);
  });

  it('clears floating-point drift (80 - 2.5 repeated)', () => {
    let w = 80;
    for (let i = 0; i < 4; i++) w = roundToStep(w - 2.5, 2.5);
    expect(w).toBe(70);
  });

  it('handles a step of 1 (reps-style rounding)', () => {
    expect(roundToStep(7.6, 1)).toBe(8);
  });
});

describe('selectCurrentStreak', () => {
  const exercises = [
    { id: 1, totalSets: 4 },
    { id: 2, totalSets: 3 }
  ];

  it('returns 0 with no history at all', () => {
    expect(selectCurrentStreak({}, exercises, NOW)).toBe(0);
  });

  it('counts consecutive complete days ending today when today is already complete', () => {
    const dayProgress: DayProgress = {
      [toDateKey(NOW)]: { 1: 4, 2: 3 },
      [toDateKey(daysAgo(1))]: { 1: 4, 2: 3 },
      [toDateKey(daysAgo(2))]: { 1: 4, 2: 3 },
      [toDateKey(daysAgo(3))]: { 1: 4, 2: 2 } // breaks the streak
    };
    expect(selectCurrentStreak(dayProgress, exercises, NOW)).toBe(3);
  });

  it('does not break the streak just because today is not finished yet', () => {
    const dayProgress: DayProgress = {
      // today has no entry at all (not started)
      [toDateKey(daysAgo(1))]: { 1: 4, 2: 3 },
      [toDateKey(daysAgo(2))]: { 1: 4, 2: 3 }
    };
    expect(selectCurrentStreak(dayProgress, exercises, NOW)).toBe(2);
  });

  it('stops counting at the first missed day looking backward', () => {
    const dayProgress: DayProgress = {
      [toDateKey(daysAgo(1))]: { 1: 4, 2: 3 },
      [toDateKey(daysAgo(2))]: { 1: 4, 2: 1 }, // missed
      [toDateKey(daysAgo(3))]: { 1: 4, 2: 3 } // would extend, but unreachable past a gap
    };
    expect(selectCurrentStreak(dayProgress, exercises, NOW)).toBe(1);
  });
});

describe('selectStreakDays', () => {
  const exercises = [{ id: 1, totalSets: 4 }];

  it('marks the most recent day as today-in-progress when incomplete, not missed', () => {
    const result = selectStreakDays({}, exercises, 3, NOW);
    expect(result).toEqual(['missed', 'missed', 'today-in-progress']);
  });

  it('marks today as done when it is actually complete', () => {
    const dayProgress: DayProgress = { [toDateKey(NOW)]: { 1: 4 } };
    const result = selectStreakDays(dayProgress, exercises, 3, NOW);
    expect(result[2]).toBe('done');
  });

  it('marks past days as done/missed correctly, oldest first', () => {
    const dayProgress: DayProgress = { [toDateKey(daysAgo(1))]: { 1: 4 } };
    const result = selectStreakDays(dayProgress, exercises, 3, NOW);
    expect(result).toEqual(['missed', 'done', 'today-in-progress']);
  });
});

describe('ruDayWord', () => {
  it('picks the right plural form', () => {
    expect(ruDayWord(1)).toBe('день');
    expect(ruDayWord(2)).toBe('дня');
    expect(ruDayWord(3)).toBe('дня');
    expect(ruDayWord(4)).toBe('дня');
    expect(ruDayWord(5)).toBe('дней');
    expect(ruDayWord(0)).toBe('дней');
    expect(ruDayWord(11)).toBe('дней');
    expect(ruDayWord(12)).toBe('дней');
    expect(ruDayWord(21)).toBe('день');
    expect(ruDayWord(22)).toBe('дня');
    expect(ruDayWord(25)).toBe('дней');
  });
});
