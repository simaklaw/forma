import {
  WARMUP_GROUP_MUSCLES,
  WARMUP_ROUTINES,
  selectWarmupRoutine,
  warmupRoutineTotalSec,
  type Bilingual,
  type WarmupExercise
} from './warmup';

const ALL_TEXTS: Bilingual[] = [];

function collectTexts(ex: WarmupExercise): void {
  ALL_TEXTS.push(ex.name, ex.description, ex.focusRegion);
}

describe('warmup (разминочные комплексы)', () => {
  test('все 4 комплекса на месте и непустые', () => {
    expect(Object.keys(WARMUP_ROUTINES).sort()).toEqual(['fullbody', 'legs', 'pull', 'push']);
    for (const key of ['legs', 'push', 'pull', 'fullbody'] as const) {
      expect(WARMUP_ROUTINES[key].key).toBe(key);
      expect(WARMUP_ROUTINES[key].exercises.length).toBeGreaterThanOrEqual(3);
    }
  });

  test('данные целостны: уникальные id, разумные длительности, ru/en не пустые', () => {
    const ids = new Set<string>();
    for (const routine of Object.values(WARMUP_ROUTINES)) {
      ALL_TEXTS.push(routine.title);
      for (const ex of routine.exercises) {
        expect(ids.has(ex.id)).toBe(false);
        ids.add(ex.id);
        expect(ex.durationSec).toBeGreaterThanOrEqual(15);
        expect(ex.durationSec).toBeLessThanOrEqual(180);
        collectTexts(ex);
      }
    }
    for (const text of ALL_TEXTS) {
      expect(text.ru.trim().length).toBeGreaterThan(0);
      expect(text.en.trim().length).toBeGreaterThan(0);
    }
  });

  test('группы мышц не пересекаются и не содержат core', () => {
    const all = [
      ...WARMUP_GROUP_MUSCLES.legs,
      ...WARMUP_GROUP_MUSCLES.push,
      ...WARMUP_GROUP_MUSCLES.pull
    ];
    expect(new Set(all).size).toBe(all.length);
    expect(all).not.toContain('core');
  });

  test('selectWarmupRoutine: нога-день → legs, грудь/плечи → push, спина → pull', () => {
    expect(selectWarmupRoutine(['quads', 'hamstrings', 'glutes', 'core'])).toBe('legs');
    expect(selectWarmupRoutine(['chest', 'shoulders', 'triceps'])).toBe('push');
    expect(selectWarmupRoutine(['back', 'biceps', 'core'])).toBe('pull');
    expect(selectWarmupRoutine(['lowerback', 'hamstrings'])).toBe('legs');
  });

  test('selectWarmupRoutine: пусто и только core → fullbody', () => {
    expect(selectWarmupRoutine([])).toBe('fullbody');
    expect(selectWarmupRoutine(['core'])).toBe('fullbody');
    expect(selectWarmupRoutine(['core', 'core'])).toBe('fullbody');
  });

  test('selectWarmupRoutine: больше повторов muscles решает, ничья — детерминирована', () => {
    // 2 push-мышцы против 1 legs: push
    expect(selectWarmupRoutine(['chest', 'triceps', 'quads'])).toBe('push');
    // ничья 1:1 → legs (фиксированный порядок)
    expect(selectWarmupRoutine(['quads', 'chest'])).toBe('legs');
    // 2 legs против 2 push → legs (порядок при равенстве)
    expect(selectWarmupRoutine(['quads', 'glutes', 'chest', 'shoulders'])).toBe('legs');
  });

  test('warmupRoutineTotalSec суммирует шаги', () => {
    const legs = WARMUP_ROUTINES.legs;
    const manual = legs.exercises.reduce((acc, e) => acc + e.durationSec, 0);
    expect(warmupRoutineTotalSec(legs)).toBe(manual);
    expect(manual).toBeGreaterThan(0);
  });
});
