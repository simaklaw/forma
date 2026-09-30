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
  /** Session projection for sync push payload enrichment (P2). */
  projection?: { setLogs: unknown[]; dayProgress: Record<string, Record<string, number>> };
}

export interface SessionCheckpoint {
  sessionId: string;
  eventOrdinal: number;
  rowVersion: number;
  aggregate: WorkoutSession;
  createdAtMs: number;
}

/**
 * Persistence port for the workout aggregate.
 * commitSessionChange MUST be atomic: session upsert + events + checkpoint + outbox.
 */
export interface SessionRepository {
  getSession(sessionId: string): Promise<WorkoutSession | null>;

  /** Latest non-terminal session for user, if any (resume card). */
  getResumableSession(userId: string): Promise<WorkoutSession | null>;

  listEvents(sessionId: string): Promise<SessionEvent[]>;

  /**
   * Atomically:
   * 1) enforce single resumable session per user when status is prepared|active|paused
   * 2) upsert session aggregate
   * 3) append events (reject duplicate ordinal)
   * 4) save the latest checkpoint
   * 5) enqueue outbox rows for each event
   */
  commitSessionChange(input: {
    session: WorkoutSession;
    events: SessionEvent[];
    payloadHashes: string[];
    checkpoint?: SessionCheckpoint;
    /** Session projections for each event, for sync push payload enrichment. */
    projections?: Array<{ setLogs: unknown[]; dayProgress: Record<string, Record<string, number>> }>;
  }): Promise<void>;

  /** Durable recovery point for fast process-restart hydration. */
  saveCheckpoint(checkpoint: SessionCheckpoint): Promise<void>;

  getCheckpoint(sessionId: string): Promise<SessionCheckpoint | null>;

  listPendingOutbox(limit?: number): Promise<OutboxRow[]>;

  markOutbox(operationId: string, status: OutboxStatus): Promise<void>;

  /** Deletes outbox rows older than retentionDays with a final status. */
  pruneOutbox(retentionDays: number, statuses: OutboxStatus[]): Promise<number>;
}

export function hashPayload(payload: unknown): string {
  const s = JSON.stringify(payload);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function isResumableStatus(status: WorkoutSession['status']): boolean {
  return status === 'prepared' || status === 'active' || status === 'paused';
}
