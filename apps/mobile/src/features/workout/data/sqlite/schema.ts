/** SQL schema for local workout aggregate (P0). */

export const WORKOUT_DB_NAME = 'forma_workout_v1.db';
export const WORKOUT_SCHEMA_VERSION = 2;

/**
 * DDL invariants:
 * - session_event UNIQUE (session_id, ordinal) → append-only sequence
 * - partial unique index: at most one prepared|active|paused session per user_id
 * - session_checkpoint keeps the latest durable aggregate recovery point
 */
export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS workout_session (
  session_id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL,
  row_version INTEGER NOT NULL,
  last_event_ordinal INTEGER NOT NULL,
  aggregate_json TEXT NOT NULL,
  updated_at_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workout_session_user_status
  ON workout_session (user_id, status);

-- Single resumable session per user (SQLite partial unique index).
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_resumable_session_per_user
  ON workout_session (user_id)
  WHERE status IN ('prepared', 'active', 'paused');

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

CREATE INDEX IF NOT EXISTS idx_session_event_session
  ON session_event (session_id, ordinal);

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

CREATE INDEX IF NOT EXISTS idx_outbox_pending
  ON outbox (status, created_at_ms);
`;
