import { Platform } from 'react-native';
import { createLogger } from '@/core/logger';
import { mapSessionToHealthWorkout, type SessionBurnInput } from './mapWorkoutToHealth';
import {
  getHealthConnectNative,
  openHealthConnectSettings,
  WRITE_WEIGHT_PERMISSIONS,
  WRITE_WORKOUT_PERMISSIONS
} from './nativeClient';
import { isHealthExportEnabled } from './healthSyncPrefs';
import type { HealthSyncStatus, HealthWorkoutExport } from './types';

const log = createLogger('health-connect');

/**
 * Health Connect facade (Android only).
 * Samsung Health consumes HC records when the user enables Health Connect sync in Samsung Health.
 * No Google Fit API.
 */
export class HealthConnectService {
  static async getStatus(): Promise<HealthSyncStatus> {
    if (Platform.OS !== 'android') return 'unsupported';

    const native = getHealthConnectNative();
    if (!native) return 'unavailable';

    try {
      const ok = await native.initialize();
      if (!ok) return 'unavailable';

      const status = await native.getSdkStatus();
      const avail = native.SdkAvailabilityStatus?.SDK_AVAILABLE;
      if (typeof avail === 'number' && status !== avail) {
        return 'unavailable';
      }

      if (typeof native.getGrantedPermissions === 'function') {
        try {
          const granted = await native.getGrantedPermissions();
          const hasExerciseWrite =
            Array.isArray(granted) &&
            granted.some((p) => p.recordType === 'ExerciseSession' && p.accessType === 'write');
          if (Array.isArray(granted) && granted.length > 0 && !hasExerciseWrite) {
            return 'denied';
          }
        } catch {
          // older native builds may lack getGrantedPermissions
        }
      }

      return 'ready';
    } catch (err) {
      log.warn('getStatus failed', {
        err: err instanceof Error ? err.message : String(err)
      });
      return 'error';
    }
  }

  static buildWorkoutExport(input: SessionBurnInput): HealthWorkoutExport | null {
    const payload = mapSessionToHealthWorkout(input);
    if (!payload) {
      log.warn('skip export: invalid session payload');
      return null;
    }
    return payload;
  }

  /** Open system Health Connect settings (permissions / data sources). */
  static openSettings(): boolean {
    return openHealthConnectSettings();
  }

  /** Request write permissions for exercise + active calories (+ weight). */
  static async requestWriteAccess(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    const native = getHealthConnectNative();
    if (!native) return false;

    try {
      await native.initialize();
      const granted = await native.requestPermission([
        ...WRITE_WORKOUT_PERMISSIONS,
        ...WRITE_WEIGHT_PERMISSIONS
      ]);
      const ok =
        Array.isArray(granted) &&
        granted.some((p) => p.recordType === 'ExerciseSession' && p.accessType === 'write');
      log.info('requestWriteAccess', { granted: ok, count: granted?.length ?? 0 });
      return ok;
    } catch (err) {
      log.warn('requestWriteAccess failed', {
        err: err instanceof Error ? err.message : String(err)
      });
      return false;
    }
  }

  /**
   * Write exercise session + active calories to Health Connect.
   * No-op when disabled in prefs, unsupported, or native missing.
   */
  static async writeWorkout(payload: HealthWorkoutExport): Promise<boolean> {
    if (!(await isHealthExportEnabled())) {
      log.debug('writeWorkout skipped: export disabled in prefs');
      return false;
    }

    const status = await HealthConnectService.getStatus();
    if (status !== 'ready') {
      log.info(`writeWorkout skipped, status=${status}`);
      return false;
    }

    const native = getHealthConnectNative();
    if (!native) return false;

    try {
      const records = [
        {
          recordType: 'ExerciseSession',
          startTime: payload.startTime,
          endTime: payload.endTime,
          exerciseType: payload.exerciseType,
          title: payload.title,
          metadata: {
            clientRecordId: `fitpulse-${payload.sessionId}`
          }
        },
        {
          recordType: 'ActiveCaloriesBurned',
          startTime: payload.startTime,
          endTime: payload.endTime,
          energy: {
            value: payload.activeCaloriesKcal,
            unit: 'kilocalorie'
          },
          metadata: {
            clientRecordId: `fitpulse-kcal-${payload.sessionId}`
          }
        }
      ];

      await native.insertRecords(records);
      log.info('writeWorkout ok', { sessionId: payload.sessionId });
      return true;
    } catch (err) {
      log.warn('writeWorkout failed', {
        err: err instanceof Error ? err.message : String(err)
      });
      return false;
    }
  }

  /**
   * Best-effort body weight sample. No-op if export disabled or native missing.
   * Never throws. Never invents a default body mass.
   */
  static async writeWeightKg(weightKg: number, atMs: number = Date.now()): Promise<boolean> {
    try {
      if (!(await isHealthExportEnabled())) return false;
      if (typeof weightKg !== 'number' || !Number.isFinite(weightKg) || weightKg <= 0) return false;

      const status = await HealthConnectService.getStatus();
      if (status !== 'ready') return false;

      const native = getHealthConnectNative();
      if (!native) return false;

      const time = new Date(atMs).toISOString();
      await native.insertRecords([
        {
          recordType: 'Weight',
          time,
          weight: { value: weightKg, unit: 'kilograms' },
          metadata: {
            clientRecordId: `fitpulse-weight-${atMs}`
          }
        }
      ]);
      log.info('writeWeightKg ok');
      return true;
    } catch (err) {
      log.debug('writeWeightKg swallowed', {
        err: err instanceof Error ? err.message : String(err)
      });
      return false;
    }
  }

  /** Map completed session → HC write (best-effort, never throws). */
  static async exportCompletedSession(input: SessionBurnInput): Promise<void> {
    try {
      const payload = HealthConnectService.buildWorkoutExport(input);
      if (!payload) return;
      await HealthConnectService.writeWorkout(payload);
    } catch (err) {
      log.debug('exportCompletedSession swallowed', {
        err: err instanceof Error ? err.message : String(err)
      });
    }
  }
}
