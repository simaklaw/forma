import { filterImportedLibrary } from './importedLibraryFilter';
import type { ImportedExercise } from './importedExerciseLibrary.generated';
import { IMPORTED_EXERCISE_LIBRARY } from './importedExerciseLibrary.generated';

function sample(overrides: Partial<ImportedExercise> = {}): ImportedExercise {
  return {
    id: 'lib-sample',
    nameEn: 'Sample Push-Up',
    nameRu: 'Пример отжиманий',
    category: 'chest',
    equipment: 'bodyweight',
    level: 'beginner',
    primaryMuscles: ['chest'],
    instructionsEn: ['Down and up.'],
    instructionsRu: ['Вниз и вверх.'],
    imageKeys: [],
    sourceLicense: 'Unlicense',
    sourceUrl: 'https://example.com',
    ...overrides
  };
}

describe('filterImportedLibrary', () => {
  it('returns the full list when query and category are empty', () => {
    const items = [sample(), sample({ id: 'lib-2', nameEn: 'Plank', category: 'abs' })];
    expect(filterImportedLibrary(items, '', null)).toHaveLength(2);
  });

  it('filters by English name (case-insensitive)', () => {
    const items = [
      sample({ nameEn: 'Push-Up', nameRu: 'Отжимания' }),
      sample({ id: 'lib-plank', nameEn: 'Plank', nameRu: 'Планка', category: 'abs' })
    ];
    const result = filterImportedLibrary(items, 'push-up', null);
    expect(result).toHaveLength(1);
    expect(result[0].nameEn).toBe('Push-Up');
  });

  it('filters by Russian name', () => {
    const items = [
      sample({ nameEn: 'Push-Up', nameRu: 'Отжимания' }),
      sample({ id: 'lib-plank', nameEn: 'Plank', nameRu: 'Планка', category: 'abs' })
    ];
    const result = filterImportedLibrary(items, 'планк', null);
    expect(result).toHaveLength(1);
    expect(result[0].nameEn).toBe('Plank');
  });

  it('returns empty list for a query matching nothing', () => {
    const items = [sample()];
    expect(filterImportedLibrary(items, 'zzzznonexistentexercisezzzz', null)).toHaveLength(0);
  });

  it('filters by category', () => {
    const items = [
      sample({ category: 'chest' }),
      sample({ id: 'lib-abs', nameEn: 'Crunch', category: 'abs' })
    ];
    const result = filterImportedLibrary(items, '', 'abs');
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('abs');
  });

  it('generated library is non-empty (smoke)', () => {
    expect(IMPORTED_EXERCISE_LIBRARY.length).toBeGreaterThan(0);
    const all = filterImportedLibrary(IMPORTED_EXERCISE_LIBRARY, '', null);
    expect(all.length).toBe(IMPORTED_EXERCISE_LIBRARY.length);
  });

  it('every generated entry has non-empty Russian instructions (smoke)', () => {
    for (const ex of IMPORTED_EXERCISE_LIBRARY) {
      expect(ex.instructionsRu.length).toBeGreaterThan(0);
    }
  });

  it('filters by level', () => {
    const items = [sample(), sample({ id: 'lib-2', nameEn: 'Expert thing', level: 'expert' })];
    const result = filterImportedLibrary(items, '', null, { level: 'expert' });
    expect(result).toHaveLength(1);
    expect(result[0].level).toBe('expert');
  });

  it('filters by equipment', () => {
    const items = [sample(), sample({ id: 'lib-2', nameEn: 'Bench press', equipment: 'barbell' })];
    const result = filterImportedLibrary(items, '', null, { equipment: 'barbell' });
    expect(result).toHaveLength(1);
    expect(result[0].equipment).toBe('barbell');
  });

  it('combines category, level and equipment filters', () => {
    const items = [
      sample(),
      sample({
        id: 'lib-2',
        nameEn: 'Press',
        category: 'chest',
        equipment: 'dumbbells',
        level: 'beginner'
      }),
      sample({
        id: 'lib-3',
        nameEn: 'Row',
        category: 'back',
        equipment: 'dumbbells',
        level: 'beginner'
      })
    ];
    const result = filterImportedLibrary(items, '', 'chest', {
      level: 'beginner',
      equipment: 'dumbbells'
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('lib-2');
  });

  it('generated library includes gym equipment (phase 4 smoke)', () => {
    const gymEquipment = new Set([
      'dumbbells',
      'barbell',
      'cable',
      'machine',
      'kettlebell',
      'ez-bar'
    ]);
    const gymEntries = IMPORTED_EXERCISE_LIBRARY.filter((ex) => gymEquipment.has(ex.equipment));
    expect(gymEntries.length).toBeGreaterThanOrEqual(60);
    for (const ex of gymEntries) {
      expect(ex.imageKeys).toHaveLength(0);
      expect(ex.nameRu).toBeTruthy();
    }
  });

  it('generated library keeps home entries first (order stability)', () => {
    const first = IMPORTED_EXERCISE_LIBRARY[0];
    expect(first.equipment).toBe('bodyweight');
    const gymEquipment = new Set([
      'dumbbells',
      'barbell',
      'cable',
      'machine',
      'kettlebell',
      'ez-bar'
    ]);
    const firstGymIndex = IMPORTED_EXERCISE_LIBRARY.findIndex((ex) =>
      gymEquipment.has(ex.equipment)
    );
    expect(firstGymIndex).toBeGreaterThanOrEqual(90);
  });

  it('finds multi-word exercises regardless of separators', () => {
    const items = [
      sample({ nameEn: 'Push-Up', nameRu: 'Отжимания' }),
      sample({ id: 'lib-plank', nameEn: 'Plank', nameRu: 'Планка', category: 'abs' })
    ];
    expect(filterImportedLibrary(items, 'push up', null)).toHaveLength(1);
  });

  it('ignores diacritics and ё/е when matching', () => {
    const items = [sample({ nameEn: 'Barbell Overhead Press', nameRu: 'Подъём штанги' })];
    expect(filterImportedLibrary(items, 'подъем', null)).toHaveLength(1);
  });

  it('requires all tokens to match (AND search)', () => {
    const items = [sample({ nameEn: 'Push-Up', nameRu: 'Отжимания' })];
    expect(filterImportedLibrary(items, 'push планка', null)).toHaveLength(0);
  });

  it('searches across English and Russian fields with one query', () => {
    const items = [sample({ nameEn: 'Push-Up', nameRu: 'Отжимания' })];
    expect(filterImportedLibrary(items, 'отжимания', null)).toHaveLength(1);
  });
});
