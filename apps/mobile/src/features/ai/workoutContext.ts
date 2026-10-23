import type { SetLogEntry } from '@/engines/WorkoutStats';
import { muscleVolumeStats, type MuscleLoadStatus } from '@forma/core';

export interface WorkoutSetSummary {
  weightKg: number;
  reps: number;
  rir: number;
}

export interface WorkoutExerciseSummary {
  exerciseId: number;
  name: string;
  sets: WorkoutSetSummary[];
  bestWeightKg: number;
  volumeKg: number;
  isPersonalRecord: boolean;
}

/** Снимок тренировки дня для тренерского AI-контекста. */
export interface WorkoutDaySnapshot {
  dateKey: string;
  exercises: WorkoutExerciseSummary[];
  totalSets: number;
  totalVolumeKg: number;
  totalReps: number;
}

/**
 * Сводка сетов за dateKey, сгруппированная по упражнениям (для роли «Тренер»).
 * Имена берутся из переданной карты (каталог + импортированная библиотека).
 */
export function buildWorkoutDaySnapshot(
  setLogs: SetLogEntry[],
  personalRecords: Record<number, number>,
  exerciseNames: Record<number, string>,
  dateKey: string
): WorkoutDaySnapshot {
  const byExercise = new Map<number, SetLogEntry[]>();
  for (const log of setLogs) {
    if (log.dateKey !== dateKey) continue;
    const list = byExercise.get(log.exerciseId);
    if (list) {
      list.push(log);
    } else {
      byExercise.set(log.exerciseId, [log]);
    }
  }
  const exercises: WorkoutExerciseSummary[] = [];
  let totalSets = 0;
  let totalVolumeKg = 0;
  let totalReps = 0;
  for (const [exerciseId, logs] of byExercise) {
    const sets = logs.map((log) => ({
      weightKg: log.weight,
      reps: log.reps,
      rir: typeof log.rir === 'number' ? log.rir : 0
    }));
    const bestWeightKg = logs.reduce((acc, log) => Math.max(acc, log.weight), 0);
    const volumeKg = logs.reduce((acc, log) => acc + log.weight * log.reps, 0);
    const record = personalRecords[exerciseId] ?? 0;
    exercises.push({
      exerciseId,
      name: exerciseNames[exerciseId] ?? '#' + exerciseId,
      sets,
      bestWeightKg,
      volumeKg,
      isPersonalRecord: bestWeightKg > 0 && bestWeightKg >= record
    });
    totalSets += sets.length;
    totalVolumeKg += volumeKg;
    totalReps += sets.reduce((acc, set) => acc + set.reps, 0);
  }
  return { dateKey, exercises, totalSets, totalVolumeKg, totalReps };
}

export interface MuscleVolumeLine {
  muscle: string;
  label: string;
  weeklySets: number;
  mev: number;
  mrv: number;
  status: MuscleLoadStatus;
}

/** Сводка недельной нагрузки по мышцам для роли «Тренер». */
export interface MuscleVolumeSnapshot {
  windowDays: number;
  lines: MuscleVolumeLine[];
  junkMuscles: string[];
  underMuscles: string[];
  pushSets: number;
  pullSets: number;
}

/** Мышцы жимового и тягового верха — для оценки баланса в неделе. */
const PUSH_MUSCLES = new Set(['chest', 'shoulders', 'triceps']);
const PULL_MUSCLES = new Set(['back', 'biceps']);

/**
 * Недельная нагрузка по мышцам (MEV/MRV, junk volume, баланс жим/тяга).
 * Мышцы упражнения берутся из переданной карты; лейблы — из MUSCLE_LABELS.
 */
export function buildMuscleVolumeSnapshot(
  setLogs: SetLogEntry[],
  exerciseMuscles: Record<number, readonly string[]>,
  muscleLabels: Record<string, string>,
  now: Date = new Date(),
  windowDays = 7
): MuscleVolumeSnapshot {
  const stats = muscleVolumeStats(setLogs, exerciseMuscles, now, windowDays);
  const lines: MuscleVolumeLine[] = stats.map((s) => ({
    muscle: s.muscle,
    label: muscleLabels[s.muscle] ?? s.muscle,
    weeklySets: s.weeklySets,
    mev: s.mev,
    mrv: s.mrv,
    status: s.status
  }));
  let pushSets = 0;
  let pullSets = 0;
  for (const s of stats) {
    if (PUSH_MUSCLES.has(s.muscle)) {
      pushSets += s.weeklySets;
    } else if (PULL_MUSCLES.has(s.muscle)) {
      pullSets += s.weeklySets;
    }
  }
  return {
    windowDays,
    lines,
    junkMuscles: lines.filter((l) => l.status === 'junk').map((l) => l.label),
    underMuscles: lines.filter((l) => l.status === 'under').map((l) => l.label),
    pushSets,
    pullSets
  };
}

/** Текст недельного объёма по мышцам для промпта роли «Тренер». */
export function renderMuscleVolumeContext(snapshot: MuscleVolumeSnapshot): string {
  const lines: string[] = [
    'Недельная нагрузка по мышцам (' +
      snapshot.windowDays +
      ' дней; MEV/MRV — ориентиры жёстких сетов в неделю):'
  ];
  if (snapshot.lines.length === 0) {
    lines.push('Записанных подходов за окно нет.');
  }
  for (const l of snapshot.lines) {
    const verdict =
      l.status === 'junk'
        ? 'превышение MRV — junk volume, риск недовосстановления'
        : l.status === 'under'
          ? 'ниже MEV — мышца недорабатывает'
          : 'оптимальный диапазон';
    lines.push(
      '- ' + l.label + ': ' + l.weeklySets + ' (MEV ' + l.mev + ', MRV ' + l.mrv + ') — ' + verdict
    );
  }
  const notes: string[] = [];
  if (snapshot.junkMuscles.length > 0) {
    notes.push('junk volume: ' + snapshot.junkMuscles.join(', ') + ' — предложи, что сократить');
  }
  if (snapshot.underMuscles.length > 0) {
    notes.push('недобор объёма: ' + snapshot.underMuscles.join(', ') + ' — предложи, что добавить');
  }
  if (snapshot.pushSets > 0 && snapshot.pullSets > 0) {
    notes.push('баланс жим/тяга за неделю: ' + snapshot.pushSets + ' vs ' + snapshot.pullSets + ' сетов');
  }
  if (notes.length > 0) {
    lines.push('Итог: ' + notes.join('; ') + '.');
  }
  lines.push('Учитывай недельный объём и баланс мышц в рекомендациях.');
  return lines.join('\n');
}

/** Текст бизнес-контекста для промпта роли «Тренер». */
export function renderWorkoutContext(snapshot: WorkoutDaySnapshot): string {
  const lines: string[] = ['Тренировка за ' + snapshot.dateKey + ':'];
  if (snapshot.exercises.length === 0) {
    lines.push('Сегодня записанных подходов нет.');
  }
  for (const ex of snapshot.exercises) {
    const setsText = ex.sets
      .map((set) => set.weightKg + ' кг × ' + set.reps + ' (RIR ' + set.rir + ')')
      .join(', ');
    lines.push('- ' + ex.name + ': ' + ex.sets.length + '× ' + setsText);
    lines.push(
      '  лучший вес ' +
        ex.bestWeightKg +
        ' кг, объём ' +
        ex.volumeKg +
        ' кг' +
        (ex.isPersonalRecord ? ' — личный рекорд' : '')
    );
  }
  lines.push(
    'Итого: подходов ' +
      snapshot.totalSets +
      ', повторений ' +
      snapshot.totalReps +
      ', объём ' +
      snapshot.totalVolumeKg +
      ' кг.'
  );
  lines.push(
    'Проанализируй тренировку: техника, прогрессия нагрузок, восстановление. Дай не более 3 конкретных рекомендаций на следующую тренировку.'
  );
  return lines.join('\n');
}
