import type { SessionEvent, WorkoutSession } from '@forma/workout-domain';
import type { OutboxRow, OutboxStatus, SessionRepository } from './SessionRepository';

/**
 * In-memory repository for unit tests and web/dev without native SQLite.
 * Mirrors the transactional contract of SqliteSessionRepository.
 */
export class MemorySessionRepository implements SessionRepository {
  private sessions = new Map<string, WorkoutSession>();
  private events = new Map<string, SessionEvent[]>();
  private outbox: OutboxRow[] = [];

  async getSession(sessionId: string): Promise<WorkoutSession | null> {
    const s = this.sessions.get(sessionId);
    return s ? structuredClone(s) : null;
  }

  async getResumableSession(userId: string): Promise<WorkoutSession | null> {
    let best: WorkoutSession | null = null;
    for (const s of this.sessions.values()) {
      if (s.userId !== userId) continue;
      if (s.status === 'completed' || s.status === 'abandoned') continue;
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
  }): Promise<void> {
    const { session, events, payloadHashes } = input;
    if (events.length !== payloadHashes.length) {
      throw new Error('payloadHashes length must match events');
    }

    const existing = this.events.get(session.sessionId) ?? [];
    for (const ev of events) {
      if (existing.some((e) => e.ordinal === ev.ordinal || e.eventId === ev.eventId)) {
        throw new Error(`duplicate event ordinal/id ${ev.ordinal}/${ev.eventId}`);
      }
    }

    this.sessions.set(session.sessionId, structuredClone(session));
    this.events.set(session.sessionId, [...existing, ...structuredClone(events)]);

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
  }

  async listPendingOutbox(limit = 50): Promise<OutboxRow[]> {
    return this.outbox.filter((r) => r.status === 'pending').slice(0, limit);
  }

  async markOutbox(operationId: string, status: OutboxStatus): Promise<void> {
    const row = this.outbox.find((r) => r.operationId === operationId);
    if (row) row.status = status;
  }

  /** Test helper */
  dump() {
    return {
      sessions: [...this.sessions.values()],
      events: Object.fromEntries(this.events),
      outbox: [...this.outbox]
    };
  }
}
