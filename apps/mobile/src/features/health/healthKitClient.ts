/**
 * Optional native bridge to @kingstinct/react-native-healthkit (Apple HealthKit, iOS).
 * Safe when the package is not installed (Jest, web, Expo Go):
 * all methods resolve to null / false.
 *
 * Path: FitPulse → Apple Здоровье (HealthKit), iOS counterpart of Health Connect.
 * Write-only: workouts, active energy and body mass.
 */

export interface HealthKitWorkoutSaveOptions {
  end?: Date;
  totals?: {
    distance?: number;
    energyBurned?: number;
  };
  metadata?: Record<string, unknown>;
}

export interface HealthKitNative {
  isHealthDataAvailable: () => Promise<boolean>;
  requestAuthorization: (
    read: readonly string[],
    write: readonly string[]
  ) => Promise<boolean>;
  saveWorkoutSample: (
    typeIdentifier: number,
    quantities: readonly unknown[],
    start: Date,
    options?: HealthKitWorkoutSaveOptions
  ) => Promise<string | null>;
  saveQuantitySample: (
    identifier: string,
    unit: string,
    value: number,
    options?: {
      start?: Date;
      end?: Date;
      metadata?: Record<string, unknown>;
    }
  ) => Promise<boolean>;
}

let cached: HealthKitNative | null | undefined;

export function getHealthKitNative(): HealthKitNative | null {
  if (cached !== undefined) return cached;
  try {
    // Dynamic require — must not be a static import (breaks web/Jest without native).
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@kingstinct/react-native-healthkit') as HealthKitNative;
    if (mod && typeof mod.isHealthDataAvailable === 'function') {
      cached = mod;
      return cached;
    }
  } catch {
    // package not linked
  }
  cached = null;
  return null;
}
