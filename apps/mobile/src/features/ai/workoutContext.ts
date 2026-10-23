import type { SetLogEntry } from '@/engines/WorkoutStats';

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
