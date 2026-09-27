/**
 * Optional native bridge to react-native-health-connect.
 * Safe when the package is not installed (Jest, web, Expo Go):
 * all methods resolve to null / false.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export type HcPermission = { accessType: 'read' | 'write'; recordType: string };

export interface HealthConnectNative {
  initialize: () => Promise<boolean>;
  getSdkStatus: () => Promise<number>;
  requestPermission: (permissions: HcPermission[]) => Promise<HcPermission[]>;
  insertRecords: (records: unknown[]) => Promise<string[]>;
  SdkAvailabilityStatus: {
    SDK_AVAILABLE: number;
    SDK_UNAVAILABLE: number;
    SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED: number;
  };
}

let cached: HealthConnectNative | null | undefined;

export function getHealthConnectNative(): HealthConnectNative | null {
  if (cached !== undefined) return cached;
  try {
    // Dynamic require — must not be a static import (breaks web/Jest without native).
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-health-connect') as HealthConnectNative;
    if (mod && typeof mod.initialize === 'function') {
      cached = mod;
      return cached;
    }
  } catch {
    // package not linked
  }
  cached = null;
  return null;
}

export const WRITE_WORKOUT_PERMISSIONS: HcPermission[] = [
  { accessType: 'write', recordType: 'ExerciseSession' },
  { accessType: 'write', recordType: 'ActiveCaloriesBurned' }
];
