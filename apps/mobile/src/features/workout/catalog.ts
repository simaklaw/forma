import type { ExerciseDef } from './ExerciseSheet';
import type { Sex } from '@/engines/MetabolicEngine';
import { WORKOUT_PLAN as HOME_PLAN, type WorkoutDay } from './bodyweightPlan';
import { GYM_PLAN } from './gymPlan';
import { planForSex } from './sexPlan';

export type TrainingMode = 'gym' | 'home';
export type { WorkoutDay };

/** Base catalogs (sex-neutral). Prefer catalogFor(mode, sex) in UI. */
export const CATALOGS: Record<TrainingMode, WorkoutDay[]> = {
  gym: GYM_PLAN,
  home: HOME_PLAN
};

/**
 * Plan for training mode + profile sex.
 * Sex is required after onboarding; when null, male plan is used as fallback only in tests.
 */
export function catalogFor(mode: TrainingMode, sex: Sex | null = 'male'): WorkoutDay[] {
  const resolved: Sex = sex === 'female' ? 'female' : 'male';
  return planForSex(mode, resolved);
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
