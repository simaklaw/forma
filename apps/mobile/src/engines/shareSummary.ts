/**
 * Сводка последней тренировки для шаринга (идея — NeXTormer/NeverSkip,
 * AGPLv3, ideas-only; реализация — своя). Движок чистый, без React:
 * buildLastWorkoutSummary группирует сет-логи последнего дня,
 * formatWorkoutShareText собирает текст из шаблонов strings.ts
 * ({name}/{sets}/{reps}/{max}/{volume} дозаполняются здесь).
 */

export interface WorkoutExerciseLine {
  exerciseId: number;
  name: string;
  setCount: number;
  topWeightKg: number;
  volumeKg: number;
  repsTotal: number;
}

export interface LastWorkoutSummary {
  dateKey: string;
  exercises: WorkoutExerciseLine[];
  totalSets: number;
  totalVolumeKg: number;
}

/** Минимальная форма SetLogEntry (структурная, чтобы не тянуть типы). */
export interface ShareSetLog {
  exerciseId: number;
  dateKey: string;
  weight: number;
  reps: number;
}

/**
 * Итог последней тренировки: сет-логи последнего dateKey, сгруппированные
 * по упражнению. Объём = вес × повторы (как в selectWeeklyVolume),
 * упражнения «свой вес» дают нулевой объём. Нет логов → null.
 */
export function buildLastWorkoutSummary(
  setLogs: readonly ShareSetLog[],
  names: Record<number, string>
): LastWorkoutSummary | null {
  if (setLogs.length === 0) return null;
  const lastDay = setLogs.reduce(
    (max, e) => (e.dateKey > max ? e.dateKey : max),
    setLogs[0]!.dateKey
  );
  const daySets = setLogs.filter((e) => e.dateKey === lastDay);

  const byExercise = new Map<number, WorkoutExerciseLine>();
  let totalSets = 0;
  let totalVolume = 0;
  for (const s of daySets) {
    const line = byExercise.get(s.exerciseId) ?? {
      exerciseId: s.exerciseId,
      name: names[s.exerciseId] ?? `#${s.exerciseId}`,
      setCount: 0,
      topWeightKg: 0,
      volumeKg: 0,
      repsTotal: 0
    };
    line.setCount += 1;
    line.repsTotal += s.reps;
    line.topWeightKg = Math.max(line.topWeightKg, s.weight);
    line.volumeKg += s.weight * s.reps;
    byExercise.set(s.exerciseId, line);
    totalSets += 1;
    totalVolume += s.weight * s.reps;
  }

  return {
    dateKey: lastDay,
    exercises: [...byExercise.values()],
    totalSets,
    totalVolumeKg: Math.round(totalVolume)
  };
}

export interface ShareTextTemplates {
  /** Заголовок, {date} уже подставлен вызывающим кодом. */
  title: string;
  /** «• {name} — {sets} подх. × {reps} повт. (макс {max} кг)» */
  line: string;
  /** Вариант без веса («свой вес»): {name}/{sets}/{reps}. */
  lineBody: string;
  /** «Итого: {sets} подх. · объём {volume} кг» */
  total: string;
  /** Итог без объёма (вся тренировка — «свой вес»): {sets}. */
  totalSets: string;
}

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{([a-zA-Z]+)\}/g, (all, name: string) =>
    name in vars ? String(vars[name]) : all
  );
}

/** Строки упражнений — по одной на упражнение (для текста и PNG-постера). */
export function workoutLines(
  summary: LastWorkoutSummary,
  tpl: ShareTextTemplates
): string[] {
  return summary.exercises.map((e) => {
    const avgReps = Math.round(e.repsTotal / e.setCount);
    return e.topWeightKg > 0
      ? fill(tpl.line, { name: e.name, sets: e.setCount, reps: avgReps, max: e.topWeightKg })
      : fill(tpl.lineBody, { name: e.name, sets: e.setCount, reps: avgReps });
  });
}

/** Итоговая строка: с объёмом; для «свой вес» — только подходы. */
export function workoutTotalLine(
  summary: LastWorkoutSummary,
  tpl: ShareTextTemplates
): string {
  return summary.totalVolumeKg > 0
    ? fill(tpl.total, { sets: summary.totalSets, volume: summary.totalVolumeKg })
    : fill(tpl.totalSets, { sets: summary.totalSets });
}

/** Текст для системного шер-шита: заголовок, пустая строка, упражнения, итог. */
export function formatWorkoutShareText(
  summary: LastWorkoutSummary,
  tpl: ShareTextTemplates
): string {
  const lines = workoutLines(summary, tpl);
  const total = workoutTotalLine(summary, tpl);
  return [tpl.title, '', ...lines, '', total].join('\n');
}
