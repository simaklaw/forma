import { GYM_PLAN } from './gymPlan';
import { WORKOUT_PLAN } from './bodyweightPlan';
import {
  PLAN_PATTERNS,
  allExercisePatterns,
  patternFromImportedName
} from './exercisePatterns';

const VALID_PATTERNS = [
  'squat',
  'hinge',
  'push_horizontal',
  'push_vertical',
  'pull_horizontal',
  'pull_vertical',
  'core',
  'isolation'
];

const planIds = (): number[] => [
  ...GYM_PLAN.flatMap((day) => day.exercises.map((ex) => ex.id)),
  ...WORKOUT_PLAN.flatMap((day) => day.exercises.map((ex) => ex.id))
];

describe('PLAN_PATTERNS', () => {
  it('covers exactly the plan exercise ids', () => {
    const ids = planIds().sort((a, b) => a - b);
    const mapped = Object.keys(PLAN_PATTERNS).map(Number).sort((a, b) => a - b);
    expect(ids).toEqual(mapped);
  });

  it('uses only valid movement patterns', () => {
    for (const pattern of Object.values(PLAN_PATTERNS)) {
      expect(VALID_PATTERNS).toContain(pattern);
    }
  });

  it('maps key plan exercises to expected patterns', () => {
    expect(PLAN_PATTERNS[4]).toBe('push_horizontal');
    expect(PLAN_PATTERNS[8]).toBe('pull_vertical');
    expect(PLAN_PATTERNS[2]).toBe('hinge');
    expect(PLAN_PATTERNS[15]).toBe('core');
    expect(PLAN_PATTERNS[41]).toBe('isolation');
  });
});

describe('patternFromImportedName', () => {
  it('classifies common library names', () => {
    expect(patternFromImportedName('Barbell Bench Press')).toBe('push_horizontal');
    expect(patternFromImportedName('Lat Pulldown')).toBe('pull_vertical');
    expect(patternFromImportedName('Barbell Squat')).toBe('squat');
    expect(patternFromImportedName('Romanian Deadlift')).toBe('hinge');
    expect(patternFromImportedName('Shoulder Press')).toBe('push_vertical');
    expect(patternFromImportedName('Seated Cable Row')).toBe('pull_horizontal');
    expect(patternFromImportedName('Plank')).toBe('core');
  });

  it('falls back to isolation', () => {
    expect(patternFromImportedName('Barbell Curl')).toBe('isolation');
    expect(patternFromImportedName('Lateral Raise')).toBe('isolation');
  });
});

describe('allExercisePatterns', () => {
  it('covers plan ids and imported library ids', () => {
    const all = allExercisePatterns();
    for (const id of planIds()) {
      expect(all[id]).toBeDefined();
    }
    const planIdSet = new Set(planIds());
    const importedIds = Object.keys(all)
      .map(Number)
      .filter((id) => !planIdSet.has(id));
    expect(importedIds.length).toBeGreaterThan(100);
    for (const id of importedIds.slice(0, 50)) {
      expect(VALID_PATTERNS).toContain(all[id]);
    }
  });
});
