import {
  evaluateExerciseGoal,
  normalizeGoals,
  parseTargetWeightKg,
  type GoalSetLog
} from './exerciseGoals';

function log(exerciseId: number, dateKey: string, weight: number): GoalSetLog {
  return { exerciseId, dateKey, weight };
}

describe('parseTargetWeightKg', () => {
  it('целое и дробное с точкой', () => {
    expect(parseTargetWeightKg('80')).toBe(80);
    expect(parseTargetWeightKg('72.5')).toBe(72.5);
  });

  it('запятая вместо точки, пробелы по краям', () => {
    expect(parseTargetWeightKg(' 72,5 ')).toBe(72.5);
  });

  it('округление до 0,1 кг', () => {
    expect(parseTargetWeightKg('60.26')).toBe(60.3);
  });

  it('мусор, пустая строка, ноль и отрицательные → null', () => {
    expect(parseTargetWeightKg('abc')).toBeNull();
    expect(parseTargetWeightKg('')).toBeNull();
    expect(parseTargetWeightKg('0')).toBeNull();
    expect(parseTargetWeightKg('-5')).toBeNull();
  });
});

describe('normalizeGoals', () => {
  it('не массив → пустой список', () => {
    expect(normalizeGoals(undefined)).toEqual([]);
    expect(normalizeGoals({ goals: [] })).toEqual([]);
  });

  it('отбрасывает битые записи, валидные остаются', () => {
    const out = normalizeGoals([
      { exerciseId: 10, targetWeightKg: 100, createdAt: 3 },
      { exerciseId: 'x', targetWeightKg: 100, createdAt: 1 },
      { exerciseId: 11, targetWeightKg: -1, createdAt: 2 },
      { exerciseId: 12, targetWeightKg: 80 },
      null
    ]);
    expect(out).toEqual([
      { exerciseId: 12, targetWeightKg: 80, createdAt: 0 },
      { exerciseId: 10, targetWeightKg: 100, createdAt: 3 }
    ]);
  });

  it('дубли по exerciseId: выигрывает последняя запись', () => {
    const out = normalizeGoals([
      { exerciseId: 10, targetWeightKg: 90, createdAt: 1 },
      { exerciseId: 10, targetWeightKg: 100, createdAt: 2 }
    ]);
    expect(out).toEqual([{ exerciseId: 10, targetWeightKg: 100, createdAt: 2 }]);
  });

  it('сортировка по createdAt', () => {
    const out = normalizeGoals([
      { exerciseId: 3, targetWeightKg: 50, createdAt: 30 },
      { exerciseId: 1, targetWeightKg: 60, createdAt: 10 },
      { exerciseId: 2, targetWeightKg: 70, createdAt: 20 }
    ]);
    expect(out.map((g) => g.exerciseId)).toEqual([1, 2, 3]);
  });
});

describe('evaluateExerciseGoal', () => {
  const goal = { exerciseId: 10, targetWeightKg: 100 };

  it('нет подходов: рекорд 0, прогресс 0, не достигнута', () => {
    const v = evaluateExerciseGoal([], goal);
    expect(v.bestWeightKg).toBe(0);
    expect(v.bestDateKey).toBeNull();
    expect(v.progressPct).toBe(0);
    expect(v.remainingKg).toBe(100);
    expect(v.reached).toBe(false);
  });

  it('чужие упражнения не учитываются', () => {
    const v = evaluateExerciseGoal([log(11, '2026-10-28', 150)], goal);
    expect(v.bestWeightKg).toBe(0);
    expect(v.reached).toBe(false);
  });

  it('лучший вес и его дата', () => {
    const v = evaluateExerciseGoal(
      [log(10, '2026-10-20', 60), log(10, '2026-10-28', 80), log(10, '2026-10-27', 70)],
      goal
    );
    expect(v.bestWeightKg).toBe(80);
    expect(v.bestDateKey).toBe('2026-10-28');
    expect(v.progressPct).toBe(0.8);
    expect(v.remainingKg).toBe(20);
    expect(v.reached).toBe(false);
  });

  it('«свой вес» (weight=0) рекордом не считается', () => {
    const v = evaluateExerciseGoal([log(3, '2026-10-28', 0)], { exerciseId: 3, targetWeightKg: 5 });
    expect(v.bestWeightKg).toBe(0);
    expect(v.progressPct).toBe(0);
    expect(v.reached).toBe(false);
  });

  it('достигнута: best >= target, прогресс зажат в 1, остаток 0', () => {
    const v = evaluateExerciseGoal(
      [log(10, '2026-10-28', 100), log(10, '2026-10-27', 90)],
      goal
    );
    expect(v.reached).toBe(true);
    expect(v.progressPct).toBe(1);
    expect(v.remainingKg).toBe(0);
    expect(v.bestDateKey).toBe('2026-10-28');
  });

  it('остаток округляется до 0,1 кг', () => {
    const v = evaluateExerciseGoal([log(10, '2026-10-28', 72.46)], goal);
    expect(v.remainingKg).toBe(27.5);
    expect(v.progressPct).toBeCloseTo(0.7246, 4);
  });
});
