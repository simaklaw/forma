import {
  CUSTOM_DAY_PREFIX,
  MAX_CUSTOM_ITEMS,
  MAX_CUSTOM_WORKOUTS,
  buildCustomWorkoutDay,
  customDayId,
  customIdFromDayId,
  estimateCustomWorkoutMinutes,
  normalizeCustomItems,
  normalizeCustomWorkoutName,
  normalizeCustomWorkouts,
  resolveCustomWorkoutExercises,
  type CustomWorkout
} from './customWorkouts';
import type { ExerciseDef } from './ExerciseSheet';

function def(id: number, name: string): ExerciseDef {
  return {
    id,
    index: 1,
    name,
    workingWeight: 40,
    workingReps: 10,
    totalSets: 3,
    restSeconds: 60,
    targetMuscles: ['chest'],
    note: ''
  };
}

describe('customWorkouts (свои тренировки)', () => {
  test('customDayId / customIdFromDayId — round-trip, чужие id дают null', () => {
    expect(customDayId('cw-abc123')).toBe('custom-cw-abc123');
    expect(customIdFromDayId('custom-cw-abc123')).toBe('cw-abc123');
    expect(customIdFromDayId('chest')).toBeNull();
    expect(customIdFromDayId('custom-')).toBe('');
  });

  test('normalizeCustomItems выбрасывает мусор и валидирует id', () => {
    expect(normalizeCustomItems('junk')).toEqual([]);
    expect(normalizeCustomItems(null)).toEqual([]);
    expect(
      normalizeCustomItems([
        'nope',
        null,
        { exerciseId: 'x' },
        { exerciseId: 0 },
        { exerciseId: 2.5 },
        { exerciseId: 7 }
      ])
    ).toEqual([{ exerciseId: 7, sets: 3, reps: 10, restSeconds: 60, weightKg: undefined }]);
  });

  test('normalizeCustomItems зажимает числа в разумные диапазоны', () => {
    expect(
      normalizeCustomItems([
        { exerciseId: 7, sets: 99, reps: 0, restSeconds: 5 },
        { exerciseId: 8, sets: 2, reps: 12, restSeconds: 90, weightKg: 22.37 }
      ])
    ).toEqual([
      { exerciseId: 7, sets: 20, reps: 1, restSeconds: 15, weightKg: undefined },
      { exerciseId: 8, sets: 2, reps: 12, restSeconds: 90, weightKg: 22.4 }
    ]);
  });

  test(`normalizeCustomItems капит ${MAX_CUSTOM_ITEMS} элементов`, () => {
    const many = Array.from({ length: MAX_CUSTOM_ITEMS + 10 }, (_, i) => ({
      exerciseId: i + 1,
      sets: 3,
      reps: 10,
      restSeconds: 60
    }));
    expect(normalizeCustomItems(many)).toHaveLength(MAX_CUSTOM_ITEMS);
  });

  test('normalizeCustomWorkoutName: схлопывает пробелы и капит 40 символов', () => {
    expect(normalizeCustomWorkoutName('  Утро    кор  ')).toBe('Утро кор');
    expect(normalizeCustomWorkoutName('x'.repeat(80))).toHaveLength(40);
    expect(normalizeCustomWorkoutName(42)).toBe('');
  });

  test('normalizeCustomWorkouts: валидация id, дубли, битые даты, кап', () => {
    const good = {
      id: 'cw-abcdefgh',
      name: 'Кор',
      items: [{ exerciseId: 15, sets: 3, reps: 40, restSeconds: 45 }],
      createdAtKey: '2026-10-01',
      updatedAtKey: '2026-10-02'
    };
    const result = normalizeCustomWorkouts(
      [good, good, { id: 'bad-id', name: 'x' }, 'junk', null, { id: 'cw-xyz987654', name: 'y' }],
      '2026-01-01'
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(good);
    expect(result[1]!.createdAtKey).toBe('2026-01-01');
    expect(result[1]!.updatedAtKey).toBe('2026-01-01');

    const many = Array.from({ length: MAX_CUSTOM_WORKOUTS + 5 }, (_, i) => ({
      id: `cw-item${String(i).padStart(6, '0')}`,
      name: 'w',
      items: []
    }));
    expect(normalizeCustomWorkouts(many)).toHaveLength(MAX_CUSTOM_WORKOUTS);
  });

  test('resolveCustomWorkoutExercises применяет overrides и пропускает неизвестные', () => {
    const items = [
      { exerciseId: 1, sets: 5, reps: 8, restSeconds: 120, weightKg: 55 },
      { exerciseId: 999, sets: 3, reps: 10, restSeconds: 60 },
      { exerciseId: 2, sets: 4, reps: 12, restSeconds: 45 }
    ];
    const defs = resolveCustomWorkoutExercises(items, (id) =>
      id === 999 ? null : def(id, `Упр ${id}`)
    );
    expect(defs.map((d) => d.id)).toEqual([1, 2]);
    expect(defs[0]).toMatchObject({ index: 1, totalSets: 5, workingReps: 8, restSeconds: 120, workingWeight: 55 });
    expect(defs[1]).toMatchObject({ index: 2, totalSets: 4, workingReps: 12, restSeconds: 45, workingWeight: 40 });
  });

  test('estimateCustomWorkoutMinutes — формула превью-листа', () => {
    // 3 упр × (3 подхода × (60 + 45)) = 945 с ≈ 16 мин
    expect(estimateCustomWorkoutMinutes([def(1, 'a'), def(2, 'b'), def(3, 'c')])).toBe(16);
  });

  test('buildCustomWorkoutDay: null на пустое, поля на заполненное', () => {
    const workout: CustomWorkout = {
      id: 'cw-abcdefgh',
      name: '  Утро, кор  ',
      items: [{ exerciseId: 15, sets: 3, reps: 40, restSeconds: 45 }],
      createdAtKey: '2026-10-01',
      updatedAtKey: '2026-10-01'
    };
    expect(buildCustomWorkoutDay({ ...workout, items: [] }, 'Без названия', 'мета')).toBeNull();
    const day = buildCustomWorkoutDay(workout, 'Без названия', 'мета');
    expect(day).not.toBeNull();
    expect(day!.id).toBe(`${CUSTOM_DAY_PREFIX}cw-abcdefgh`);
    expect(day!.name).toBe('Утро, кор');
    expect(day!.meta).toBe('мета');
    expect(day!.exercises).toHaveLength(1);
    // fallback-имя, если не задано
    const untitled = buildCustomWorkoutDay({ ...workout, name: '' }, 'Без названия', 'мета');
    expect(untitled!.name).toBe('Без названия');
  });

  test('normalizeCustomItems: supersetWithPrev только со второго элемента', () => {
    expect(
      normalizeCustomItems([
        { exerciseId: 7, sets: 3, reps: 10, restSeconds: 60, supersetWithPrev: true },
        { exerciseId: 8, sets: 3, reps: 10, restSeconds: 60, supersetWithPrev: true },
        { exerciseId: 9, sets: 3, reps: 10, restSeconds: 60, supersetWithPrev: false }
      ])
    ).toEqual([
      { exerciseId: 7, sets: 3, reps: 10, restSeconds: 60, weightKg: undefined },
      {
        exerciseId: 8,
        sets: 3,
        reps: 10,
        restSeconds: 60,
        weightKg: undefined,
        supersetWithPrev: true
      },
      { exerciseId: 9, sets: 3, reps: 10, restSeconds: 60, weightKg: undefined }
    ]);
  });

  test('resolveCustomWorkoutExercises переносит supersetWithPrev в defs', () => {
    const defs = resolveCustomWorkoutExercises(
      [
        { exerciseId: 1, sets: 3, reps: 10, restSeconds: 60 },
        { exerciseId: 2, sets: 3, reps: 10, restSeconds: 60, supersetWithPrev: true }
      ],
      (id) => def(id, `Упр ${id}`)
    );
    expect(defs[0]?.supersetWithPrev).toBeUndefined();
    expect(defs[1]?.supersetWithPrev).toBe(true);
  });
});
