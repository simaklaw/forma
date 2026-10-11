import { estimateSessionBurnKcal, metForExercise } from '@forma/core';
import type { WorkoutSession } from '@forma/workout-domain';

export interface WorkoutResult {
  dayName: string;
  totalSets: number;
  burnedKcal: number;
  currentStreak: number;
}

/** Freeze the completed session's result, independently of the selected plan/day. */
export function summarizeWorkoutResult(
  session: WorkoutSession,
  dayName: string,
  currentStreak: number
): WorkoutResult {
  return {
    dayName,
    totalSets: session.steps.reduce((total, step) => total + step.completedSets.length, 0),
    burnedKcal: Math.round(
      session.steps.reduce(
        (total, step) =>
          total +
          estimateSessionBurnKcal({
            weightKg: session.weightKgSnapshot ?? 0,
            setsCompleted: step.completedSets.length,
            met: metForExercise(step.snapshot.name)
          }),
        0
      )
    ),
    currentStreak
  };
}

export function workoutResultMessage(result: WorkoutResult): string {
  const lines = [
    `Завершил(а) тренировку «${result.dayName}» в FitPulse!`,
    `💪 Подходов: ${result.totalSets}`
  ];
  if (result.burnedKcal > 0) lines.push(`🔥 Сожжено: ~${result.burnedKcal} ккал`);
  if (result.currentStreak > 0) lines.push(`🔥 Серия: ${result.currentStreak} дн. подряд`);
  return lines.join('\n');
}
