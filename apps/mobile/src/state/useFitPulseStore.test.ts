import {
  mergePersistedAppState,
  selectTodayMeals,
  selectYesterdayMealItems,
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
    const merged = mergePersistedAppState(
      { personalRecords: [1, 2, 3] as unknown as object },
      current
    );
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

  it('drops legacy coachMessages from persisted snapshots', () => {
    const current = baseline();
    const merged = mergePersistedAppState(
      { coachMessages: [{ id: 'x', role: 'user', text: 'hi' }] } as object,
      current
    );
    expect('coachMessages' in merged).toBe(false);
  });

  it('merges metabolic object onto current defaults', () => {
    const current = baseline();
    const merged = mergePersistedAppState({ metabolic: { type: 'refeed', endsAt: 123 } }, current);
    expect(merged.metabolic.type).toBe('refeed');
    expect(merged.metabolic.endsAt).toBe(123);
  });
});

describe('selectTodayMeals', () => {
  it('filters out food items from previous days', () => {
    const now = new Date(2026, 9, 10, 15, 0);
    const yesterday = new Date(2026, 9, 9, 12, 0).getTime();
    const today = new Date(2026, 9, 10, 8, 0).getTime();
    const meals = {
      breakfast: [
        { id: '1', name: 'old', kcal: 1, protein: 0, fat: 0, carbs: 0, loggedAt: yesterday },
        { id: '2', name: 'new', kcal: 1, protein: 0, fat: 0, carbs: 0, loggedAt: today }
      ],
      lunch: [],
      snack: [],
      dinner: []
    };
    const result = selectTodayMeals(meals, now);
    expect(result.breakfast).toHaveLength(1);
    expect(result.breakfast[0].id).toBe('2');
  });
});

describe('selectYesterdayMealItems', () => {
  it('returns only items logged yesterday for the given meal type', () => {
    const now = new Date(2026, 9, 10, 10, 0);
    const yesterday = new Date(2026, 9, 9, 8, 0).getTime();
    const today = new Date(2026, 9, 10, 8, 0).getTime();
    const meals = {
      breakfast: [
        { id: '1', name: 'oats', kcal: 1, protein: 0, fat: 0, carbs: 0, loggedAt: yesterday },
        { id: '2', name: 'today', kcal: 1, protein: 0, fat: 0, carbs: 0, loggedAt: today }
      ],
      lunch: [],
      snack: [],
      dinner: []
    };
    const result = selectYesterdayMealItems(meals, 'breakfast', now);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });
});

describe('copyFoodItems action', () => {
  it('appends copied items with fresh ids and current timestamp', () => {
    const { copyFoodItems } = useFitPulseStore.getState();
    const before = useFitPulseStore.getState().todayMeals.breakfast.length;
    copyFoodItems('breakfast', [
      { id: 'old-id', name: 'oats', kcal: 300, protein: 10, fat: 5, carbs: 50, loggedAt: 1 }
    ]);
    const after = useFitPulseStore.getState().todayMeals.breakfast;
    expect(after.length).toBe(before + 1);
    expect(after[after.length - 1].id).not.toBe('old-id');
  });
});

describe('saveMealAsTemplate / logSavedMeal', () => {
  it('saves a template without id/loggedAt and logs it with fresh values', () => {
    const { saveMealAsTemplate, logSavedMeal } = useFitPulseStore.getState();
    const template = saveMealAsTemplate('Мой завтрак', [
      { id: 'x', name: 'oats', kcal: 300, protein: 10, fat: 5, carbs: 50, loggedAt: 123 }
    ]);
    expect(template.items[0]).not.toHaveProperty('id');
    expect(template.items[0]).not.toHaveProperty('loggedAt');

    const beforeLen = useFitPulseStore.getState().todayMeals.lunch.length;
    logSavedMeal('lunch', template.id);
    const after = useFitPulseStore.getState().todayMeals.lunch;
    expect(after.length).toBe(beforeLen + 1);
    expect(after[after.length - 1].name).toBe('oats');
  });
});
