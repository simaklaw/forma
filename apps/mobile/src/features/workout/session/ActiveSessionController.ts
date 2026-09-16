import type { WorkoutSession } from '@forma/workout-domain';
import {
  getSessionService,
  newSessionId
} from '@/features/workout/data';
import type { ExerciseDef } from '../ExerciseSheet';
import { contentHashForExercises, exercisesToSnapshots } from './planToSnapshots';
import { LOCAL_USER_ID } from './currentUser';

/**
 * Thin imperative controller: keeps the active day-plan session id
 * and dual-writes set completion into the domain aggregate.
 * UI may keep using Zustand for counters; this builds durable history.
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

  /** Test-only */
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

  async ensureDaySession(dayId: string, exercises: ExerciseDef[]): Promise<WorkoutSession> {
    const svc = getSessionService();

    if (this.sessionId && this.dayId === dayId) {
      const existing = await svc.getSession(this.sessionId);
      if (existing && existing.status !== 'completed' && existing.status !== 'abandoned') {
        return existing;
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
      templateRevisionId: `day-${dayId}`,
      contentHash: contentHashForExercises(exercises),
      steps,
      localStartDate,
      timezone
    });

    const started = await svc.dispatch(sessionId, { type: 'start_session' });
    this.sessionId = sessionId;
    this.dayId = dayId;
    this.emit();
    return started.session;
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
    if (!this.sessionId) return null;
    return getSessionService().getSession(this.sessionId);
  }
}

export const ActiveSessionController = new ActiveSessionControllerImpl();
