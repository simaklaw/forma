import { calculateBurnedCalories } from "../engines/MetabolicEngine.ts";
import { metForExercise } from "./exerciseMet.ts";
import type { SetLogEntry } from "../engines/WorkoutStats.ts";

/**
 * Rough session burn from logged sets.
 * Default: ~1.2 min effective work per set at MET 5 (strength training).
 */
export function estimateSessionBurnKcal(args: {
  weightKg: number;
  setsCompleted: number;
  minutesPerSet?: number;
  met?: number;
}): number {
  if (args.setsCompleted <= 0 || args.weightKg <= 0) return 0;
  const minutes = args.setsCompleted * (args.minutesPerSet ?? 1.2);
  return calculateBurnedCalories(args.met ?? 5.0, args.weightKg, minutes);
}

/**
 * Aggregate burned kcal from set logs for a single dateKey using exercise name → MET.
 * Falls back to generic strength MET when name is unknown.
 */
export function estimateBurnFromSetLogs(args: {
  weightKg: number;
  setLogs: SetLogEntry[];
  dateKey: string;
  exerciseNames?: Record<number, string>;
  minutesPerSet?: number;
}): number {
  if (args.weightKg <= 0 || args.setLogs.length === 0) return 0;
  const minutesPerSet = args.minutesPerSet ?? 1.2;
  let total = 0;
  for (const entry of args.setLogs) {
    if (entry.dateKey !== args.dateKey) continue;
    const name = args.exerciseNames?.[entry.exerciseId] ?? String(entry.exerciseId);
    const met = metForExercise(name);
    total += calculateBurnedCalories(met, args.weightKg, minutesPerSet);
  }
  return Math.round(total);
}

export interface DayBurn {
  dateKey: string;
  kcal: number;
}

/** Burn per day over an ordered list of dateKeys (e.g. last 7 days). */
export function estimateDailyBurns(args: {
  weightKg: number;
  setLogs: SetLogEntry[];
  dateKeys: string[];
  exerciseNames?: Record<number, string>;
  minutesPerSet?: number;
}): DayBurn[] {
  return args.dateKeys.map((dateKey) => ({
    dateKey,
    kcal: estimateBurnFromSetLogs({
      weightKg: args.weightKg,
      setLogs: args.setLogs,
      dateKey,
      exerciseNames: args.exerciseNames,
      minutesPerSet: args.minutesPerSet,
    }),
  }));
}
