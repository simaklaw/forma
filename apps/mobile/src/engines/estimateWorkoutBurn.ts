/**
 * Estimate active calories from logged sets for a local dateKey.
 * Pure — no RN, no Date.now() (caller passes dateKey + bodyKg).
 *
 * Model: resistance training ~6 MET, duration proxy from set count.
 * Falls back to 0 when bodyKg invalid or no sets.
 */

import type { SetLogEntry } from '@forma/core';

const MET_RESISTANCE = 6;
const MINUTES_PER_SET = 2.5; // work + rest proxy
const MAX_BURN_KCAL = 1200;

export function estimateWorkoutBurnKcal(
  setLogs: SetLogEntry[],
  dateKey: string,
  bodyKg: number | null | undefined
): number {
  if (typeof bodyKg !== 'number' || !Number.isFinite(bodyKg) || bodyKg <= 0) {
    return 0;
  }
  const today = setLogs.filter((e) => e.dateKey === dateKey);
  if (today.length === 0) return 0;

  const minutes = Math.max(MINUTES_PER_SET, today.length * MINUTES_PER_SET);
  // 0.0175 * MET * kg * min ≈ kcal
  const kcal = 0.0175 * MET_RESISTANCE * bodyKg * minutes;
  return Math.min(MAX_BURN_KCAL, Math.round(kcal));
}
