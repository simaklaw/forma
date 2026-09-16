import { calculateBurnedCalories } from "../engines/MetabolicEngine.ts";

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
