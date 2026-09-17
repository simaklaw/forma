import type { SessionEvent, WorkoutSession } from "@forma/workout-domain";

const STORAGE_KEY = "forma-workout-domain-v1";

function isResumable(status: WorkoutSession["status"]): boolean {
  return status === "prepared" || status === "active" || status === "paused";
}

type PersistedBlob = {
  sessions: WorkoutSession[];
  events: Record<string, SessionEvent[]>;
  boundSessionId: string | null;
};

function canUseStorage(): boolean {
  return typeof globalThis.localStorage !== "undefined";
}

/** In-memory journal with localStorage mirror (browser; no SQLite). */
export class WebMemorySessionRepository {
  private sessions = new Map<string, WorkoutSession>();
  private events = new Map<string, SessionEvent[]>();
  private boundSessionId: string | null = null;
  private persistEnabled: boolean;

  constructor(opts?: { persist?: boolean }) {
    this.persistEnabled = opts?.persist !== false && canUseStorage();
    if (this.persistEnabled) this.hydrateFromStorage();
  }

  getBoundSessionId(): string | null {
    return this.boundSessionId;
  }

  setBoundSessionId(id: string | null): void {
    this.boundSessionId = id;
    this.flush();
  }

  private hydrateFromStorage(): void {
    try {
      const raw = globalThis.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as PersistedBlob;
      if (!data || !Array.isArray(data.sessions)) return;
      for (const s of data.sessions) {
        this.sessions.set(s.sessionId, s);
      }
      if (data.events && typeof data.events === "object") {
        for (const [sid, list] of Object.entries(data.events)) {
          if (Array.isArray(list)) this.events.set(sid, list);
        }
      }
      this.boundSessionId =
        typeof data.boundSessionId === "string" ? data.boundSessionId : null;
    } catch {
      // corrupt blob — start clean
      this.sessions.clear();
      this.events.clear();
      this.boundSessionId = null;
    }
  }

  private flush(): void {
    if (!this.persistEnabled) return;
    try {
      const blob: PersistedBlob = {
        sessions: [...this.sessions.values()],
        events: Object.fromEntries(this.events),
        boundSessionId: this.boundSessionId,
      };
      globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
    } catch {
      // quota / private mode
    }
  }

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
    this.flush();
  }

  /** Test / reset */
  clear(): void {
    this.sessions.clear();
    this.events.clear();
    this.boundSessionId = null;
    if (this.persistEnabled) {
      try {
        globalThis.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* */
      }
    }
  }
}
