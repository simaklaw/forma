import { Platform } from 'react-native';
import { createLogger } from '@/core/logger';
import { mapSessionToHealthWorkout, type SessionBurnInput } from './mapWorkoutToHealth';
import { mapHealthWorkoutToHealthKit } from './mapWorkoutToHealthKit';
import {
  HK_TYPE_BODY_MASS,
  HK_UNIT_KILOGRAM,
  HK_WORKOUT_TYPE
} from './mapWorkoutToHealthKit';
import { getHealthKitNative } from './healthKitClient';
import { isHealthExportEnabled } from './healthSyncPrefs';
import type { HealthSyncStatus, HealthWorkoutExport } from './types';

const log = createLogger('health-kit');

/**
 * Apple HealthKit facade (iOS only) — counterpart of HealthConnectService.
 * Writes completed strength workouts (with active energy) and body mass into
 * Apple Здоровье. Write-only, no reads.
 *
 * HealthKit quirk: write permission status is not observable — if the user
 * denies, writes are silently dropped by the system (no error). The UI card
 * hints the user to check Settings › Health.
 */
export class HealthKitService {
  static async getStatus(): Promise<HealthSyncStatus> {
    if (Platform.OS !== 'ios') return 'unsupported';

    const native = getHealthKitNative();
    if (!native) return 'unavailable';

    try {
      const available = await native.isHealthDataAvailable();
      return available ? 'ready' : 'unavailable';
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

  /** Request write permissions for workouts + body mass (shows the HealthKit sheet). */
  static async requestWriteAccess(): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    const native = getHealthKitNative();
    if (!native) return false;

    try {
      const ok = await native.requestAuthorization([], [HK_WORKOUT_TYPE, HK_TYPE_BODY_MASS]);
      log.info('requestWriteAccess', { granted: ok });
      return ok;
    } catch (err) {
      log.warn('requestWriteAccess failed', {
        err: err instanceof Error ? err.message : String(err)
      });
      return false;
    }
  }

  /**
   * Write workout + active energy into Apple Здоровье.
   * No-op when disabled in prefs, unsupported, or native missing.
   */
  static async writeWorkout(payload: HealthWorkoutExport): Promise<boolean> {
    if (!(await isHealthExportEnabled())) {
      log.debug('writeWorkout skipped: export disabled in prefs');
      return false;
    }

    const status = await HealthKitService.getStatus();
    if (status !== 'ready') {
      log.info(`writeWorkout skipped, status=${status}`);
      return false;
    }

    const plan = mapHealthWorkoutToHealthKit(payload);
    if (!plan) {
      log.warn('skip HealthKit export: invalid payload');
      return false;
    }

    const native = getHealthKitNative();
    if (!native) return false;

    try {
      const uuid = await native.saveWorkoutSample(
        plan.activityType,
        [],
        plan.start,
        {
          end: plan.end,
          totals: { energyBurned: plan.energyBurnedKcal },
          metadata: { HKSyncIdentifier: plan.syncId }
        }
      );
      log.info('writeWorkout ok', { sessionId: payload.sessionId, uuid });
      return true;
    } catch (err) {
      log.warn('writeWorkout failed', {
        err: err instanceof Error ? err.message : String(err)
      });
      return false;
    }
  }

  /**
   * Best-effort body mass sample. No-op if export disabled or native missing.
   * Never throws. Never invents a default body mass.
   */
  static async writeWeightKg(weightKg: number, atMs: number = Date.now()): Promise<boolean> {
    try {
      if (!(await isHealthExportEnabled())) return false;
      if (typeof weightKg !== 'number' || !Number.isFinite(weightKg) || weightKg <= 0) return false;

      const status = await HealthKitService.getStatus();
      if (status !== 'ready') return false;

      const native = getHealthKitNative();
      if (!native) return false;

      const at = new Date(atMs);
      await native.saveQuantitySample(HK_TYPE_BODY_MASS, HK_UNIT_KILOGRAM, weightKg, {
        start: at,
        end: at,
        metadata: { HKSyncIdentifier: `fitpulse-weight-${atMs}` }
      });
      log.info('writeWeightKg ok');
      return true;
    } catch (err) {
      log.debug('writeWeightKg swallowed', {
        err: err instanceof Error ? err.message : String(err)
      });
      return false;
    }
  }

  /** Map completed session → HealthKit write (best-effort, never throws). */
  static async exportCompletedSession(input: SessionBurnInput): Promise<void> {
    try {
      const payload = HealthKitService.buildWorkoutExport(input);
      if (!payload) return;
      await HealthKitService.writeWorkout(payload);
    } catch (err) {
      log.debug('exportCompletedSession swallowed', {
        err: err instanceof Error ? err.message : String(err)
      });
    }
  }
}
