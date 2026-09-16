import type { SessionStepSnapshot } from '@forma/workout-domain';
import { applyCommand } from '@forma/workout-domain';
import { hashPayload } from '../SessionRepository';
import { uuidv7 } from '../ids';
import { SqliteSessionRepository, type SqliteDatabase } from './SqliteSessionRepository';

/** Minimal fake that records BEGIN/COMMIT/ROLLBACK and stores rows in Maps. */
function createFakeDb(): SqliteDatabase & { log: string[] } {
  const log: string[] = [];
  const sessions = new Map<string, Record<string, unknown>>();
  const events: Array<Record<string, unknown>> = [];
  const outbox: Array<Record<string, unknown>> = [];
  let inTx = false;

  return {
    log,
    execSync(sql: string) {
      const s = sql.trim();
      if (s.startsWith('PRAGMA') || s.startsWith('CREATE')) {
        log.push('SCHEMA');
        return;
      }
      if (s === 'BEGIN IMMEDIATE') {
        log.push('BEGIN');
        inTx = true;
        return;
      }
      if (s === 'COMMIT') {
        log.push('COMMIT');
        inTx = false;
        return;
      }
      if (s === 'ROLLBACK') {
        log.push('ROLLBACK');
        inTx = false;
        return;
      }
      log.push(`EXEC:${s.slice(0, 40)}`);
    },
    runSync(sql: string, params: (string | number | null)[] = []) {
      log.push(`RUN:${sql.slice(0, 24)}`);
      if (sql.includes('INSERT INTO workout_session')) {
        const id = String(params[0]);
        sessions.set(id, {
          session_id: id,
          user_id: params[1],
          status: params[2],
          row_version: params[3],
          last_event_ordinal: params[4],
          aggregate_json: params[5],
          updated_at_ms: params[6]
        });
      }
      if (sql.includes('INSERT INTO session_event')) {
        events.push({
          event_id: params[0],
          session_id: params[1],
          ordinal: params[2],
          type: params[3],
          payload_json: params[4],
          occurred_at_ms: params[5],
          operation_id: params[6]
        });
      }
      if (sql.includes('INSERT INTO outbox')) {
        outbox.push({ operation_id: params[0] });
      }
      return { changes: 1 };
    },
    getFirstSync<T>(sql: string, params: (string | number | null)[] = []): T | null {
      if (sql.includes('status IN') && sql.includes('session_id !=')) {
        // single-active probe
        for (const s of sessions.values()) {
          if (
            s.user_id === params[0] &&
            s.session_id !== params[1] &&
            ['prepared', 'active', 'paused'].includes(String(s.status))
          ) {
            return { session_id: s.session_id } as T;
          }
        }
        return null;
      }
      if (sql.includes('FROM workout_session WHERE session_id')) {
        const row = sessions.get(String(params[0]));
        return (row as T) ?? null;
      }
      return null;
    },
    getAllSync<T>(): T[] {
      return [] as T[];
    }
  };
}

const steps: SessionStepSnapshot[] = [
  {
    stepIndex: 0,
    exerciseId: '1',
    exerciseRevisionId: 'r1',
    name: 'Squat',
    targetSets: 1,
    targetReps: 5,
    targetWeightKg: 80,
    restSeconds: 0
  }
];

describe('SqliteSessionRepository transactions', () => {
  it('wraps commit in BEGIN IMMEDIATE … COMMIT', async () => {
    const db = createFakeDb();
    const repo = new SqliteSessionRepository(db);
    const sessionId = uuidv7(1_700_000_000_000);
    const prepared = applyCommand(
      null,
      {
        type: 'prepare_session',
        sessionId,
        userId: 'u1',
        templateRevisionId: 't1',
        contentHash: 'h',
        steps,
        localStartDate: '2026-09-16',
        timezone: 'UTC'
      },
      { operationId: uuidv7(1), eventId: uuidv7(2), nowMs: 1000 }
    );

    await repo.commitSessionChange({
      session: prepared.session,
      events: prepared.events,
      payloadHashes: prepared.events.map((e) => hashPayload(e.payload))
    });

    expect(db.log).toContain('BEGIN');
    expect(db.log).toContain('COMMIT');
    const beginIdx = db.log.indexOf('BEGIN');
    const commitIdx = db.log.indexOf('COMMIT');
    expect(beginIdx).toBeGreaterThanOrEqual(0);
    expect(commitIdx).toBeGreaterThan(beginIdx);
  });
});
