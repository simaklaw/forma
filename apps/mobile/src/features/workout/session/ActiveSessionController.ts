import { isProfileComplete } from '@forma/core';
import type { WorkoutSession } from '@forma/workout-domain';
import { createLogger } from '@/core/logger';
import {
  getSessionService,
  newSessionId
} from '@/features/workout/data';
import type { ExerciseDef } from '../ExerciseSheet';
import { contentHashForExercises, exercisesToSnapshots, PLAN_REVISION } from './planToSnapshots';
import { LOCAL_USER_ID } from './currentUser';
import { projectSessionEvents } from '@/features/workout/data/sessionProjections';
import { clearDayReadModel } from './clearDayReadModel';
import { useFitPulseStore } from '@/state/useFitPulseStore';

const log = createLogger('session');

/** Template id includes plan revision so plan edits do not resume stale sessions. */
export function dayTemplateId(dayId: string): string {
  return `day-${dayId}@${PLAN_REVISION}`;
}

/** Accepts `day-{id}` (legacy) and `day-{id}@{revision}`. */
export function dayIdFromTemplate(templateRevisionId: string): string | null {
  const match = /^day-([^@]+)(?:@.*)?$/.exec(templateRevisionId);
  return match ? match[1] : null;
}

function isResumable(s: WorkoutSession): boolean {
  return s.status === 'prepared' || s.status === 'active' || s.status === 'paused';
}

/** Finite positive body mass from profile — never invents 70 kg. */
function profileBodyKg(): number | null {
  const profile = useFitPulseStore.getState().profile;
  if (
    !isProfileComplete({
      weightKg: profile.weight,
      heightCm: profile.height,
      age: profile.age,
      gender: profile.sex
    })
  ) {
    return null;
  }
  const w = profile.weight;
  if (typeof w !== 'number' || !Number.isFinite(w) || w <= 0) return null;
  return w;
}

/**
 * Rough session burn for Health Connect export.
 * Uses frozen session.weightKgSnapshot only — never invents a default body mass.
 */
function estimateSessionBurnKcal(session: WorkoutSession): number {
  const body = session.weightKgSnapshot;
  if (typeof body !== 'number' || !Number.isFinite(body) || body <= 0) return 0;
  const started = session.startedAtMs ?? Date.now() - 30 * 60 * 1000;
  const ended = session.completedAtMs ?? Date.now();
  const minutes = Math.max(1, (ended - started) / 60000);
  // ~6 MET resistance training ≈ 0.0175 * MET * kg * min
  return Math.round(0.0175 * 6 * body * minutes);
}

/** Best-effort HC export — require keeps ActiveSessionController free of RN at load time. */
function scheduleHealthExport(session: WorkoutSession, dayId: string | null): void {
  const payload = {
    sessionId: session.sessionId,
    title: dayId ? `FitPulse · день ${dayId}` : 'FitPulse workout',
    startedAtMs: session.startedAtMs,
    completedAtMs: session.completedAtMs ?? Date.now(),
    burnedKcal: estimateSessionBurnKcal(session)
  };
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { HealthConnectService } = require('@/features/health/HealthConnectService') as {
      HealthConnectService: {
        exportCompletedSession: (p: typeof payload) => Promise<void>;
      };
    };
    void HealthConnectService.exportCompletedSession(payload);
  } catch {
    /* Jest / Expo Go / missing native */
  }
}

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

  private clearBinding(): void {
    this.sessionId = null;
    this.dayId = null;
    this.emit();
  }

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
      log.info('abandoned previous day session', {
        fromTemplate: previous.templateRevisionId,
        nextDayId
      });
    } catch (err) {
      log.debug('abandon previous session ignored', {
        err: err instanceof Error ? err.message : String(err)
      });
    }
    return null;
  }

  async ensureDaySession(dayId: string, exercises: ExerciseDef[]): Promise<WorkoutSession | null> {
    const bodyKg = profileBodyKg();
    if (bodyKg == null) {
      log.debug('ensureDaySession blocked: incomplete profile', { dayId });
      return null;
    }

    const svc = getSessionService();
    const templateId = dayTemplateId(dayId);

    if (this.sessionId && this.dayId === dayId) {
      const existing = await svc.getSession(this.sessionId);
      if (existing && isResumable(existing) && existing.templateRevisionId === templateId) {
        return existing;
      }
    }

    const sameDayOrNull = await this.abandonIfDifferentDay(dayId);
    if (sameDayOrNull) {
      log.debug('resumed same-day session', { dayId, sessionId: sameDayOrNull.sessionId });
      return this.bind(sameDayOrNull, dayId);
    }

    const sessionId = newSessionId();
    const steps = exercisesToSnapshots(exercises, bodyKg);
    const localStartDate = new Date().toISOString().slice(0, 10);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    await svc.dispatch(null, {
      type: 'prepare_session',
      sessionId,
      userId: LOCAL_USER_ID,
      templateRevisionId: templateId,
      contentHash: contentHashForExercises(exercises, bodyKg),
      steps,
      localStartDate,
      timezone,
      weightKgSnapshot: bodyKg
    });

    const started = await svc.dispatch(sessionId, { type: 'start_session' });
    log.info('started day session', { dayId, sessionId, steps: steps.length });
    return this.bind(started.session, dayId);
  }

  async restartDaySession(dayId: string, exercises: ExerciseDef[]): Promise<WorkoutSession | null> {
    const svc = getSessionService();
    const previous = await svc.getResumable(LOCAL_USER_ID);
    let dateKeyToClear: string | null = null;

    if (previous && isResumable(previous)) {
      dateKeyToClear = previous.localStartDate;
      try {
        await svc.dispatch(previous.sessionId, {
          type: 'abandon_session',
          reason: 'user_restarted'
        });
        log.info('restart: abandoned previous session', { sessionId: previous.sessionId });
      } catch (err) {
        log.debug('restart abandon ignored', {
          err: err instanceof Error ? err.message : String(err)
        });
      }
    } else {
      dateKeyToClear = new Date().toISOString().slice(0, 10);
    }

    if (dateKeyToClear) {
      clearDayReadModel(dateKeyToClear);
    }

    this.clearBinding();
    return this.ensureDaySession(dayId, exercises);
  }

  /** P0 Early Leave — pause active session (keeps resumable). */
  async pauseSession(): Promise<WorkoutSession | null> {
    if (!this.sessionId) return null;
    try {
      const result = await getSessionService().dispatch(this.sessionId, { type: 'pause_session' });
      this.emit();
      return result.session;
    } catch (err) {
      log.debug('pauseSession ignored', {
        err: err instanceof Error ? err.message : String(err)
      });
      return null;
    }
  }

  /** Resume paused session. */
  async resumeSession(): Promise<WorkoutSession | null> {
    if (!this.sessionId) return null;
    try {
      const result = await getSessionService().dispatch(this.sessionId, { type: 'resume_session' });
      this.emit();
      return result.session;
    } catch (err) {
      log.debug('resumeSession ignored', {
        err: err instanceof Error ? err.message : String(err)
      });
      return null;
    }
  }

  /** Save done volume and complete as partial (Early Leave «Сохранить прогресс»). */
  async finishPartialSession(): Promise<WorkoutSession | null> {
    if (!this.sessionId) return null;
    try {
      const result = await getSessionService().dispatch(this.sessionId, {
        type: 'complete_session',
        reason: 'user_finished_partial'
      });
      log.info('finished partial session', { sessionId: this.sessionId });
      scheduleHealthExport(result.session, this.dayId);
      this.clearBinding();
      return result.session;
    } catch (err) {
      log.debug('finishPartialSession ignored', {
        err: err instanceof Error ? err.message : String(err)
      });
      return null;
    }
  }

  /** Abandon session without completing (Early Leave «Отменить сессию»). */
  async leaveSession(): Promise<WorkoutSession | null> {
    if (!this.sessionId) return null;
    try {
      const result = await getSessionService().dispatch(this.sessionId, {
        type: 'abandon_session',
        reason: 'user_left'
      });
      log.info('left session', { sessionId: this.sessionId });
      this.clearBinding();
      return result.session;
    } catch (err) {
      log.debug('leaveSession ignored', {
        err: err instanceof Error ? err.message : String(err)
      });
      return null;
    }
  }

  async recordSetForExercise(input: {
    dayId: string;
    exercises: ExerciseDef[];
    exerciseId: number;
    weightKg: number;
    reps: number;
    rir?: number;
  }): Promise<WorkoutSession | null> {
    if (!Number.isFinite(input.weightKg) || input.weightKg <= 0) {
      return null;
    }
    const session = await this.ensureDaySession(input.dayId, input.exercises);
    if (!session) return null;
    const step = session.steps[session.currentStepIndex];
    if (!step || step.snapshot.exerciseId !== String(input.exerciseId)) {
      log.debug('recordSet rejected: out of order or missing step', {
        expected: step?.snapshot.exerciseId,
        got: input.exerciseId
      });
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

    const completed = await svc.dispatch(this.sessionId, {
      type: 'complete_session',
      reason: 'all_sets_done'
    });
    log.info('completed day session', { sessionId: this.sessionId });

    scheduleHealthExport(completed.session, this.dayId);

    this.clearBinding();
  }

  async getLegacyProjection(sessionId: string) {
    const svc = getSessionService();
    const session = await svc.getSession(sessionId);
    if (!session) return null;
    const events = await svc.listEvents(sessionId);
    return projectSessionEvents(session, events);
  }

  async load(): Promise<WorkoutSession | null> {
    if (!this.sessionId) {
      const resumable = await getSessionService().getResumable(LOCAL_USER_ID);
      if (resumable && isResumable(resumable)) {
        const dayId = dayIdFromTemplate(resumable.templateRevisionId);
        if (dayId) this.bind(resumable, dayId);
        return resumable;
      }
      return null;
    }
    return getSessionService().getSession(this.sessionId);
  }
}

export const ActiveSessionController = new ActiveSessionControllerImpl();
