/**
 * Gender-specific plan variants on top of frozen gym/home catalogs.
 * Exercise ids 1–30 stay frozen; only loads, reps, day order and labels change.
 */
import type { Sex } from '@/engines/MetabolicEngine';
import type { ExerciseDef } from './ExerciseSheet';
import type { WorkoutDay } from './bodyweightPlan';
import { WORKOUT_PLAN as HOME_BASE } from './bodyweightPlan';
import { GYM_PLAN as GYM_BASE } from './gymPlan';

function cloneDay(day: WorkoutDay): WorkoutDay {
  return {
    ...day,
    exercises: day.exercises.map((ex) => ({ ...ex, targetMuscles: [...ex.targetMuscles] }))
  };
}

function scaleGymExercise(ex: ExerciseDef, factor: number, repBoost: number): ExerciseDef {
  if (!(ex.workingWeight > 0)) return { ...ex };
  const nextW = Math.max(4, Math.round((ex.workingWeight * factor) / 2) * 2);
  return {
    ...ex,
    workingWeight: nextW,
    workingReps: Math.min(20, ex.workingReps + repBoost)
  };
}

/** Female gym: ~55–60% of male starter loads, slightly higher reps. */
function femaleGymPlan(): WorkoutDay[] {
  return GYM_BASE.map((day) => {
    const d = cloneDay(day);
    d.meta = `${d.meta} · женский план`;
    d.exercises = d.exercises.map((ex) => scaleGymExercise(ex, 0.58, 2));
    return d;
  });
}

/** Male gym: base catalog (strength bias). */
function maleGymPlan(): WorkoutDay[] {
  return GYM_BASE.map((day) => {
    const d = cloneDay(day);
    d.meta = `${d.meta} · мужской план`;
    return d;
  });
}

const FEMALE_HOME_ORDER = ['glutes', 'legs', 'core', 'chest', 'back', 'arms', 'full-home'];
const MALE_HOME_ORDER = ['chest', 'back', 'legs', 'core', 'arms', 'glutes', 'full-home'];

function reorderHome(base: WorkoutDay[], order: string[], label: string): WorkoutDay[] {
  const byId = new Map(base.map((d) => [d.id, d]));
  const ordered: WorkoutDay[] = [];
  for (const id of order) {
    const day = byId.get(id);
    if (day) ordered.push(cloneDay(day));
  }
  for (const day of base) {
    if (!order.includes(day.id)) ordered.push(cloneDay(day));
  }
  return ordered.map((d) => ({
    ...d,
    meta: `${d.meta} · ${label}`
  }));
}

/** Female home: glutes/legs first; same exercise ids. */
function femaleHomePlan(): WorkoutDay[] {
  return reorderHome(HOME_BASE, FEMALE_HOME_ORDER, 'женский план');
}

function maleHomePlan(): WorkoutDay[] {
  return reorderHome(HOME_BASE, MALE_HOME_ORDER, 'мужской план');
}

export function planForSex(mode: 'gym' | 'home', sex: Sex): WorkoutDay[] {
  if (mode === 'gym') {
    return sex === 'female' ? femaleGymPlan() : maleGymPlan();
  }
  return sex === 'female' ? femaleHomePlan() : maleHomePlan();
}
