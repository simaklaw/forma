/** SQLite schema and incremental migrations for the local workout aggregate. */

/** On-device DB file. Renamed for FitPulse branding; first launch creates a fresh file. */
export const WORKOUT_DB_NAME = 'fitpulse_workout_v1.db';

/**
 * Migrations are numbered from 1. The number IS the target `user_version`.
 *
 * Rules (enforce in code review):
 * - Never edit an existing migration — only add new ones at the end.
 * - Each migration must be idempotent when re-run, but the runner guarantees
 *   it only runs each once, so DDL doesn't need IF NOT EXISTS.
 * - Use ALTER TABLE for column additions; never DROP a column in P0/P1.
 */
export const MIGRATIONS: ReadonlyArray<{ version: number; sql: string }> = [
  {
    version: 1,
    sql: `
      CREATE TABLE workout_session (
        session_id    TEXT    PRIMARY KEY NOT NULL,
        user_id       TEXT    NOT NULL,
        status        TEXT    NOT NULL,
        row_version   INTEGER NOT NULL,
        last_event_ordinal INTEGER NOT NULL,
        aggregate_json TEXT   NOT NULL,
        updated_at_ms INTEGER NOT NULL
      );

      CREATE INDEX idx_workout_session_user_status
        ON workout_session (user_id, status);

      CREATE UNIQUE INDEX idx_one_resumable_session_per_user
        ON workout_session (user_id)
        WHERE status IN ('prepared', 'active', 'paused');

      CREATE TABLE session_event (
        event_id     TEXT    PRIMARY KEY NOT NULL,
        session_id   TEXT    NOT NULL,
        ordinal      INTEGER NOT NULL,
        type         TEXT    NOT NULL,
        payload_json TEXT    NOT NULL,
        occurred_at_ms INTEGER NOT NULL,
        operation_id TEXT    NOT NULL,
        UNIQUE (session_id, ordinal)
      );

      CREATE INDEX idx_session_event_session
        ON session_event (session_id, ordinal);

      CREATE TABLE session_checkpoint (
        session_id    TEXT    PRIMARY KEY NOT NULL,
        event_ordinal INTEGER NOT NULL,
        row_version   INTEGER NOT NULL,
        aggregate_json TEXT   NOT NULL,
        created_at_ms INTEGER NOT NULL
      );

      CREATE TABLE outbox (
        operation_id      TEXT    PRIMARY KEY NOT NULL,
        session_id        TEXT    NOT NULL,
        event_id          TEXT    NOT NULL,
        aggregate_version INTEGER NOT NULL,
        payload_hash      TEXT    NOT NULL,
        status            TEXT    NOT NULL DEFAULT 'pending',
        created_at_ms     INTEGER NOT NULL
      );

      CREATE INDEX idx_outbox_pending
        ON outbox (status, created_at_ms);
    `
  },
  {
    version: 2,
    // Denormalized body-weight snapshot for MET/burn queries without parsing aggregate_json.
    // Nullable: older sessions and bodyweight-only plans may leave it unset.
    sql: `ALTER TABLE workout_session ADD COLUMN weight_snapshot_kg REAL;`
  }
];

/** Highest migration number in the list — used by the runner and tests. */
export const CURRENT_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]!.version;
