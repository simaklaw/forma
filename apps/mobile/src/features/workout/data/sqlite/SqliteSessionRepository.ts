import type { SessionEvent, WorkoutSession } from '@forma/workout-domain';
import {
  isResumableStatus,
  type OutboxRow,
  type OutboxStatus,
  type SessionCheckpoint,
  type SessionRepository
} from '../SessionRepository';
import { SCHEMA_SQL, WORKOUT_DB_NAME } from './schema';

/**
 * Minimal surface of expo-sqlite sync API.
 * Real open: `SQLite.openDatabaseSync(WORKOUT_DB_NAME)`
 */
export interface SqliteDatabase {
  execSync(sql: string): void;
  runSync(sql: string, params?: (string | number | null)[]): { changes: number };
  getFirstSync<T>(sql: string, params?: (string | number | null)[]): T | null;
  getAllSync<T>(sql: string, params?: (string | number | null)[]): T[];
}

type SessionRow = {
  session_id: string;
  user_id: string;
  status: string;
  row_version: number;
  last_event_ordinal: number;
  aggregate_json: string;
  updated_at_ms: number;
};

type EventRow = {
  event_id: string;
  session_id: string;
  ordinal: number;
  type: string;
  payload_json: string;
  occurred_at_ms: number;
  operation_id: string;
};

type CheckpointRow = {
  session_id: string;
  event_ordinal: number;
  row_version: number;
  aggregate_json: string;
  created_at_ms: number;
};

type OutboxDbRow = {
  operation_id: string;
  session_id: string;
  event_id: string;
  aggregate_version: number;
  payload_hash: string;
  status: string;
  created_at_ms: number;
};

export class SqliteSessionRepository implements SessionRepository {
  private ready = false;

  constructor(private readonly db: SqliteDatabase) {}

  ensureSchema(): void {
    if (this.ready) return;
    this.db.execSync(SCHEMA_SQL);
    this.ready = true;
  }

  private withTransaction(fn: () => void): void {
    this.db.execSync('BEGIN IMMEDIATE');
    try {
      fn();
      this.db.execSync('COMMIT');
    } catch (e) {
      try {
        this.db.execSync('ROLLBACK');
      } catch {
        // ignore rollback errors
      }
      throw e;
    }
  }

  async getSession(sessionId: string): Promise<WorkoutSession | null> {
    this.ensureSchema();
    const row = this.db.getFirstSync<SessionRow>(
      'SELECT * FROM workout_session WHERE session_id = ?',
      [sessionId]
    );
    if (!row) return null;
    return JSON.parse(row.aggregate_json) as WorkoutSession;
  }

  async getResumableSession(userId: string): Promise<WorkoutSession | null> {
    this.ensureSchema();
    const row = this.db.getFirstSync<SessionRow>(
      `SELECT * FROM workout_session
       WHERE user_id = ? AND status IN ('prepared', 'active', 'paused')
       ORDER BY updated_at_ms DESC
       LIMIT 1`,
      [userId]
    );
    if (!row) return null;
    return JSON.parse(row.aggregate_json) as WorkoutSession;
  }

  async listEvents(sessionId: string): Promise<SessionEvent[]> {
    this.ensureSchema();
    const rows = this.db.getAllSync<EventRow>(
      'SELECT * FROM session_event WHERE session_id = ? ORDER BY ordinal ASC',
      [sessionId]
    );
    return rows.map((r) => ({
      eventId: r.event_id,
      sessionId: r.session_id,
      ordinal: r.ordinal,
      type: r.type as SessionEvent['type'],
      occurredAtMs: r.occurred_at_ms,
      payloadSchemaVersion: 1 as const,
      operationId: r.operation_id,
      payload: JSON.parse(r.payload_json)
    })) as SessionEvent[];
  }

  async commitSessionChange(input: {
    session: WorkoutSession;
    events: SessionEvent[];
    payloadHashes: string[];
  }): Promise<void> {
    this.ensureSchema();
    const { session, events, payloadHashes } = input;
    if (events.length !== payloadHashes.length) {
      throw new Error('payloadHashes length must match events');
    }

    const now = Date.now();
    const json = JSON.stringify(session);

    this.withTransaction(() => {
      if (isResumableStatus(session.status)) {
        const conflict = this.db.getFirstSync<{ session_id: string }>(
          `SELECT session_id FROM workout_session
           WHERE user_id = ? AND status IN ('prepared', 'active', 'paused')
             AND session_id != ?
           LIMIT 1`,
          [session.userId, session.sessionId]
        );
        if (conflict) {
          throw new Error(
            `single-active violation: user ${session.userId} already has resumable session ${conflict.session_id}`
          );
        }
      }

      this.db.runSync(
        `INSERT INTO workout_session (
           session_id, user_id, status, row_version, last_event_ordinal, aggregate_json, updated_at_ms
         ) VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(session_id) DO UPDATE SET
           status = excluded.status,
           row_version = excluded.row_version,
           last_event_ordinal = excluded.last_event_ordinal,
           aggregate_json = excluded.aggregate_json,
           updated_at_ms = excluded.updated_at_ms`,
        [
          session.sessionId,
          session.userId,
          session.status,
          session.rowVersion,
          session.lastEventOrdinal,
          json,
          now
        ]
      );

      for (let i = 0; i < events.length; i++) {
        const ev = events[i]!;
        this.db.runSync(
          `INSERT INTO session_event (
             event_id, session_id, ordinal, type, payload_json, occurred_at_ms, operation_id
           ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            ev.eventId,
            session.sessionId,
            ev.ordinal,
            ev.type,
            JSON.stringify(ev.payload),
            ev.occurredAtMs,
            ev.operationId
          ]
        );
        this.db.runSync(
          `INSERT INTO outbox (
             operation_id, session_id, event_id, aggregate_version, payload_hash, status, created_at_ms
           ) VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
          [
            ev.operationId,
            session.sessionId,
            ev.eventId,
            session.rowVersion,
            payloadHashes[i]!,
            now
          ]
        );
      }
    });
  }

  async saveCheckpoint(checkpoint: SessionCheckpoint): Promise<void> {
    this.ensureSchema();
    const existing = this.db.getFirstSync<CheckpointRow>(
      'SELECT * FROM session_checkpoint WHERE session_id = ?',
      [checkpoint.sessionId]
    );
    if (existing && existing.event_ordinal > checkpoint.eventOrdinal) return;

    this.db.runSync(
      `INSERT INTO session_checkpoint (
         session_id, event_ordinal, row_version, aggregate_json, created_at_ms
       ) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(session_id) DO UPDATE SET
         event_ordinal = excluded.event_ordinal,
         row_version = excluded.row_version,
         aggregate_json = excluded.aggregate_json,
         created_at_ms = excluded.created_at_ms`,
      [
        checkpoint.sessionId,
        checkpoint.eventOrdinal,
        checkpoint.rowVersion,
        JSON.stringify(checkpoint.aggregate),
        checkpoint.createdAtMs
      ]
    );
  }

  async getCheckpoint(sessionId: string): Promise<SessionCheckpoint | null> {
    this.ensureSchema();
    const row = this.db.getFirstSync<CheckpointRow>(
      'SELECT * FROM session_checkpoint WHERE session_id = ?',
      [sessionId]
    );
    if (!row) return null;
    return {
      sessionId: row.session_id,
      eventOrdinal: row.event_ordinal,
      rowVersion: row.row_version,
      aggregate: JSON.parse(row.aggregate_json) as WorkoutSession,
      createdAtMs: row.created_at_ms
    };
  }

  async listPendingOutbox(limit = 50): Promise<OutboxRow[]> {
    this.ensureSchema();
    const rows = this.db.getAllSync<OutboxDbRow>(
      `SELECT * FROM outbox WHERE status = 'pending' ORDER BY created_at_ms ASC LIMIT ?`,
      [limit]
    );
    return rows.map((r) => ({
      operationId: r.operation_id,
      sessionId: r.session_id,
      eventId: r.event_id,
      aggregateVersion: r.aggregate_version,
      payloadHash: r.payload_hash,
      status: r.status as OutboxStatus,
      createdAtMs: r.created_at_ms
    }));
  }

  async markOutbox(operationId: string, status: OutboxStatus): Promise<void> {
    this.ensureSchema();
    this.db.runSync(`UPDATE outbox SET status = ? WHERE operation_id = ?`, [status, operationId]);
  }
}

export { WORKOUT_DB_NAME };
