/**
 * Native entrypoint — call from app bootstrap once expo-sqlite is installed.
 *
 * ```ts
 * import * as SQLite from 'expo-sqlite';
 * import { openWorkoutDb } from '@/features/workout/data/sqlite/openWorkoutDb';
 * const repo = openWorkoutDb(() => SQLite.openDatabaseSync(WORKOUT_DB_NAME));
 * ```
 *
 * Kept as a thin factory so Jest never imports expo-sqlite.
 */

import { SqliteSessionRepository, type SqliteDatabase } from './SqliteSessionRepository';
import { WORKOUT_DB_NAME } from './schema';

export function openWorkoutDb(open: () => SqliteDatabase): SqliteSessionRepository {
  const db = open();
  const repo = new SqliteSessionRepository(db);
  repo.ensureSchema();
  return repo;
}

export { WORKOUT_DB_NAME };
