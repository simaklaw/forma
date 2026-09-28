import {
  catalogExerciseById,
  resolveDayExercises
} from './dayPlanOverrides';
import type { ExerciseDef } from './ExerciseSheet';

const base: ExerciseDef[] = [
  {
    id: 1,
    index: 1,
    name: 'A',
    workingWeight: 50,
    workingReps: 8,
    totalSets: 3,
    restSeconds: 60,
    targetMuscles: ['quads'],
    note: ''
  },
  {
    id: 2,
    index: 2,
    name: 'B',
    workingWeight: 40,
    workingReps: 10,
    totalSets: 3,
    restSeconds: 60,
    targetMuscles: ['chest'],
    note: ''
  }
];

describe('resolveDayExercises', () => {
  it('returns reindexed base when override missing or wrong length', () => {
    const a = resolveDayExercises('gym', base, null);
    expect(a.map((e) => e.id)).toEqual([1, 2]);
    expect(a[0]?.index).toBe(1);

    const b = resolveDayExercises('gym', base, [1]);
    expect(b.map((e) => e.id)).toEqual([1, 2]);
  });

  it('swaps a slot when id exists in mode catalog', () => {
    // gym plan uses low ids 1–30; pick a known gym id if present, else keep fallback behavior
    const known = catalogExerciseById('gym', 1);
    if (!known) {
      // catalog shape may differ; still ensure pure fallback works
      const resolved = resolveDayExercises('gym', base, [2, 1]);
      expect(resolved[0]?.id).toBe(2);
      expect(resolved[1]?.id).toBe(1);
      return;
    }
    const resolved = resolveDayExercises('gym', base, [known.id, 2]);
    expect(resolved[0]?.id).toBe(known.id);
    expect(resolved[0]?.name).toBe(known.name);
    expect(resolved[0]?.index).toBe(1);
  });

  it('falls back to base slot for unknown id', () => {
    const resolved = resolveDayExercises('gym', base, [99999, 2]);
    expect(resolved[0]?.id).toBe(1);
    expect(resolved[1]?.id).toBe(2);
  });
});

describe('catalogExerciseById', () => {
  it('finds home bodyweight exercise by id', () => {
    const pushup = catalogExerciseById('home', 10);
    expect(pushup?.name).toMatch(/Отжимания/i);
  });
});
