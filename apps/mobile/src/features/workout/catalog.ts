import type { ExerciseDef } from './ExerciseSheet';
import { WORKOUT_PLAN as HOME_PLAN, type WorkoutDay } from './bodyweightPlan';
import { GYM_PLAN } from './gymPlan';

export type TrainingMode = 'gym' | 'home';
export type { WorkoutDay };

export const CATALOGS: Record<TrainingMode, WorkoutDay[]> = {
  gym: GYM_PLAN,
  home: HOME_PLAN
};

export function catalogFor(mode: TrainingMode): WorkoutDay[] {
  return CATALOGS[mode] ?? GYM_PLAN;
}

export function isBodyweightExercise(ex: Pick<ExerciseDef, 'workingWeight'>): boolean {
  return !(Number.isFinite(ex.workingWeight) && ex.workingWeight > 0);
}

/** Load for session/1RM: gym default, or body mass for home catalog. */
export function resolveWorkingLoadKg(ex: Pick<ExerciseDef, 'workingWeight'>, bodyKg: number): number {
  if (isBodyweightExercise(ex)) {
    return Number.isFinite(bodyKg) && bodyKg > 0 ? bodyKg : 0;
  }
  return ex.workingWeight;
}

export function formatLoadLabel(ex: Pick<ExerciseDef, 'workingWeight'>, bodyKg?: number): string {
  if (isBodyweightExercise(ex)) {
    const kg = Number.isFinite(bodyKg) && (bodyKg as number) > 0 ? ` · ${bodyKg} кг` : '';
    return `свой вес${kg}`;
  }
  return `${ex.workingWeight} кг`;
}

export function allExerciseNames(): Record<number, string> {
  return Object.fromEntries(
    [...GYM_PLAN, ...HOME_PLAN].flatMap((day) => day.exercises.map((ex) => [ex.id, ex.name]))
  );
}
