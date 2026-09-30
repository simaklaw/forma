import { createLogger } from '@/core/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';

const log = createLogger('health-sync-prefs');

const ENABLED_KEY = '@fitpulse/health_connect_export_enabled';
const LAST_EXPORT_KEY = '@fitpulse/health_connect_last_export_at';

export async function isHealthExportEnabled(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(ENABLED_KEY);
    return v === '1';
  } catch {
    return false;
  }
}

export async function setHealthExportEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(ENABLED_KEY, enabled ? '1' : '0');
  if (!enabled) {
    try {
      await AsyncStorage.removeItem(LAST_EXPORT_KEY);
    } catch (err) {
      log.debug('clear last export failed', {
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

/** ISO timestamp of last successful HC write, or null. */
export async function getLastHealthExportAt(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_EXPORT_KEY);
  } catch {
    return null;
  }
}

export async function markHealthExportSuccess(
  atMs: number = Date.now(),
): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_EXPORT_KEY, new Date(atMs).toISOString());
  } catch (err) {
    log.warn('markHealthExportSuccess failed', {
      err: err instanceof Error ? err.message : String(err),
    });
  }
}
