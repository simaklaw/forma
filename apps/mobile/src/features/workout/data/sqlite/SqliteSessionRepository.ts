import type { SessionEvent, WorkoutSession } from '@forma/workout-domain';
import type { OutboxRow, OutboxStatus, SessionRepository } from '../SessionRepository';
import { SCHEMA_SQL, WORKOUT_DB_NAME } from './schema';

/**
 * Minimal surface of expo-sqlite Database so we can inject a mock in tests later.
 * Real open: `import * as SQLite from 'expo-sqlite'; SQLite.openDatabaseSync(WORKOUT_DB_NAME)`
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

    // expo-sqlite sync API has no multi-statement transaction helper on all versions;
    // we still order writes deterministically and rely on UNIQUE constraints.
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
