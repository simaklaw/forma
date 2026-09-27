import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@fitpulse/health_connect_export_enabled';

export async function isHealthExportEnabled(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v === '1';
  } catch {
    return false;
  }
}

export async function setHealthExportEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY, enabled ? '1' : '0');
}
