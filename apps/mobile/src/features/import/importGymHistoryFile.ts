import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { parseGymCsv } from '@forma/core';
import { allExerciseNames } from '@/features/workout/catalog';
import { allImportedExerciseNames } from '@/features/workout/importedExerciseBridge';
import {
  buildGymNameIndex,
  matchGymCsvSets,
  type GymHistoryDraft,
  type GymNameIndex
} from './matchGymExercises';

export type { GymHistoryDraft };

export type GymHistoryImportOutcome = {
  drafts: GymHistoryDraft[];
  unmatchedNames: string[];
  warnings: string[];
  cancelled: boolean;
  fileName?: string;
  totalSets: number;
};

/** Индекс имён планов и импортированной библиотеки для сопоставления CSV-имён. */
export function gymCatalogNameIndex(): GymNameIndex {
  const entries: Array<{ id: number; aliases: string[] }> = [];
  for (const [id, name] of Object.entries(allExerciseNames())) {
    entries.push({ id: Number(id), aliases: [name] });
  }
  for (const ex of allImportedExerciseNames()) {
    entries.push({ id: ex.id, aliases: ex.nameRu ? [ex.nameEn, ex.nameRu] : [ex.nameEn] });
  }
  return buildGymNameIndex(entries);
}

/** Открывает выбор файла и разбирает CSV-экспорт Hevy / Strong. */
export async function pickAndImportGymHistoryFile(): Promise<GymHistoryImportOutcome> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'application/csv', 'text/comma-separated-values', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
    multiple: false
  });

  if (picked.canceled || !picked.assets?.length) {
    return { drafts: [], unmatchedNames: [], warnings: [], cancelled: true, totalSets: 0 };
  }

  const asset = picked.assets[0];
  const fileName = asset.name ?? 'history.csv';

  try {
    const text = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.UTF8
    });
    const parsed = parseGymCsv(text);
    const matched = matchGymCsvSets(parsed, gymCatalogNameIndex());
    return {
      drafts: matched.drafts,
      unmatchedNames: matched.unmatchedNames,
      warnings: parsed.warnings,
      cancelled: false,
      fileName,
      totalSets: matched.totalSets
    };
  } catch (err) {
    return {
      drafts: [],
      unmatchedNames: [],
      warnings: [err instanceof Error ? err.message : String(err)],
      cancelled: false,
      fileName,
      totalSets: 0
    };
  }
}
