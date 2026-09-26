import { Platform } from 'react-native';
import { createLogger } from '@/core/logger';
import { mapSessionToHealthWorkout, type SessionBurnInput } from './mapWorkoutToHealth';
import type { HealthSyncStatus, HealthWorkoutExport } from './types';

const log = createLogger('health-connect');

/**
 * Health Connect facade (Android). iOS/web → unsupported.
 * Native bridge (react-native-health-connect) is wired in a later step;
 * for now we validate payloads and report availability honestly.
 */
export class HealthConnectService {
  static async getStatus(): Promise<HealthSyncStatus> {
    if (Platform.OS !== 'android') return 'unsupported';
    // Native module not linked in this phase — device still needs Health Connect app.
    return 'unavailable';
  }

  /**
   * Build export payload for a completed session. Does not write to Health Connect yet.
   */
  static buildWorkoutExport(input: SessionBurnInput): HealthWorkoutExport | null {
    const payload = mapSessionToHealthWorkout(input);
    if (!payload) {
      log.warn('skip export: invalid session payload');
      return null;
    }
    return payload;
  }

  /**
   * Placeholder write — returns false until native client is integrated.
   */
  static async writeWorkout(_payload: HealthWorkoutExport): Promise<boolean> {
    const status = await HealthConnectService.getStatus();
    if (status !== 'ready') {
      log.info(`writeWorkout skipped, status=${status}`);
      return false;
    }
    return false;
  }
}
