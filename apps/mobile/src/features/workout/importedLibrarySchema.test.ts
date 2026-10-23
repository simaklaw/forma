import { IMPORTED_EXERCISE_LIBRARY } from './importedExerciseLibrary.generated';

/**
 * CI-гейт сгенерированной библиотеки: скрипт scripts/import-exercise-db.mjs
 * импортирует датасет yuhonas/free-exercise-db, а этот тест фиксирует схему
 * результата — enum-ы домены датасета (в синхроне с validateDataset в
 * scripts/lib/exerciseImportRules.mjs), провенанс и договорённость по медиа.
 */

const DATASET_CATEGORIES = new Set([
  'strength',
  'stretching',
  'cardio',
  'plyometrics',
  'powerlifting',
  'olympic weightlifting',
  'strongman'
]);
const FORMA_CATEGORIES = new Set(['chest', 'back', 'legs', 'abs', 'arms', 'glutes']);
const LEVELS = new Set(['beginner', 'intermediate', 'expert']);
const FORCES = new Set(['push', 'pull', 'static']);
const MECHANICS = new Set(['isolation', 'compound']);
const EQUIPMENT = new Set([
  'bodyweight',
  'bands',
  'dumbbells',
  'barbell',
  'cable',
  'machine',
  'kettlebell',
  'ez-bar'
]);
const DATASET_MUSCLES = new Set([
  'abdominals',
  'hamstrings',
  'adductors',
  'quadriceps',
  'biceps',
  'shoulders',
  'chest',
  'middle back',
  'calves',
  'glutes',
  'lower back',
  'lats',
  'triceps',
  'traps',
  'forearms',
  'neck',
  'abductors'
]);
const SOURCE_URL_PATTERN =
  /^https:\/\/github\.com\/yuhonas\/free-exercise-db\/blob\/main\/exercises\/[0-9a-zA-Z_-]+\.json$/;

const HOME_EQUIPMENT = new Set(['bodyweight', 'bands']);

describe('imported exercise library schema (generated-file gate)', () => {
  it('is a large, non-empty library', () => {
    expect(IMPORTED_EXERCISE_LIBRARY.length).toBeGreaterThanOrEqual(500);
  });

  it('ids are unique and follow the lib-<slug> pattern', () => {
    const seen = new Set<string>();
    for (const ex of IMPORTED_EXERCISE_LIBRARY) {
      expect(seen.has(ex.id)).toBe(false);
      seen.add(ex.id);
      expect(ex.id).toMatch(/^lib-[a-z0-9]+(-[a-z0-9]+)*$/);
    }
    expect(seen.size).toBe(IMPORTED_EXERCISE_LIBRARY.length);
  });

  it('datasetCategory / level / force / mechanic stay within the upstream enums', () => {
    for (const ex of IMPORTED_EXERCISE_LIBRARY) {
      expect(DATASET_CATEGORIES.has(ex.datasetCategory)).toBe(true);
      expect(FORMA_CATEGORIES.has(ex.category)).toBe(true);
      expect(LEVELS.has(ex.level ?? '')).toBe(true);
      if (ex.force != null) {
        expect(FORCES.has(ex.force)).toBe(true);
      }
      if (ex.mechanic != null) {
        expect(MECHANICS.has(ex.mechanic)).toBe(true);
      }
    }
  });

  it('equipment maps only into the forma union', () => {
    for (const ex of IMPORTED_EXERCISE_LIBRARY) {
      expect(EQUIPMENT.has(ex.equipment)).toBe(true);
    }
  });

  it('muscles come from the dataset dictionary (primary non-empty)', () => {
    for (const ex of IMPORTED_EXERCISE_LIBRARY) {
      expect(ex.primaryMuscles.length).toBeGreaterThan(0);
      for (const m of ex.primaryMuscles) {
        expect(DATASET_MUSCLES.has(m)).toBe(true);
      }
      for (const m of ex.secondaryMuscles) {
        expect(DATASET_MUSCLES.has(m)).toBe(true);
      }
    }
  });

  it('provenance is filled for every entry', () => {
    for (const ex of IMPORTED_EXERCISE_LIBRARY) {
      expect(ex.sourceLicense).toBe('Unlicense');
      expect(ex.sourceUrl).toMatch(SOURCE_URL_PATTERN);
    }
  });

  it('nameRu is a non-empty string or null (never empty/garbage)', () => {
    for (const ex of IMPORTED_EXERCISE_LIBRARY) {
      if (ex.nameRu != null) {
        expect(ex.nameRu.length).toBeGreaterThan(0);
      }
    }
  });

  it('home entries carry dataset imageKeys; gym entries stay media-empty by design', () => {
    // Договорённость с владельцем: тренажерные записи идут без датасет-фото
    // (imageKeys = []), владелец готовит собственные иллюстрации. Домашние
    // записи сохраняют датасет-фото с ключами <slug>-<idx>.
    for (const ex of IMPORTED_EXERCISE_LIBRARY) {
      if (HOME_EQUIPMENT.has(ex.equipment)) {
        const slug = ex.id.slice('lib-'.length);
        for (const key of ex.imageKeys) {
          expect(key).toMatch(new RegExp(`^${slug}-\\d+$`));
        }
      } else {
        expect(ex.imageKeys).toHaveLength(0);
      }
    }
  });

  it('keeps the two-block order: home first, gym after (bridge id stability)', () => {
    const firstGymIndex = IMPORTED_EXERCISE_LIBRARY.findIndex(
      (ex) => !HOME_EQUIPMENT.has(ex.equipment)
    );
    expect(firstGymIndex).toBeGreaterThanOrEqual(90);
    for (let i = firstGymIndex; i < IMPORTED_EXERCISE_LIBRARY.length; i++) {
      expect(HOME_EQUIPMENT.has(IMPORTED_EXERCISE_LIBRARY[i].equipment)).toBe(false);
    }
  });
});
