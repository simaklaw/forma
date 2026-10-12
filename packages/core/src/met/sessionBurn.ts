import { calculateBurnedCalories, rpeFromRir } from "../engines/MetabolicEngine.ts";
import { metForExercise, metForImportedExercise } from "./exerciseMet.ts";
import type { SetLogEntry } from "../engines/WorkoutStats.ts";

function isValidWeightKg(weightKg: number): boolean {
  return Number.isFinite(weightKg) && weightKg > 0;
}

export function estimateSessionBurnKcal(args: {
  weightKg: number;
  setsCompleted: number;
  minutesPerSet?: number;
  met?: number;
}): number {
  if (args.setsCompleted <= 0 || !isValidWeightKg(args.weightKg)) return 0;
  const minutes = args.setsCompleted * (args.minutesPerSet ?? 1.2);
  return calculateBurnedCalories(args.met ?? 5.0, args.weightKg, minutes);
}

export function estimateBurnFromSetLogs(args: {
  weightKg: number;
  setLogs: SetLogEntry[];
  dateKey: string;
  exerciseNames?: Record<number, string>;
  exerciseMeta?: Record<number, { category: string; equipment: string }>;
  minutesPerSet?: number;
}): number {
  if (!isValidWeightKg(args.weightKg) || args.setLogs.length === 0) return 0;
  const minutesPerSet = args.minutesPerSet ?? 1.2;
  let total = 0;
  for (const entry of args.setLogs) {
    if (entry.dateKey !== args.dateKey) continue;
    const name = args.exerciseNames?.[entry.exerciseId] ?? String(entry.exerciseId);
    const meta = args.exerciseMeta?.[entry.exerciseId];
    const met = meta
      ? metForImportedExercise(meta.category, meta.equipment)
      : metForExercise(name);
    let rpe: number | undefined;
    if (Number.isFinite(entry.rir) && entry.rir >= 0 && entry.rir <= 10) {
      rpe = rpeFromRir(entry.rir);
    }
    total += calculateBurnedCalories(met, args.weightKg, minutesPerSet, rpe);
  }
  return Math.round(total);
}

export interface DayBurn {
  dateKey: string;
  kcal: number;
}

export function estimateDailyBurns(args: {
  weightKg: number;
  setLogs: SetLogEntry[];
  dateKeys: string[];
  exerciseNames?: Record<number, string>;
  exerciseMeta?: Record<number, { category: string; equipment: string }>;
  minutesPerSet?: number;
}): DayBurn[] {
  return args.dateKeys.map((dateKey) => ({
    dateKey,
    kcal: estimateBurnFromSetLogs({
      weightKg: args.weightKg,
      setLogs: args.setLogs,
      dateKey,
      exerciseNames: args.exerciseNames,
      exerciseMeta: args.exerciseMeta,
      minutesPerSet: args.minutesPerSet,
    }),
  }));
}
