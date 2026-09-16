import type { SessionEvent, WorkoutSession } from '@forma/workout-domain';

export type OutboxStatus = 'pending' | 'accepted' | 'failed';

export interface OutboxRow {
  operationId: string;
  sessionId: string;
  eventId: string;
  aggregateVersion: number;
  payloadHash: string;
  status: OutboxStatus;
  createdAtMs: number;
}

/**
 * Persistence port for the workout aggregate.
 * Implementations must make appendSession + outbox atomic with the session write.
 */
export interface SessionRepository {
  getSession(sessionId: string): Promise<WorkoutSession | null>;

  /** Latest non-terminal session for user, if any (resume card). */
  getResumableSession(userId: string): Promise<WorkoutSession | null>;

  listEvents(sessionId: string): Promise<SessionEvent[]>;

  /**
   * Atomically:
   * 1) upsert session aggregate
   * 2) append events (reject duplicate ordinal)
   * 3) enqueue outbox rows for each event
   */
  commitSessionChange(input: {
    session: WorkoutSession;
    events: SessionEvent[];
    payloadHashes: string[];
  }): Promise<void>;

  listPendingOutbox(limit?: number): Promise<OutboxRow[]>;

  markOutbox(operationId: string, status: OutboxStatus): Promise<void>;
}

export function hashPayload(payload: unknown): string {
  // Stable enough for local dedupe in P0; replace with SHA-256 when crypto is available.
  const s = JSON.stringify(payload);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
