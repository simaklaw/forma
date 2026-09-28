import type { ExerciseDef } from '../ExerciseSheet';
import {
  contentHashForExercises,
  exercisesToSnapshots,
  PLAN_REVISION
} from './planToSnapshots';

const sample: ExerciseDef[] = [
  {
    id: 1,
    index: 1,
    name: 'Squat',
    workingWeight: 80,
    workingReps: 8,
    totalSets: 2,
    restSeconds: 60,
    targetMuscles: ['quads'],
    note: 'test'
  }
];

describe('planToSnapshots', () => {
  it('embeds PLAN_REVISION in exerciseRevisionId', () => {
    const steps = exercisesToSnapshots(sample, 78);
    expect(steps[0]?.exerciseRevisionId).toBe(`local-ex-1-${PLAN_REVISION}`);
    expect(steps[0]?.targetWeightKg).toBe(80);
  });

  it('prefixes content hash with plan revision', () => {
    const hash = contentHashForExercises(sample, 78);
    expect(hash.startsWith(`${PLAN_REVISION}:`)).toBe(true);
  });

  it('is stable for identical inputs', () => {
    expect(contentHashForExercises(sample, 78)).toBe(contentHashForExercises(sample, 78));
  });
});
