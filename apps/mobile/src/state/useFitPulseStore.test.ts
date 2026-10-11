import {
  mergePersistedAppState,
  selectTodayMeals,
  selectYesterdayMealItems,
  useFitPulseStore,
  type BodyMeasurementEntry,
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
    const beforeTime = Date.now();
    copyFoodItems('breakfast', [
      { id: 'old-id', name: 'oats', kcal: 300, protein: 10, fat: 5, carbs: 50, loggedAt: 1 }
    ]);
    const afterTime = Date.now();
    const after = useFitPulseStore.getState().todayMeals.breakfast;
    expect(after.length).toBe(before + 1);
    expect(after[after.length - 1].id).not.toBe('old-id');
    expect(after[after.length - 1].loggedAt).toBeGreaterThanOrEqual(beforeTime);
    expect(after[after.length - 1].loggedAt).toBeLessThanOrEqual(afterTime);
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

describe('focusAreas in profile', () => {
  const initialProfile = useFitPulseStore.getInitialState().profile;

  beforeEach(() => {
    useFitPulseStore.setState({ profile: initialProfile });
  });

  afterEach(() => {
    useFitPulseStore.setState({ profile: initialProfile });
  });

  it('defaults to no focus areas for new and legacy profiles', () => {
    expect(useFitPulseStore.getState().profile.focusAreas).toEqual([]);
    const merged = mergePersistedAppState({ profile: { weight: 75 } }, baseline());
    expect(merged.profile.focusAreas).toEqual([]);
    expect(merged.profile.weight).toBe(75);
  });

  it('saves focus areas and preserves them when another profile field changes', () => {
    const { updateProfile } = useFitPulseStore.getState();
    updateProfile({ focusAreas: ['chest', 'glutes'] });
    updateProfile({ weight: 80 });
    expect(useFitPulseStore.getState().profile.focusAreas).toEqual(['chest', 'glutes']);
    updateProfile({ focusAreas: [] });
    expect(useFitPulseStore.getState().profile.focusAreas).toEqual([]);
  });

  it('restores valid focus areas and drops unknown values from storage', () => {
    const merged = mergePersistedAppState(
      { profile: { focusAreas: ['chest', 'invalid-key', null, 42, 'glutes'] } },
      baseline()
    );
    expect(merged.profile.focusAreas).toEqual(['chest', 'glutes']);
  });

  it.each([null, 'chest', { chest: true }])(
    'handles malformed stored focus areas: %p',
    (focusAreas) => {
      const merged = mergePersistedAppState({ profile: { focusAreas } }, baseline());
      expect(merged.profile.focusAreas).toEqual([]);
    }
  );
});

describe('logBodyMeasurement / deleteBodyMeasurement', () => {
  const originalState = useFitPulseStore.getState();

  afterEach(() => {
    useFitPulseStore.setState(originalState, true);
  });

  beforeEach(() => {
    useFitPulseStore.setState({ bodyMeasurements: [], weightHistory: [] });
  });

  it('adds a measurement entry with today dateKey', () => {
    const { logBodyMeasurement } = useFitPulseStore.getState();
    const before = useFitPulseStore.getState().bodyMeasurements.length;
    logBodyMeasurement('waist', 82);
    const after = useFitPulseStore.getState().bodyMeasurements;
    expect(after.length).toBe(before + 1);
    expect(after[after.length - 1]).toMatchObject({ type: 'waist', valueCm: 82 });
    expect(after[after.length - 1].id).toEqual(expect.any(String));
    expect(after[after.length - 1].dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('ignores non-positive or invalid values', () => {
    const { logBodyMeasurement } = useFitPulseStore.getState();
    const before = useFitPulseStore.getState().bodyMeasurements.length;
    logBodyMeasurement('waist', -5);
    logBodyMeasurement('waist', NaN);
    logBodyMeasurement('waist', 0);
    logBodyMeasurement('waist', Infinity);
    expect(useFitPulseStore.getState().bodyMeasurements.length).toBe(before);
  });

  it('deletes a measurement by id', () => {
    const { logBodyMeasurement, deleteBodyMeasurement } = useFitPulseStore.getState();
    logBodyMeasurement('chest', 100);
    const entries = useFitPulseStore.getState().bodyMeasurements;
    const id = entries[entries.length - 1].id;
    deleteBodyMeasurement(id);
    expect(useFitPulseStore.getState().bodyMeasurements.some((e) => e.id === id)).toBe(false);
  });

  it('does not touch weightHistory or logWeight behavior', () => {
    const { logWeight, logBodyMeasurement } = useFitPulseStore.getState();
    const beforeWeight = useFitPulseStore.getState().weightHistory.length;
    logBodyMeasurement('waist', 80);
    expect(useFitPulseStore.getState().weightHistory.length).toBe(beforeWeight);
    logWeight(75);
    expect(useFitPulseStore.getState().weightHistory.length).toBe(beforeWeight + 1);
  });
});

describe('body measurement persistence and import', () => {
  const originalState = useFitPulseStore.getState();
  const entry: BodyMeasurementEntry = {
    id: 'measurement-1',
    type: 'waist',
    valueCm: 82.5,
    dateKey: '2026-10-11'
  };

  beforeEach(() => {
    useFitPulseStore.setState({ bodyMeasurements: [entry], weightHistory: [75, 74] });
  });

  afterEach(() => {
    useFitPulseStore.setState(originalState, true);
  });

  it('restores valid entries, accepts an empty history and preserves legacy backups', () => {
    const state = baseline();
    expect(mergePersistedAppState({ bodyMeasurements: [entry] }, state).bodyMeasurements).toEqual([
      entry
    ]);
    expect(mergePersistedAppState({}, state).bodyMeasurements).toEqual([entry]);
    expect(mergePersistedAppState({}, useFitPulseStore.getInitialState()).bodyMeasurements).toEqual(
      []
    );
    state.hydrate({ bodyMeasurements: [] });
    expect(baseline().bodyMeasurements).toEqual([]);
    state.hydrate({ bodyMeasurements: [entry] });
    expect(baseline().bodyMeasurements).toEqual([entry]);
    expect(baseline().weightHistory).toEqual([75, 74]);
  });

  it('retains the latest 200 entries on logging, persistence and import', () => {
    const entries = Array.from({ length: 205 }, (_, i) => ({ ...entry, id: `m-${i}` }));
    expect(
      mergePersistedAppState({ bodyMeasurements: entries }, baseline()).bodyMeasurements
    ).toEqual(entries.slice(-200));
    baseline().hydrate({ bodyMeasurements: entries });
    expect(baseline().bodyMeasurements).toEqual(entries.slice(-200));
    baseline().logBodyMeasurement('neck', 35);
    expect(baseline().bodyMeasurements).toHaveLength(200);
    expect(baseline().bodyMeasurements[0].id).toBe('m-6');
    expect(baseline().weightHistory).toEqual([75, 74]);
  });

  it.each([
    null,
    'invalid',
    [null],
    [{}],
    [{ ...entry, id: '' }],
    [{ ...entry, type: 'unknown' }],
    [{ ...entry, type: 'toString' }],
    [{ ...entry, valueCm: -1 }],
    [{ ...entry, valueCm: Infinity }],
    [{ ...entry, dateKey: '2026-02-30' }],
    [{ ...entry, dateKey: 'bad' }],
    [entry, entry]
  ])('rejects malformed history without replacing current measurements: %p', (value) => {
    expect(
      mergePersistedAppState({ bodyMeasurements: value }, baseline()).bodyMeasurements
    ).toEqual([entry]);
    const data = { bodyMeasurements: value } as Parameters<typeof originalState.hydrate>[0];
    expect(() => baseline().hydrate(data)).toThrow('Backup file has none of the expected fields');
    expect(baseline().bodyMeasurements).toEqual([entry]);
    expect(baseline().weightHistory).toEqual([75, 74]);
  });
});
