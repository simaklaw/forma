/**
 * Мера подходов упражнений планов (reps | seconds) — clean-room концепция
 * поля measure из обзора GymBells: идея заимствована, реализация
 * собственная. Статика (планка, боковая планка) логируется секундами,
 * а не «повторами»: числовое поле подхода одно, measure задаёт его смысл.
 */
import { formatSetAmount, resolveSetMeasure, type SetMeasure } from '@forma/core';
import { PLAN_EXERCISES } from './exerciseSwaps';

/** Упражнения планов, которые считаются секундами (по возрастанию id). */
export const TIMED_PLAN_EXERCISE_IDS: readonly number[] = Object.values(PLAN_EXERCISES)
  .filter((ex) => resolveSetMeasure(ex.measure) === 'seconds')
  .map((ex) => ex.id)
  .sort((a, b) => a - b);

/** Мера подхода для id упражнения плана; по умолчанию reps. */
export function measureForPlanExercise(exerciseId: number): SetMeasure {
  return resolveSetMeasure(PLAN_EXERCISES[exerciseId]?.measure);
}

/** Подпись количества: «40с» для таймированных, «12» для повторов. */
export function formatPlanAmount(
  measure: SetMeasure,
  amount: number,
  secondsUnit: string
): string {
  return formatSetAmount(measure, amount, { reps: '', seconds: secondsUnit });
}
