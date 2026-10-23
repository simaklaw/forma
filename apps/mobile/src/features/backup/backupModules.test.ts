import { buildBackupDocument, parseBackupDocument, type BackupState } from './backupModules';

function fakeState(): Partial<BackupState> {
  return {
    profile: { sex: 'male', age: 30, height: 180, weight: 80, pal: 1.375, goal: 'maintain', focusAreas: [] },
    metabolic: { type: null, endsAt: null },
    todayMeals: { breakfast: [], lunch: [], snack: [], dinner: [] },
    customFoods: [],
    savedMeals: [],
    waterGlasses: 6,
    setLogs: [],
    importedActivities: [],
    dayProgress: {},
    personalRecords: {},
    weightHistory: [80],
    bodyMeasurements: []
  };
}

describe('buildBackupDocument', () => {
  it('includes only selected modules with their store fields', () => {
    const doc = buildBackupDocument(
      ['profile', 'nutrition'],
      fakeState(),
      new Date('2026-10-23T00:00:00Z')
    );
    expect(Object.keys(doc.modules).sort()).toEqual(['nutrition', 'profile']);
    expect(Object.keys(doc.modules.profile ?? {}).sort()).toEqual(['metabolic', 'profile']);
    expect(Object.keys(doc.modules.nutrition ?? {}).sort()).toEqual([
      'customFoods',
      'savedMeals',
      'todayMeals',
      'waterGlasses'
    ]);
    expect(doc.modules.profile?.metabolic).toEqual({ type: null, endsAt: null });
    expect(doc.modules.nutrition?.waterGlasses).toBe(6);
    expect(doc.format).toBe('fitpulse-backup');
    expect(doc.version).toBe(2);
    expect(doc.exportedAt).toBe('2026-10-23T00:00:00.000Z');
  });

  it('omits modules that were not selected', () => {
    const doc = buildBackupDocument(['body'], fakeState());
    expect(Object.keys(doc.modules)).toEqual(['body']);
    expect(doc.modules.body?.weightHistory).toEqual([80]);
    expect(doc.modules.workout).toBeUndefined();
  });
});

describe('parseBackupDocument', () => {
  it('round-trips a modular backup', () => {
    const doc = buildBackupDocument(['profile', 'workout'], fakeState());
    const parsed = parseBackupDocument(JSON.stringify(doc));
    expect(parsed.kind).toBe('modular');
    if (parsed.kind !== 'modular') throw new Error('unreachable');
    expect(Object.keys(parsed.modules).sort()).toEqual(['profile', 'workout']);
    expect(parsed.modules.profile?.metabolic).toEqual({ type: null, endsAt: null });
  });

  it('keeps only known modules from a modular file', () => {
    const text = JSON.stringify({
      format: 'fitpulse-backup',
      version: 2,
      exportedAt: '2026-10-23T00:00:00.000Z',
      modules: { profile: { profile: { sex: 'male' } }, junk: { nope: 1 } }
    });
    const parsed = parseBackupDocument(text);
    expect(parsed.kind).toBe('modular');
    if (parsed.kind !== 'modular') throw new Error('unreachable');
    expect(Object.keys(parsed.modules)).toEqual(['profile']);
  });

  it('detects a legacy full dump by top-level profile field', () => {
    const parsed = parseBackupDocument(
      JSON.stringify({ profile: { sex: 'male' }, waterGlasses: 3 })
    );
    expect(parsed.kind).toBe('legacy');
    if (parsed.kind !== 'legacy') throw new Error('unreachable');
    expect(parsed.data.waterGlasses).toBe(3);
  });

  it('rejects invalid payloads with the store error text', () => {
    expect(() => parseBackupDocument('not json')).toThrow(
      'Backup file has none of the expected fields'
    );
    expect(() => parseBackupDocument('[]')).toThrow('Backup file has none of the expected fields');
    expect(() => parseBackupDocument('{}')).toThrow('Backup file has none of the expected fields');
    expect(() =>
      parseBackupDocument(JSON.stringify({ format: 'fitpulse-backup', version: 2, modules: {} }))
    ).toThrow('Backup file has none of the expected fields');
  });
});
