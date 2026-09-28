/** Versioned SQL schema for the local workout aggregate. */

export const WORKOUT_DB_NAME = 'forma_workout_v1.db';
export const WORKOUT_SCHEMA_VERSION = 2;

export type SchemaMigration = {
  version: number;
  sql: string;
};

/**
 * Migrations are deliberately additive and idempotent. Existing installs may
 * have tables created by the old bootstrap with user_version = 0, so v1 uses
 * IF NOT EXISTS and v2 only adds indexes/constraints that are safe to repeat.
 */
export const SCHEMA_MIGRATIONS: readonly SchemaMigration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS workout_session (
        session_id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        status TEXT NOT NULL,
        row_version INTEGER NOT NULL,
        last_event_ordinal INTEGER NOT NULL,
        aggregate_json TEXT NOT NULL,
        updated_at_ms INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS session_event (
        event_id TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL,
        ordinal INTEGER NOT NULL,
        type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        occurred_at_ms INTEGER NOT NULL,
        operation_id TEXT NOT NULL,
        UNIQUE (session_id, ordinal)
      );
      CREATE TABLE IF NOT EXISTS session_checkpoint (
        session_id TEXT PRIMARY KEY NOT NULL,
        event_ordinal INTEGER NOT NULL,
        row_version INTEGER NOT NULL,
        aggregate_json TEXT NOT NULL,
        created_at_ms INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS outbox (
        operation_id TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL,
        event_id TEXT NOT NULL,
        aggregate_version INTEGER NOT NULL,
        payload_hash TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at_ms INTEGER NOT NULL
      );
    `
  },
  {
    version: 2,
    sql: `
      CREATE INDEX IF NOT EXISTS idx_workout_session_user_status
        ON workout_session (user_id, status);
      CREATE INDEX IF NOT EXISTS idx_session_event_session
        ON session_event (session_id, ordinal);
      CREATE INDEX IF NOT EXISTS idx_outbox_pending
        ON outbox (status, created_at_ms);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_one_resumable_session_per_user
        ON workout_session (user_id)
        WHERE status IN ('prepared', 'active', 'paused');
    `
  }
];

/**
 * Kept as a compatibility export for tooling that wants the full DDL, while
 * runtime initialization uses SCHEMA_MIGRATIONS and PRAGMA user_version.
 */
export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
${SCHEMA_MIGRATIONS.map((migration) => migration.sql).join('\n')}
`;
