import {
  MUSCLE_GROUP_MUSCLES,
  datasetMusclesForGroups,
  muscleGroupLabel,
  type MusclePickerGroupKey
} from './musclePickerGroups';
import { MUSCLE_MAP_GROUPS } from './musclePickerShapes.generated';

// 17 мышц словаря yuhonas/free-exercise-db (primary/secondary)
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

describe('musclePickerGroups', () => {
  it('every map group maps to at least one known dataset muscle', () => {
    for (const muscles of Object.values(MUSCLE_GROUP_MUSCLES)) {
      expect(muscles.length).toBeGreaterThan(0);
      for (const muscle of muscles) {
        expect(DATASET_MUSCLES.has(muscle)).toBe(true);
      }
    }
  });

  it('datasetMusclesForGroups deduplicates overlapping groups', () => {
    expect(datasetMusclesForGroups(['abdominals', 'obliques'])).toEqual(['abdominals']);
  });

  it('generated map groups match the group registry (13 groups, render order)', () => {
    expect(MUSCLE_MAP_GROUPS).toHaveLength(13);
    expect(MUSCLE_MAP_GROUPS.map((g) => g.key)).toEqual(Object.keys(MUSCLE_GROUP_MUSCLES));
  });

  it('labels are non-empty in both languages', () => {
    const keys = Object.keys(MUSCLE_GROUP_MUSCLES) as MusclePickerGroupKey[];
    for (const key of keys) {
      expect(muscleGroupLabel(key, 'ru')).not.toBe('');
      expect(muscleGroupLabel(key, 'en')).not.toBe('');
    }
  });
});
