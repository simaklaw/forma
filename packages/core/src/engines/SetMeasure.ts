/**
 * SetMeasure — how a set is counted: repetitions or seconds under load.
 *
 * Concept (per-exercise "measure: reps | seconds") borrowed clean-room from
 * the GymBells review; code and integration are original. The numeric set
 * amount stays a single field; the measure only defines its semantics and
 * the units the UI renders next to it.
 */

export type SetMeasure = "reps" | "seconds";

/** Stepper step per measure: reps ±1, seconds ±5. */
export const MEASURE_STEP: Record<SetMeasure, number> = {
  reps: 1,
  seconds: 5,
};

/** Normalizes a persisted or parsed value into a valid measure. */
export function resolveSetMeasure(value: unknown): SetMeasure {
  return value === "seconds" ? "seconds" : "reps";
}

export function isTimedMeasure(measure: SetMeasure): boolean {
  return measure === "seconds";
}

/** Stepper step for a measure: 1 for reps, 5 for seconds. */
export function measureStep(measure: SetMeasure): number {
  return MEASURE_STEP[measure];
}

export interface MeasureUnits {
  /** Suffix for rep counts (usually empty — the number stands alone). */
  reps: string;
  /** Suffix for timed amounts, e.g. "s" / "с". */
  seconds: string;
}

/** Renders a bare number for reps and appends the unit for timed sets. */
export function formatSetAmount(
  measure: SetMeasure,
  amount: number,
  units: MeasureUnits,
): string {
  const value = Number.isFinite(amount) ? amount : 0;
  return measure === "seconds" ? `${value}${units.seconds}` : `${value}`;
}

/**
 * Steps the set amount by one measure step, snapping the result onto the
 * step grid (odd history values like 43s settle to 40s/45s) and keeping
 * it positive.
 */
export function stepSetAmount(
  measure: SetMeasure,
  amount: number,
  direction: 1 | -1,
): number {
  const step = measureStep(measure);
  const next = Math.round((amount + direction * step) / step) * step;
  return Math.max(step, next);
}
