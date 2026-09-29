import type { SqliteDatabase } from './SqliteSessionRepository';
import { MIGRATIONS, CURRENT_SCHEMA_VERSION } from './schema';

/**
 * Applies any pending migrations to `db` in a single transaction per step.
 *
 * Uses SQLite's built-in `PRAGMA user_version` as the schema-version counter.
 * Safe to call on every app start: if `user_version === CURRENT_SCHEMA_VERSION`
 * it returns immediately without touching the database.
 *
 * @throws if any migration SQL fails. The caller (openWorkoutDb) should let
 *         this propagate — a failed migration means the DB is in an unknown
 *         state and the app should not continue silently.
 */
export function runMigrations(db: SqliteDatabase): void {
  // SQLite PRAGMAs can't be parameterised; the cast is intentional.
  const row = db.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  if (currentVersion >= CURRENT_SCHEMA_VERSION) return;

  const pending = MIGRATIONS.filter((m) => m.version > currentVersion);

  for (const migration of pending) {
    db.execSync('BEGIN IMMEDIATE');
    try {
      db.execSync(migration.sql);
      // Increment user_version inside the same transaction so version and
      // schema are always atomically in sync.
      db.execSync(`PRAGMA user_version = ${migration.version}`);
      db.execSync('COMMIT');
    } catch (err) {
      try {
        db.execSync('ROLLBACK');
      } catch {
        // ignore rollback error — original error is the one to propagate
      }
      throw new Error(
        `[DB] Migration v${migration.version} failed: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }
}
