/**
 * Optional native bridge to react-native-health-connect.
 * Safe when the package is not installed (Jest, web, Expo Go):
 * all methods resolve to null / false.
 *
 * Path: FitPulse → Health Connect → Samsung Health (user enables HC sync in SH).
 * Not Google Fit.
 */

export type HcPermission = { accessType: 'read' | 'write'; recordType: string };

export interface HealthConnectNative {
  initialize: () => Promise<boolean>;
  getSdkStatus: () => Promise<number>;
  requestPermission: (permissions: HcPermission[]) => Promise<HcPermission[]>;
  insertRecords: (records: unknown[]) => Promise<string[]>;
  getGrantedPermissions?: () => Promise<HcPermission[]>;
  openHealthConnectSettings?: () => void;
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

export const WRITE_WEIGHT_PERMISSIONS: HcPermission[] = [
  { accessType: 'write', recordType: 'Weight' }
];

export function openHealthConnectSettings(): boolean {
  const native = getHealthConnectNative();
  if (!native?.openHealthConnectSettings) return false;
  try {
    native.openHealthConnectSettings();
    return true;
  } catch {
    return false;
  }
}
