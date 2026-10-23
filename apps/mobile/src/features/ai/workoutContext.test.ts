import type { SetLogEntry } from '@/engines/WorkoutStats';
import {
  buildMuscleVolumeSnapshot,
  buildWorkoutDaySnapshot,
  renderMuscleVolumeContext,
  renderWorkoutContext
} from './workoutContext';

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

const NOW = new Date('2026-10-23T12:00:00Z');

describe('buildMuscleVolumeSnapshot', () => {
  it('weights the primary muscle in full and synergists at half', () => {
    const logs = [log(1, 60, 8), log(1, 62.5, 6), log(1, 60, 7)];
    const snap = buildMuscleVolumeSnapshot(logs, { 1: ['chest', 'triceps'] }, { chest: 'грудь' }, NOW);
    const chest = snap.lines.find((l) => l.muscle === 'chest');
    expect(chest?.weeklySets).toBe(3);
    const triceps = snap.lines.find((l) => l.muscle === 'triceps');
    expect(triceps?.weeklySets).toBe(1.5);
    expect(chest?.label).toBe('грудь');
    expect(triceps?.label).toBe('triceps');
  });

  it('collects junk/under muscles and push/pull balance', () => {
    const chestLogs = Array.from({ length: 21 }, (_, i) => log(2, 50, 10 + i));
    const backLogs = Array.from({ length: 2 }, (_, i) => log(3, 60, 8 + i));
    const snap = buildMuscleVolumeSnapshot([...chestLogs, ...backLogs], { 2: ['chest'], 3: ['back'] }, {}, NOW);
    expect(snap.junkMuscles).toEqual(['chest']);
    expect(snap.underMuscles).toEqual(['back']);
    expect(snap.pushSets).toBe(21);
    expect(snap.pullSets).toBe(2);
  });
});

describe('renderMuscleVolumeContext', () => {
  it('renders verdicts, totals and the balance note', () => {
    const chestLogs = Array.from({ length: 21 }, (_, i) => log(4, 50, 10 + i));
    const backLogs = Array.from({ length: 2 }, (_, i) => log(5, 60, 8 + i));
    const snap = buildMuscleVolumeSnapshot(
      [...chestLogs, ...backLogs],
      { 4: ['chest'], 5: ['back'] },
      { chest: 'грудь', back: 'спина' },
      NOW
    );
    const text = renderMuscleVolumeContext(snap);
    expect(text).toContain('Недельная нагрузка по мышцам (7 дней');
    expect(text).toContain('грудь: 21 (MEV 10, MRV 20) — превышение MRV — junk volume');
    expect(text).toContain('спина: 2 (MEV 10, MRV 20) — ниже MEV');
    expect(text).toContain('junk volume: грудь — предложи, что сократить');
    expect(text).toContain('недобор объёма: спина — предложи, что добавить');
    expect(text).toContain('баланс жим/тяга за неделю: 21 vs 2 сетов');
    expect(text).toContain('Учитывай недельный объём и баланс мышц в рекомендациях.');
  });

  it('mentions an empty window', () => {
    const text = renderMuscleVolumeContext(buildMuscleVolumeSnapshot([], {}, {}, NOW));
    expect(text).toContain('Записанных подходов за окно нет.');
  });
});
