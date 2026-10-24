import { GYM_PLAN } from './gymPlan';
import { WORKOUT_PLAN } from './bodyweightPlan';
import {
  TIMED_PLAN_EXERCISE_IDS,
  formatPlanAmount,
  measureForPlanExercise
} from './exerciseMeasures';

describe('exerciseMeasures', () => {
  it('marks exactly the plan exercises logged in seconds', () => {
    expect(TIMED_PLAN_EXERCISE_IDS).toEqual([15, 17, 61]);
  });

  it('resolves seconds for timed ids and reps otherwise', () => {
    expect(measureForPlanExercise(15)).toBe('seconds');
    expect(measureForPlanExercise(17)).toBe('seconds');
    expect(measureForPlanExercise(61)).toBe('seconds');
    expect(measureForPlanExercise(10)).toBe('reps');
    expect(measureForPlanExercise(36)).toBe('reps');
    expect(measureForPlanExercise(999999)).toBe('reps');
  });

  it('timed plan exercises are static holds with sane second targets', () => {
    const all = [...GYM_PLAN, ...WORKOUT_PLAN].flatMap((day) => day.exercises);
    for (const ex of all) {
      if (measureForPlanExercise(ex.id) !== 'seconds') continue;
      expect(ex.workingWeight).toBe(0);
      expect(ex.workingReps).toBeGreaterThanOrEqual(15);
      expect(ex.workingReps % 5).toBe(0);
      expect(ex.totalSets).toBeGreaterThan(0);
    }
  });

  it('formats amounts with the seconds unit only for timed sets', () => {
    expect(formatPlanAmount('seconds', 40, 'с')).toBe('40с');
    expect(formatPlanAmount('reps', 12, 'с')).toBe('12');
  });
});
