import type { SetLogEntry } from '@/engines/WorkoutStats';
import { buildWorkoutDaySnapshot, renderWorkoutContext } from './workoutContext';

const DAY = '2026-10-23';

let seq = 0;
function log(exerciseId: number, weight: number, reps: number, rir = 2): SetLogEntry {
  seq += 1;
  return {
    id: 'log-' + seq,
    exerciseId,
    dateKey: DAY,
    weight,
    reps,
    rir
  };
}

describe('buildWorkoutDaySnapshot', () => {
  it('groups only logs of the requested day', () => {
    const today: SetLogEntry[] = [log(1, 60, 8), log(1, 62.5, 8)];
    const otherDay: SetLogEntry[] = [{ ...log(2, 100, 5), dateKey: '2026-10-22' }];
    const snapshot = buildWorkoutDaySnapshot([...today, ...otherDay], {}, { 1: 'Присед' }, DAY);
    expect(snapshot.exercises.map((ex) => ex.exerciseId)).toEqual([1]);
    expect(snapshot.exercises[0]?.sets).toHaveLength(2);
  });

  it('computes best weight, volume and PR flag per exercise', () => {
    const snapshot = buildWorkoutDaySnapshot(
      [log(1, 60, 8), log(1, 62.5, 6)],
      { 1: 62.5 },
      { 1: 'Присед' },
      DAY
    );
    const ex = snapshot.exercises[0]!;
    expect(ex.bestWeightKg).toBe(62.5);
    expect(ex.volumeKg).toBe(60 * 8 + 62.5 * 6);
    expect(ex.isPersonalRecord).toBe(true);
    const below = buildWorkoutDaySnapshot([log(1, 50, 8)], { 1: 62.5 }, { 1: 'Присед' }, DAY);
    expect(below.exercises[0]?.isPersonalRecord).toBe(false);
  });

  it('falls back to numeric name and totals across exercises', () => {
    const snapshot = buildWorkoutDaySnapshot([log(7, 40, 10), log(8, 0, 15)], {}, {}, DAY);
    expect(snapshot.exercises.map((ex) => ex.name)).toEqual(['#7', '#8']);
    expect(snapshot.totalSets).toBe(2);
    expect(snapshot.totalReps).toBe(25);
    expect(snapshot.totalVolumeKg).toBe(400);
  });
});

describe('renderWorkoutContext', () => {
  it('renders date, sets, RIR, PR mark, totals and instruction', () => {
    const snapshot = buildWorkoutDaySnapshot(
      [log(1, 60, 8, 2), log(1, 60, 7, 3)],
      { 1: 60 },
      { 1: 'Присед со штангой' },
      DAY
    );
    const text = renderWorkoutContext(snapshot);
    expect(text).toContain('Тренировка за ' + DAY);
    expect(text).toContain('Присед со штангой: 2× 60 кг × 8 (RIR 2), 60 кг × 7 (RIR 3)');
    expect(text).toContain('личный рекорд');
    expect(text).toContain('Итого: подходов 2, повторений 15');
    expect(text).toContain('не более 3 конкретных рекомендаций');
  });

  it('mentions empty day when there are no sets', () => {
    const text = renderWorkoutContext(buildWorkoutDaySnapshot([], {}, {}, DAY));
    expect(text).toContain('Сегодня записанных подходов нет.');
  });
});
