import type { SessionEvent, WorkoutSession } from "@forma/workout-domain";

function isResumable(status: WorkoutSession["status"]): boolean {
  return status === "prepared" || status === "active" || status === "paused";
}

/** In-memory + optional localStorage mirror for browser (no SQLite). */
export class WebMemorySessionRepository {
  private sessions = new Map<string, WorkoutSession>();
  private events = new Map<string, SessionEvent[]>();

  async getSession(sessionId: string): Promise<WorkoutSession | null> {
    const s = this.sessions.get(sessionId);
    return s ? structuredClone(s) : null;
  }

  async getResumableSession(userId: string): Promise<WorkoutSession | null> {
    let best: WorkoutSession | null = null;
    for (const s of this.sessions.values()) {
      if (s.userId !== userId || !isResumable(s.status)) continue;
      if (!best || (s.startedAtMs ?? 0) > (best.startedAtMs ?? 0)) best = s;
    }
    return best ? structuredClone(best) : null;
  }

  async listEvents(sessionId: string): Promise<SessionEvent[]> {
    return structuredClone(this.events.get(sessionId) ?? []);
  }

  async commitSessionChange(input: {
    session: WorkoutSession;
    events: SessionEvent[];
  }): Promise<void> {
    const { session, events } = input;
    if (isResumable(session.status)) {
      for (const [id, s] of this.sessions) {
        if (id === session.sessionId) continue;
        if (s.userId === session.userId && isResumable(s.status)) {
          throw new Error(`single-active violation: ${id}`);
        }
      }
    }
    const existing = this.events.get(session.sessionId) ?? [];
    for (const ev of events) {
      if (existing.some((e) => e.ordinal === ev.ordinal || e.eventId === ev.eventId)) {
        throw new Error(`duplicate event ${ev.eventId}`);
      }
    }
    this.sessions.set(session.sessionId, structuredClone(session));
    this.events.set(session.sessionId, [...existing, ...structuredClone(events)]);
  }

  /** Test / reset */
  clear(): void {
    this.sessions.clear();
    this.events.clear();
  }
}
