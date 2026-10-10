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
});
