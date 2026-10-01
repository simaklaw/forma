import type { SessionStepSnapshot } from '@forma/workout-domain';
import { applyCommand } from '@forma/workout-domain';
import { hashPayload } from '../SessionRepository';
import { uuidv7 } from '../ids';
import { SqliteSessionRepository, type SqliteDatabase } from './SqliteSessionRepository';

/** Minimal fake that records BEGIN/COMMIT/ROLLBACK and stores rows in Maps. */
function createFakeDb(): SqliteDatabase & {
  log: string[];
  outbox: Array<Record<string, unknown>>;
} {
  const log: string[] = [];
  const sessions = new Map<string, Record<string, unknown>>();
  const events: Array<Record<string, unknown>> = [];
  const outbox: Array<Record<string, unknown>> = [];
  // Real SQLite enforces outbox.operation_id as PRIMARY KEY; the fake must
  // enforce it too, otherwise constraint violations stay invisible in tests
  // (documented test gap in data/README.md).
  const outboxOperationIds = new Set<string>();
  let inTx = false;

  return {
    log,
    outbox,
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
        const operationId = String(params[0]);
        if (outboxOperationIds.has(operationId)) {
          throw new Error('UNIQUE constraint failed: outbox.operation_id');
        }
        outboxOperationIds.add(operationId);
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

  it('commits a two-event command (set + rest) without violating the outbox PK', async () => {
    // Regression: complete_set with autoStartRest emits set_completed +
    // rest_started sharing one operationId. Inserting one outbox row per event
    // violated UNIQUE(operation_id) on real SQLite and rolled back the whole
    // commit — the recorded set was lost on device while Jest (memory repo)
    // stayed green.
    const db = createFakeDb();
    const repo = new SqliteSessionRepository(db);
    const sessionId = uuidv7(1_700_000_000_050);
    const restSteps: SessionStepSnapshot[] = [{ ...steps[0]!, targetSets: 2, restSeconds: 90 }];

    const prepared = applyCommand(
      null,
      {
        type: 'prepare_session',
        sessionId,
        userId: 'u1',
        templateRevisionId: 't1',
        contentHash: 'h',
        steps: restSteps,
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

    const started = applyCommand(
      prepared.session,
      { type: 'start_session' },
      { operationId: uuidv7(3), eventId: uuidv7(4), nowMs: 2000 }
    );
    await repo.commitSessionChange({
      session: started.session,
      events: started.events,
      payloadHashes: started.events.map((e) => hashPayload(e.payload))
    });

    const set = applyCommand(
      started.session,
      { type: 'complete_set', weightKg: 80, reps: 5, rir: 2 },
      { operationId: uuidv7(5), eventId: uuidv7(6), eventId2: uuidv7(7), nowMs: 3000 }
    );
    expect(set.events).toHaveLength(2);

    await expect(
      repo.commitSessionChange({
        session: set.session,
        events: set.events,
        payloadHashes: set.events.map((e) => hashPayload(e.payload))
      })
    ).resolves.toBeUndefined();

    // 3 commands → exactly 3 outbox rows, one per operationId.
    expect(db.outbox).toHaveLength(3);
    expect(db.log.filter((l) => l === 'COMMIT')).toHaveLength(3);
  });
});
