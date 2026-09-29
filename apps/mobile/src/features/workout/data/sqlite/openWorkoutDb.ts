/**
 * Native entrypoint — call once from app bootstrap after expo-sqlite is loaded.
 *
 * ```ts
 * import * as SQLite from 'expo-sqlite';
 * import { openWorkoutDb, WORKOUT_DB_NAME } from '@/features/workout/data/sqlite/openWorkoutDb';
 * const repo = openWorkoutDb(() => SQLite.openDatabaseSync(WORKOUT_DB_NAME));
 * ```
 *
 * Kept as a thin factory so Jest never imports expo-sqlite directly.
 */

import { SqliteSessionRepository, type SqliteDatabase } from './SqliteSessionRepository';
import { WORKOUT_DB_NAME } from './schema';
import { runMigrations } from './runMigrations';

export function openWorkoutDb(open: () => SqliteDatabase): SqliteSessionRepository {
  const db = open();

  // WAL mode: set once per connection, outside migrations.
  db.execSync('PRAGMA journal_mode = WAL');

  // Apply any pending schema migrations before returning the repo.
  runMigrations(db);

  return new SqliteSessionRepository(db);
}

export { WORKOUT_DB_NAME };
