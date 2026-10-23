import type { ExerciseDef } from './ExerciseSheet';
import type { Sex } from '@/engines/MetabolicEngine';
import { WORKOUT_PLAN as HOME_PLAN, type WorkoutDay } from './bodyweightPlan';
import { GYM_PLAN } from './gymPlan';
import { planForSex } from './sexPlan';
import { allImportedExerciseMeta, allImportedExerciseMuscles } from './importedExerciseBridge';
import type { MuscleKey } from '@/domain/muscleKeys';

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

/**
 * Prefer mediaKey (EXERCISE_MET id) for calorie estimation; fall back to display name.
 * Display names stay in allExerciseNames() for UI labels.
 */
export function allExerciseMetKeys(): Record<number, string> {
  return Object.fromEntries(
    [...GYM_PLAN, ...HOME_PLAN].flatMap((day) =>
      day.exercises.map((ex) => [ex.id, ex.mediaKey ?? ex.name])
    )
  );
}

/** exerciseId → целевые мышцы (планы + импортированная библиотека). */
export function allExerciseMuscles(): Record<number, MuscleKey[]> {
  const out: Record<number, MuscleKey[]> = {};
  for (const day of [...GYM_PLAN, ...HOME_PLAN]) {
    for (const ex of day.exercises) out[ex.id] = ex.targetMuscles;
  }
  return { ...out, ...allImportedExerciseMuscles() };
}

/** Category/equipment meta for imported-library numeric ids (burn estimates). */
export function allExerciseBurnMeta(): Record<number, { category: string; equipment: string }> {
  return allImportedExerciseMeta();
}
