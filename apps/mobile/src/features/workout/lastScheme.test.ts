import { MAX_CUSTOM_ITEMS } from './customWorkouts';
import { formatSchemeDate, lastSchemeForMuscle, type SchemeResolvers, type SchemeSetLog } from './lastScheme';

const RESOLVERS: SchemeResolvers = {
  musclesOf: (id) =>
    id === 4 ? ['chest', 'shoulders', 'triceps'] : id === 6 ? ['triceps'] : id === 7 ? ['back', 'biceps'] : null
};

function log(exerciseId: number, dateKey: string, weight: number, reps: number): SchemeSetLog {
  return { exerciseId, dateKey, weight, reps };
}

describe('lastScheme (последняя схема по группе мышц)', () => {
  test('null — нет логов', () => {
    expect(lastSchemeForMuscle([], 'chest', RESOLVERS)).toBeNull();
  });

  test('null — группа не качалась (другие мышцы или неизвестные id)', () => {
    const logs = [
      log(7, '2026-10-20', 60, 8),
      log(999, '2026-10-21', 40, 10)
    ];
    expect(lastSchemeForMuscle(logs, 'chest', RESOLVERS)).toBeNull();
  });

  test('берётся последний день, где качали группу', () => {
    const logs = [
      log(4, '2026-10-10', 60, 6),
      log(4, '2026-10-22', 62.5, 8)
    ];
    const scheme = lastSchemeForMuscle(logs, 'chest', RESOLVERS);
    expect(scheme?.dateKey).toBe('2026-10-22');
  });

  test('схема — весь день: chest-день включает и трицепс', () => {
    const logs = [
      log(4, '2026-10-22', 60, 6),
      log(6, '2026-10-22', 25, 12)
    ];
    const scheme = lastSchemeForMuscle(logs, 'chest', RESOLVERS);
    expect(scheme?.items.map((it) => it.exerciseId)).toEqual([4, 6]);
  });

  test('подходы — по числу логов, повторы и вес — средние', () => {
    const logs = [
      log(4, '2026-10-22', 60, 6),
      log(4, '2026-10-22', 61, 7),
      log(4, '2026-10-22', 62, 9)
    ];
    const scheme = lastSchemeForMuscle(logs, 'chest', RESOLVERS);
    expect(scheme?.items[0]).toEqual({
      exerciseId: 4,
      sets: 3,
      reps: 7,
      restSeconds: 60,
      weightKg: 61
    });
  });

  test('вес не пишется для «свой вес» и при нулевом среднем', () => {
    const logs = [
      log(4, '2026-10-22', 0, 10),
      log(7, '2026-10-20', 60, 8)
    ];
    const weightedFalse: SchemeResolvers = { ...RESOLVERS, isWeighted: () => false };
    expect(lastSchemeForMuscle(logs, 'chest', weightedFalse)?.items[0]?.weightKg).toBeUndefined();
    expect(lastSchemeForMuscle(logs, 'chest', RESOLVERS)?.items[0]?.weightKg).toBeUndefined();
  });

  test('порядок — по первому появлению в логах', () => {
    const logs = [
      log(6, '2026-10-22', 25, 12),
      log(4, '2026-10-22', 60, 6),
      log(6, '2026-10-22', 26, 11)
    ];
    expect(lastSchemeForMuscle(logs, 'chest', RESOLVERS)?.items.map((it) => it.exerciseId)).toEqual([6, 4]);
  });

  test('отдых из restOf, иначе 60; кламп 15..600', () => {
    const logs = [
      log(4, '2026-10-22', 60, 6),
      log(7, '2026-10-20', 60, 8)
    ];
    const withRest: SchemeResolvers = { ...RESOLVERS, restOf: () => 90 };
    expect(lastSchemeForMuscle(logs, 'chest', withRest)?.items[0]?.restSeconds).toBe(90);
    expect(lastSchemeForMuscle(logs, 'chest', RESOLVERS)?.items[0]?.restSeconds).toBe(60);
    const withClamp: SchemeResolvers = { ...RESOLVERS, restOf: () => 9999 };
    expect(lastSchemeForMuscle(logs, 'chest', withClamp)?.items[0]?.restSeconds).toBe(600);
  });

  test('неизвестные упражнения дня попадают в схему, если день выбран по другому', () => {
    const logs = [
      log(4, '2026-10-22', 60, 6),
      log(999, '2026-10-22', 30, 15)
    ];
    const scheme = lastSchemeForMuscle(logs, 'chest', RESOLVERS);
    expect(scheme?.items.map((it) => it.exerciseId)).toEqual([4, 999]);
  });

  test('кап числа упражнений — MAX_CUSTOM_ITEMS', () => {
    const logs: SchemeSetLog[] = [];
    for (let id = 1; id <= MAX_CUSTOM_ITEMS + 10; id++) {
      logs.push(log(id, '2026-10-22', 20, 10));
    }
    // день выбран по 4-му (chest), остальные id для musclesOf → null
    const resolvers: SchemeResolvers = { musclesOf: (id) => (id === 4 ? ['chest'] : null) };
    expect(lastSchemeForMuscle(logs, 'chest', resolvers)?.items).toHaveLength(MAX_CUSTOM_ITEMS);
  });

  test('formatSchemeDate: YYYY-MM-DD → DD.MM.YYYY, мусор как есть', () => {
    expect(formatSchemeDate('2026-10-28')).toBe('28.10.2026');
    expect(formatSchemeDate('junk')).toBe('junk');
  });
});
