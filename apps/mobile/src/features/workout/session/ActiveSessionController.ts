import type { WorkoutSession } from '@forma/workout-domain';
import {
  getSessionService,
  newSessionId
} from '@/features/workout/data';
import type { ExerciseDef } from '../ExerciseSheet';
import { contentHashForExercises, exercisesToSnapshots } from './planToSnapshots';
import { LOCAL_USER_ID } from './currentUser';

function dayTemplateId(dayId: string): string {
  return `day-${dayId}`;
}

function isResumable(s: WorkoutSession): boolean {
  return s.status === 'prepared' || s.status === 'active' || s.status === 'paused';
}

/**
 * Thin imperative controller: keeps the active day-plan session id
 * and dual-writes set completion into the domain aggregate.
 * UI may keep using Zustand for counters; this builds durable history.
 *
 * After process death, in-memory sessionId/dayId are null; resume is driven
 * by SessionRepository.getResumable + templateRevisionId === day-${dayId}.
 */
class ActiveSessionControllerImpl {
  private sessionId: string | null = null;
  private dayId: string | null = null;
  private listeners = new Set<() => void>();

  getSessionId(): string | null {
    return this.sessionId;
  }

  getDayId(): string | null {
    return this.dayId;
  }

  /** Test-only — clears in-memory pointers only (does not touch repository). */
  resetForTests(): void {
    this.sessionId = null;
    this.dayId = null;
    this.listeners.clear();
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.listeners.forEach((fn) => fn());
  }

  private bind(session: WorkoutSession, dayId: string): WorkoutSession {
    this.sessionId = session.sessionId;
    this.dayId = dayId;
    this.emit();
    return session;
  }

  /**
   * Single-active: abandon only when the resumable session belongs to a *different* day.
   * Same-day match is decided by templateRevisionId, not in-memory this.dayId.
   */
  private async abandonIfDifferentDay(nextDayId: string): Promise<WorkoutSession | null> {
    const svc = getSessionService();
    const previous = await svc.getResumable(LOCAL_USER_ID);
    if (!previous || !isResumable(previous)) return null;

    if (previous.templateRevisionId === dayTemplateId(nextDayId)) {
      return previous;
    }

    try {
      await svc.dispatch(previous.sessionId, {
        type: 'abandon_session',
        reason: 'replaced_by_new_session'
      });
    } catch {
      // already terminal or race
    }
    return null;
  }

  async ensureDaySession(dayId: string, exercises: ExerciseDef[]): Promise<WorkoutSession> {
    const svc = getSessionService();
    const templateId = dayTemplateId(dayId);

    // Fast path: in-memory pointer still valid for this day
    if (this.sessionId && this.dayId === dayId) {
      const existing = await svc.getSession(this.sessionId);
      if (existing && isResumable(existing)) {
        return existing;
      }
    }

    // Cold start / lost pointer: resume same-day from durable store, or abandon other day
    const sameDayOrNull = await this.abandonIfDifferentDay(dayId);
    if (sameDayOrNull) {
      return this.bind(sameDayOrNull, dayId);
    }

    // Optional: still try load by in-memory id after abandon path (no-op usually)
    if (this.sessionId) {
      const existing = await svc.getSession(this.sessionId);
      if (existing && isResumable(existing) && existing.templateRevisionId === templateId) {
        return this.bind(existing, dayId);
      }
    }

    const sessionId = newSessionId();
    const steps = exercisesToSnapshots(exercises);
    const localStartDate = new Date().toISOString().slice(0, 10);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    await svc.dispatch(null, {
      type: 'prepare_session',
      sessionId,
      userId: LOCAL_USER_ID,
      templateRevisionId: templateId,
      contentHash: contentHashForExercises(exercises),
      steps,
      localStartDate,
      timezone
    });

    const started = await svc.dispatch(sessionId, { type: 'start_session' });
    return this.bind(started.session, dayId);
  }

  /**
   * Record a set into the domain session when the exercise matches current step.
   * Returns updated session or null if session not aligned (Zustand still records).
   */
  async recordSetForExercise(input: {
    dayId: string;
    exercises: ExerciseDef[];
    exerciseId: number;
    weightKg: number;
    reps: number;
    rir?: number;
  }): Promise<WorkoutSession | null> {
    const session = await this.ensureDaySession(input.dayId, input.exercises);
    const step = session.steps[session.currentStepIndex];
    if (!step || step.snapshot.exerciseId !== String(input.exerciseId)) {
      return null;
    }

    const svc = getSessionService();

    if (session.restEndsAtMs !== null) {
      try {
        await svc.dispatch(session.sessionId, { type: 'skip_rest' });
      } catch {
        // not resting anymore
      }
    }

    const result = await svc.dispatch(session.sessionId, {
      type: 'complete_set',
      weightKg: input.weightKg,
      reps: input.reps,
      rir: input.rir,
      autoStartRest: true
    });

    this.emit();
    return result.session;
  }

  async completeDayIfDone(): Promise<void> {
    if (!this.sessionId) return;
    const svc = getSessionService();
    const session = await svc.getSession(this.sessionId);
    if (!session || session.status === 'completed' || session.status === 'abandoned') return;

    const allDone = session.steps.every(
      (s) => s.skipped || s.completedSets.length >= s.snapshot.targetSets
    );
    if (!allDone) return;

    await svc.dispatch(this.sessionId, {
      type: 'complete_session',
      reason: 'all_sets_done'
    });
    this.emit();
  }

  async load(): Promise<WorkoutSession | null> {
    if (!this.sessionId) {
      const resumable = await getSessionService().getResumable(LOCAL_USER_ID);
      if (resumable && isResumable(resumable)) {
        const dayId = resumable.templateRevisionId.startsWith('day-')
          ? resumable.templateRevisionId.slice(4)
          : null;
        if (dayId) this.bind(resumable, dayId);
        return resumable;
      }
      return null;
    }
    return getSessionService().getSession(this.sessionId);
  }
}

export const ActiveSessionController = new ActiveSessionControllerImpl();
