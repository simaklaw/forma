import {
  buildLastWorkoutSummary,
  formatWorkoutShareText,
  type ShareSetLog
} from './shareSummary';

const TPL = {
  title: '🏋️ FitPulse · тренировка {date}',
  line: '• {name} — {sets} подх. × {reps} повт. (макс {max} кг)',
  lineBody: '• {name} — {sets} подх. × {reps} повт.',
  total: 'Итого: {sets} подх. · объём {volume} кг',
  totalSets: 'Итого: {sets} подх.'
};

function log(
  exerciseId: number,
  dateKey: string,
  weight: number,
  reps: number
): ShareSetLog {
  return { exerciseId, dateKey, weight, reps };
}

describe('buildLastWorkoutSummary', () => {
  it('пустой лог → null', () => {
    expect(buildLastWorkoutSummary([], {})).toBeNull();
  });

  it('берётся последний dateKey, сет-логи других дней игнорируются', () => {
    const s = buildLastWorkoutSummary(
      [
        log(10, '2026-10-20', 60, 10),
        log(11, '2026-10-28', 80, 8),
        log(11, '2026-10-27', 70, 8)
      ],
      { 10: 'Жим лёжа', 11: 'Приседания' }
    );
    expect(s).not.toBeNull();
    expect(s!.dateKey).toBe('2026-10-28');
    expect(s!.totalSets).toBe(1);
    expect(s!.exercises.map((e) => e.exerciseId)).toEqual([11]);
  });

  it('группировка по упражнению: подходы, топ-вес, объём, повторы', () => {
    const s = buildLastWorkoutSummary(
      [
        log(10, '2026-10-28', 60, 10),
        log(10, '2026-10-28', 80, 8),
        log(11, '2026-10-28', 40, 12)
      ],
      { 10: 'Жим лёжа', 11: 'Тяга верхнего блока' }
    );
    expect(s!.exercises).toHaveLength(2);
    const bench = s!.exercises.find((e) => e.exerciseId === 10)!;
    expect(bench.setCount).toBe(2);
    expect(bench.topWeightKg).toBe(80);
    expect(bench.volumeKg).toBe(60 * 10 + 80 * 8);
    expect(bench.repsTotal).toBe(18);
    expect(s!.totalSets).toBe(3);
    expect(s!.totalVolumeKg).toBe(60 * 10 + 80 * 8 + 40 * 12);
  });

  it('неизвестный id → fallback «#id»', () => {
    const s = buildLastWorkoutSummary([log(777, '2026-10-28', 50, 5)], {});
    expect(s!.exercises[0]!.name).toBe('#777');
  });

  it('«свой вес» (weight=0) → нулевой объём, но считается подходом', () => {
    const s = buildLastWorkoutSummary(
      [log(3, '2026-10-28', 0, 20), log(3, '2026-10-28', 0, 18)],
      { 3: 'Отжимания' }
    );
    const pushups = s!.exercises[0]!;
    expect(pushups.topWeightKg).toBe(0);
    expect(pushups.volumeKg).toBe(0);
    expect(pushups.setCount).toBe(2);
    expect(s!.totalVolumeKg).toBe(0);
    expect(s!.totalSets).toBe(2);
  });
});

describe('formatWorkoutShareText', () => {
  it('полный формат: заголовок, строки с весом, итог с объёмом', () => {
    const s = buildLastWorkoutSummary(
      [
        log(10, '2026-10-28', 60, 10),
        log(10, '2026-10-28', 80, 8),
        log(11, '2026-10-28', 40, 12)
      ],
      { 10: 'Жим лёжа', 11: 'Тяга верхнего блока' }
    )!;
    const text = formatWorkoutShareText(s, TPL);
    const lines = text.split('\n');
    expect(lines[0]).toBe('🏋️ FitPulse · тренировка {date}');
    expect(lines).toContain('• Жим лёжа — 2 подх. × 9 повт. (макс 80 кг)');
    expect(lines).toContain('• Тяга верхнего блока — 1 подх. × 12 повт. (макс 40 кг)');
    expect(lines[lines.length - 1]).toBe('Итого: 3 подх. · объём 1720 кг');
    // структура: заголовок, пустая, упражнения, пустая, итог
    expect(lines[1]).toBe('');
    expect(lines[lines.length - 2]).toBe('');
  });

  it('средние повторы округляются: (8+9+10)/3 → 9', () => {
    const s = buildLastWorkoutSummary(
      [
        log(10, '2026-10-28', 60, 8),
        log(10, '2026-10-28', 60, 9),
        log(10, '2026-10-28', 60, 10)
      ],
      { 10: 'Жим лёжа' }
    )!;
    expect(formatWorkoutShareText(s, TPL)).toContain('3 подх. × 9 повт.');
  });

  it('«свой вес» → строка без «макс», итог без объёма', () => {
    const s = buildLastWorkoutSummary(
      [log(3, '2026-10-28', 0, 20), log(3, '2026-10-28', 0, 15)],
      { 3: 'Отжимания' }
    )!;
    const text = formatWorkoutShareText(s, TPL);
    expect(text).toContain('• Отжимания — 2 подх. × 18 повт.');
    expect(text).not.toContain('макс');
    expect(text.split('\n').pop()).toBe('Итого: 2 подх.');
  });

  it('смешанная тренировка: итог с объёмом, у весовых — «макс»', () => {
    const s = buildLastWorkoutSummary(
      [log(10, '2026-10-28', 60, 10), log(3, '2026-10-28', 0, 20)],
      { 10: 'Жим лёжа', 3: 'Отжимания' }
    )!;
    const text = formatWorkoutShareText(s, TPL);
    expect(text).toContain('• Жим лёжа — 1 подх. × 10 повт. (макс 60 кг)');
    expect(text).toContain('• Отжимания — 1 подх. × 20 повт.');
    expect(text.split('\n').pop()).toBe('Итого: 2 подх. · объём 600 кг');
  });
});
