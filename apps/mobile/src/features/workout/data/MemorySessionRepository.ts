import type { SessionEvent, WorkoutSession } from '@forma/workout-domain';
import {
  isResumableStatus,
  type OutboxRow,
  type OutboxStatus,
  type SessionCheckpoint,
  type SessionRepository
} from './SessionRepository';

/**
 * In-memory repository — same contract as SqliteSessionRepository.
 * Single-writer: commit is synchronous mutation (atomic in-process).
 */
export class MemorySessionRepository implements SessionRepository {
  private sessions = new Map<string, WorkoutSession>();
  private events = new Map<string, SessionEvent[]>();
  private checkpoints = new Map<string, SessionCheckpoint>();
  private outbox: OutboxRow[] = [];

  async getSession(sessionId: string): Promise<WorkoutSession | null> {
    const s = this.sessions.get(sessionId);
    return s ? structuredClone(s) : null;
  }

  async getResumableSession(userId: string): Promise<WorkoutSession | null> {
    let best: WorkoutSession | null = null;
    for (const s of this.sessions.values()) {
      if (s.userId !== userId) continue;
      if (!isResumableStatus(s.status)) continue;
      if (!best || (s.startedAtMs ?? 0) > (best.startedAtMs ?? 0)) {
        best = s;
      }
    }
    return best ? structuredClone(best) : null;
  }

  async listEvents(sessionId: string): Promise<SessionEvent[]> {
    return structuredClone(this.events.get(sessionId) ?? []);
  }

  async commitSessionChange(input: {
    session: WorkoutSession;
    events: SessionEvent[];
    payloadHashes: string[];
    checkpoint?: SessionCheckpoint;
  }): Promise<void> {
    const { session, events, payloadHashes, checkpoint } = input;
    if (events.length !== payloadHashes.length) {
      throw new Error('payloadHashes length must match events');
    }

    // Snapshot for rollback semantics within this commit.
    const prevSession = this.sessions.get(session.sessionId);
    const prevEvents = this.events.get(session.sessionId);
    const prevCheckpoint = this.checkpoints.get(session.sessionId);
    const outboxLen = this.outbox.length;

    try {
      if (isResumableStatus(session.status)) {
        for (const [id, s] of this.sessions) {
          if (id === session.sessionId) continue;
          if (s.userId === session.userId && isResumableStatus(s.status)) {
            throw new Error(
              `single-active violation: user ${session.userId} already has resumable session ${id}`
            );
          }
        }
      }

      const existing = this.events.get(session.sessionId) ?? [];
      for (const ev of events) {
        if (existing.some((e) => e.ordinal === ev.ordinal || e.eventId === ev.eventId)) {
          throw new Error(`duplicate event ordinal/id ${ev.ordinal}/${ev.eventId}`);
        }
      }

      this.sessions.set(session.sessionId, structuredClone(session));
      this.events.set(session.sessionId, [...existing, ...structuredClone(events)]);
      if (checkpoint) {
        const current = this.checkpoints.get(session.sessionId);
        if (!current || current.eventOrdinal <= checkpoint.eventOrdinal) {
          this.checkpoints.set(session.sessionId, structuredClone(checkpoint));
        }
      }

      const now = Date.now();
      events.forEach((ev, i) => {
        this.outbox.push({
          operationId: ev.operationId,
          sessionId: session.sessionId,
          eventId: ev.eventId,
          aggregateVersion: session.rowVersion,
          payloadHash: payloadHashes[i]!,
          status: 'pending',
          createdAtMs: now
        });
      });
    } catch (e) {
      if (prevSession) this.sessions.set(session.sessionId, prevSession);
      else this.sessions.delete(session.sessionId);
      if (prevEvents) this.events.set(session.sessionId, prevEvents);
      else this.events.delete(session.sessionId);
      if (prevCheckpoint) this.checkpoints.set(session.sessionId, prevCheckpoint);
      else this.checkpoints.delete(session.sessionId);
      this.outbox.length = outboxLen;
      throw e;
    }
  }

  async saveCheckpoint(checkpoint: SessionCheckpoint): Promise<void> {
    const existing = this.checkpoints.get(checkpoint.sessionId);
    if (existing && existing.eventOrdinal > checkpoint.eventOrdinal) return;
    this.checkpoints.set(checkpoint.sessionId, structuredClone(checkpoint));
  }

  async getCheckpoint(sessionId: string): Promise<SessionCheckpoint | null> {
    const checkpoint = this.checkpoints.get(sessionId);
    return checkpoint ? structuredClone(checkpoint) : null;
  }

  async listPendingOutbox(limit = 50): Promise<OutboxRow[]> {
    return this.outbox.filter((r) => r.status === 'pending').slice(0, limit);
  }

  async markOutbox(operationId: string, status: OutboxStatus): Promise<void> {
    const row = this.outbox.find((r) => r.operationId === operationId);
    if (row) row.status = status;
  }

  dump() {
    return {
      sessions: [...this.sessions.values()],
      events: Object.fromEntries(this.events),
      checkpoints: [...this.checkpoints.values()],
      outbox: [...this.outbox]
    };
  }
}
