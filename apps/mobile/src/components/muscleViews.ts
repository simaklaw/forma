/**
 * Разделение целевых мышц по видам силуэта MuscleMap: передний вид —
 * грудь, дельты, бицепс, кор, квадрицепсы; задний — спина, трицепс,
 * ягодицы, бицепс бедра, икры (плечи видны с обеих сторон).
 * Идея видов front/back — из обзора Muscle Visualizer API (ExerciseDB);
 * реализация локальная.
 */
import type { MuscleKey } from '@/domain/muscleKeys';

/** Мышцы переднего вида силуэта. */
export const FRONT_VIEW_MUSCLES: readonly MuscleKey[] = [
  'chest',
  'shoulders',
  'biceps',
  'core',
  'quads'
];

/** Мышцы заднего вида силуэта (плечи видны и спереди, и сзади). */
export const BACK_VIEW_MUSCLES: readonly MuscleKey[] = [
  'shoulders',
  'triceps',
  'back',
  'lowerback',
  'glutes',
  'hamstrings',
  'calves'
];

export interface MuscleViews {
  /** Мышцы переднего вида; порядок исходного списка сохранён. */
  front: MuscleKey[];
  /** Мышцы заднего вида; плечи попадают в оба вида. */
  back: MuscleKey[];
}

/**
 * Разделение целевых мышц по видам силуэта. Ключ без позиции на картах
 * уходит в передний вид и просто не отрисуется без координат.
 */
export function splitMusclesByView(targetMuscles: readonly MuscleKey[]): MuscleViews {
  const front: MuscleKey[] = [];
  const back: MuscleKey[] = [];
  for (const muscle of targetMuscles) {
    const inFront = FRONT_VIEW_MUSCLES.includes(muscle);
    const inBack = BACK_VIEW_MUSCLES.includes(muscle);
    if (inFront) front.push(muscle);
    if (inBack) back.push(muscle);
    if (!inFront && !inBack) front.push(muscle);
  }
  return { front, back };
}
