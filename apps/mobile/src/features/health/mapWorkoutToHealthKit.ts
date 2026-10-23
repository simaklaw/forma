import type { HealthWorkoutExport } from './types';

/** HKWorkoutActivityType.traditionalStrengthTraining (Apple constant, stable). */
export const HK_ACTIVITY_TRADITIONAL_STRENGTH = 50;

/** HKSampleTypeIdentifier for workouts (write permission target). */
export const HK_WORKOUT_TYPE = 'HKWorkoutTypeIdentifier';

/** HKQuantityTypeIdentifier.bodyMass (write permission target). */
export const HK_TYPE_BODY_MASS = 'HKQuantityTypeIdentifierBodyMass';

/** HKUnit: kilogram (HKMetricPrefix.Kilo + g). */
export const HK_UNIT_KILOGRAM = 'kg';

export interface HealthKitWorkoutPlan {
  start: Date;
  end: Date;
  activityType: number;
  /** Total active energy in kilocalories. */
  energyBurnedKcal: number;
  /** Idempotency metadata (HKSyncIdentifier). */
  syncId: string;
}

/**
 * Maps a platform-agnostic HealthWorkoutExport into an Apple HealthKit save plan.
 * Pure: no native modules, safe for Jest and web.
 */
export function mapHealthWorkoutToHealthKit(
  payload: HealthWorkoutExport,
  nowMs: number = Date.now()
): HealthKitWorkoutPlan | null {
  if (!payload.sessionId.trim()) return null;
  if (!Number.isFinite(payload.activeCaloriesKcal) || payload.activeCaloriesKcal < 0) return null;

  const startMs = Date.parse(payload.startTime);
  const endMs = Date.parse(payload.endTime);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  if (endMs < startMs) return null;
  // Reject future-dated sessions beyond clock skew tolerance
  if (startMs > nowMs + 5 * 60 * 1000) return null;

  return {
    start: new Date(startMs),
    end: new Date(endMs),
    activityType: HK_ACTIVITY_TRADITIONAL_STRENGTH,
    energyBurnedKcal: Math.round(payload.activeCaloriesKcal),
    syncId: `fitpulse-${payload.sessionId}`
  };
}
