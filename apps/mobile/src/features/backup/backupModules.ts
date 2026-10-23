import type { useFitPulseStore } from '@/state/useFitPulseStore';

type AppStore = ReturnType<typeof useFitPulseStore.getState>;

/** Часть стора, которую умеет выборочно восстановить hydrate. */
export type BackupState = Pick<
  AppStore,
  | 'profile'
  | 'metabolic'
  | 'todayMeals'
  | 'customFoods'
  | 'savedMeals'
  | 'waterGlasses'
  | 'weightHistory'
  | 'bodyMeasurements'
  | 'setLogs'
  | 'importedActivities'
  | 'dayProgress'
  | 'personalRecords'
>;

export type BackupModuleId = 'profile' | 'nutrition' | 'workout' | 'body';

/** Поля стора, входящие в каждый модуль бэкапа. */
export const MODULE_FIELDS: Record<BackupModuleId, (keyof BackupState)[]> = {
  profile: ['profile', 'metabolic'],
  nutrition: ['todayMeals', 'customFoods', 'savedMeals', 'waterGlasses'],
  workout: ['setLogs', 'dayProgress', 'personalRecords', 'importedActivities'],
  body: ['weightHistory', 'bodyMeasurements']
};

export interface BackupDocument {
  format: 'fitpulse-backup';
  version: 2;
  exportedAt: string;
  modules: Partial<Record<BackupModuleId, Record<string, unknown>>>;
}

export type ParsedBackup =
  | { kind: 'modular'; modules: Partial<Record<BackupModuleId, Record<string, unknown>>> }
  | { kind: 'legacy'; data: Record<string, unknown> };

/**
 * Модульный документ бэкапа: в modules — только выбранные пользователем
 * модули с их полями стора (паттерн free-fitness: экспорт по частям).
 */
export function buildBackupDocument(
  ids: BackupModuleId[],
  state: Partial<BackupState>,
  now: Date = new Date()
): BackupDocument {
  const modules: BackupDocument['modules'] = {};
  for (const id of ids) {
    const fields: Record<string, unknown> = {};
    for (const field of MODULE_FIELDS[id]) {
      const value = (state as Record<string, unknown>)[field];
      if (value !== undefined) {
        fields[field] = value;
      }
    }
    modules[id] = fields;
  }
  return { format: 'fitpulse-backup', version: 2, exportedAt: now.toISOString(), modules };
}

/**
 * Разбор файла бэкапа: модульный (v2) или старый полный дамп (legacy,
 * распознаётся по полю profile наверху — восстанавливается через hydrate).
 */
export function parseBackupDocument(text: string): ParsedBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Backup file has none of the expected fields');
  }
  if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Backup file has none of the expected fields');
  }
  const record = parsed as Record<string, unknown>;
  if (
    record.format === 'fitpulse-backup' &&
    record.modules != null &&
    typeof record.modules === 'object' &&
    !Array.isArray(record.modules)
  ) {
    const raw = record.modules as Record<string, unknown>;
    const modules: Partial<Record<BackupModuleId, Record<string, unknown>>> = {};
    let count = 0;
    for (const id of Object.keys(MODULE_FIELDS) as BackupModuleId[]) {
      const candidate = raw[id];
      if (candidate != null && typeof candidate === 'object' && !Array.isArray(candidate)) {
        modules[id] = candidate as Record<string, unknown>;
        count += 1;
      }
    }
    if (count === 0) {
      throw new Error('Backup file has none of the expected fields');
    }
    return { kind: 'modular', modules };
  }
  if (
    record.profile != null &&
    typeof record.profile === 'object' &&
    !Array.isArray(record.profile)
  ) {
    return { kind: 'legacy', data: record };
  }
  throw new Error('Backup file has none of the expected fields');
}
