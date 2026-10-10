import {
  mergePersistedAppState,
  useFitPulseStore,
  type SetLogEntry
} from './useFitPulseStore';

function baseline() {
  return useFitPulseStore.getState();
}

describe('mergePersistedAppState', () => {
  it('falls back to defaults when setLogs is a malformed shape', () => {
    const current = baseline();
    const good: SetLogEntry[] = current.setLogs;
    const merged = mergePersistedAppState({ setLogs: 'not-an-array' }, current);
    expect(Array.isArray(merged.setLogs)).toBe(true);
    expect(merged.setLogs).toEqual(good);
  });

  it('accepts a valid setLogs array from storage', () => {
    const current = baseline();
    const logs: SetLogEntry[] = [
      {
        id: 'log-1',
        exerciseId: 1,
        weight: 60,
        reps: 8,
        rir: 2,
        dateKey: '2026-10-10'
      }
    ];
    const merged = mergePersistedAppState({ setLogs: logs }, current);
    expect(merged.setLogs).toEqual(logs);
  });

  it('falls back when dayProgress is an array instead of a record', () => {
    const current = baseline();
    const merged = mergePersistedAppState({ dayProgress: [] as unknown as object }, current);
    expect(Array.isArray(merged.dayProgress)).toBe(false);
    expect(merged.dayProgress).toEqual(current.dayProgress);
  });

  it('falls back when personalRecords is not a plain object', () => {
    const current = baseline();
    const merged = mergePersistedAppState({ personalRecords: [1, 2, 3] as unknown as object }, current);
    expect(Array.isArray(merged.personalRecords)).toBe(false);
    expect(merged.personalRecords).toEqual(current.personalRecords);
  });

  it('falls back when waterGlasses is not a number', () => {
    const current = baseline();
    const merged = mergePersistedAppState({ waterGlasses: 'three' as unknown as number }, current);
    expect(merged.waterGlasses).toBe(current.waterGlasses);
  });

  it('falls back when todayMeals is not a DayMeals shape', () => {
    const current = baseline();
    const merged = mergePersistedAppState({ todayMeals: [] as unknown as object }, current);
    expect(Array.isArray(merged.todayMeals)).toBe(false);
    expect(merged.todayMeals).toEqual(current.todayMeals);
  });

  it('merges metabolic object onto current defaults', () => {
    const current = baseline();
    const merged = mergePersistedAppState(
      { metabolic: { type: 'refeed', endsAt: 123 } },
      current
    );
    expect(merged.metabolic.type).toBe('refeed');
    expect(merged.metabolic.endsAt).toBe(123);
  });
});
