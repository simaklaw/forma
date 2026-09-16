import type { WorkoutCommand, ApplyOptions } from './commands.ts';
import type { SessionEvent } from './events.ts';
import {
  DomainError,
  type CommandContext,
  type SessionStepState,
  type WorkoutSession
} from './types.ts';

export interface ApplyResult {
  session: WorkoutSession;
  events: SessionEvent[];
}

function assertNotTerminal(session: WorkoutSession): void {
  if (session.status === 'completed' || session.status === 'abandoned') {
    throw new DomainError('terminal_session', `Session is ${session.status}`);
  }
}

function totalTargetSets(session: WorkoutSession): number {
  return session.steps.reduce((n, s) => n + s.snapshot.targetSets, 0);
}

function totalCompletedSets(session: WorkoutSession): number {
  return session.steps.reduce((n, s) => n + s.completedSets.length, 0);
}

function allRequiredDone(session: WorkoutSession): boolean {
  return session.steps.every(
    (s) => s.skipped || s.completedSets.length >= s.snapshot.targetSets
  );
}

function nextOrdinal(session: WorkoutSession): number {
  return session.lastEventOrdinal + 1;
}

function baseEvent(
  session: WorkoutSession,
  ctx: CommandContext,
  type: SessionEvent['type']
): Pick<SessionEvent, 'eventId' | 'sessionId' | 'ordinal' | 'occurredAtMs' | 'payloadSchemaVersion' | 'operationId' | 'type'> {
  return {
    eventId: ctx.eventId,
    sessionId: session.sessionId,
    ordinal: nextOrdinal(session),
    occurredAtMs: ctx.nowMs,
    payloadSchemaVersion: 1,
    operationId: ctx.operationId,
    type
  };
}

function bump(session: WorkoutSession, events: SessionEvent[]): WorkoutSession {
  const last = events[events.length - 1];
  return {
    ...session,
    lastEventOrdinal: last ? last.ordinal : session.lastEventOrdinal,
    rowVersion: session.rowVersion + 1
  };
}

/**
 * Pure session reducer. Deterministic given (session | null, command, ctx).
 * Does not call Date.now(), Math.random, network, or UI.
 */
export function applyCommand(
  session: WorkoutSession | null,
  command: WorkoutCommand,
  ctx: CommandContext,
  options: ApplyOptions = {}
): ApplyResult {
  if (command.type === 'prepare_session') {
    if (session !== null) {
      throw new DomainError('invalid_transition', 'prepare_session requires null session');
    }
    if (!command.steps.length) {
      throw new DomainError('empty_plan', 'Cannot prepare session with zero steps');
    }

    const steps: SessionStepState[] = command.steps.map((snapshot) => ({
      snapshot,
      completedSets: [],
      skipped: false
    }));

    const prepared: WorkoutSession = {
      sessionId: command.sessionId,
      userId: command.userId,
      status: 'prepared',
      templateRevisionId: command.templateRevisionId,
      contentHash: command.contentHash,
      steps,
      currentStepIndex: 0,
      restEndsAtMs: null,
      startedAtMs: null,
      completedAtMs: null,
      lastEventOrdinal: 0,
      rowVersion: 0,
      localStartDate: command.localStartDate,
      timezone: command.timezone
    };

    const event: SessionEvent = {
      ...baseEvent(prepared, ctx, 'session_prepared'),
      type: 'session_prepared',
      payload: {
        templateRevisionId: command.templateRevisionId,
        contentHash: command.contentHash,
        stepCount: steps.length,
        localStartDate: command.localStartDate,
        timezone: command.timezone
      }
    };
    event.ordinal = 1;
    const withEvent: WorkoutSession = {
      ...prepared,
      lastEventOrdinal: 1,
      rowVersion: 1
    };
    return { session: withEvent, events: [event] };
  }

  if (session === null) {
    throw new DomainError('invalid_transition', `${command.type} requires an existing session`);
  }

  if (options.expectedVersion !== undefined && options.expectedVersion !== session.rowVersion) {
    throw new DomainError(
      'version_conflict',
      `expected version ${options.expectedVersion}, got ${session.rowVersion}`
    );
  }

  switch (command.type) {
    case 'start_session': {
      if (session.status !== 'prepared') {
        throw new DomainError('invalid_transition', 'start_session only from prepared');
      }
      const event: SessionEvent = {
        ...baseEvent(session, ctx, 'session_started'),
        type: 'session_started',
        payload: {}
      };
      const next = bump(
        {
          ...session,
          status: 'active',
          startedAtMs: ctx.nowMs,
          restEndsAtMs: null
        },
        [event]
      );
      return { session: next, events: [event] };
    }

    case 'complete_set': {
      assertNotTerminal(session);
      if (session.status !== 'active') {
        throw new DomainError('invalid_transition', 'complete_set only while active');
      }
      if (session.restEndsAtMs !== null && ctx.nowMs < session.restEndsAtMs) {
        throw new DomainError('still_resting', 'Finish or skip rest before next set');
      }

      const stepIndex = session.currentStepIndex;
      const step = session.steps[stepIndex];
      if (!step || step.skipped) {
        throw new DomainError('step_out_of_range', 'No active step');
      }
      if (step.completedSets.length >= step.snapshot.targetSets) {
        throw new DomainError('set_already_complete', 'All sets for this step are done');
      }

      const setNo = step.completedSets.length + 1;
      const setEvent: SessionEvent = {
        ...baseEvent(session, ctx, 'set_completed'),
        type: 'set_completed',
        payload: {
          stepIndex,
          setNo,
          weightKg: command.weightKg,
          reps: command.reps,
          rir: command.rir
        }
      };

      const completedSets = [
        ...step.completedSets,
        {
          setNo,
          weightKg: command.weightKg,
          reps: command.reps,
          rir: command.rir,
          completedAtMs: ctx.nowMs,
          eventId: ctx.eventId
        }
      ];

      const steps = session.steps.map((s, i) =>
        i === stepIndex ? { ...s, completedSets } : s
      );

      let next: WorkoutSession = {
        ...session,
        steps,
        restEndsAtMs: null
      };

      const events: SessionEvent[] = [setEvent];
      const stepDone = completedSets.length >= step.snapshot.targetSets;
      const moreSteps = stepIndex + 1 < session.steps.length;

      if (stepDone && moreSteps) {
        next = { ...next, currentStepIndex: stepIndex + 1 };
      }

      const stillWorkOnStep = completedSets.length < step.snapshot.targetSets;
      const shouldRest =
        command.autoStartRest !== false &&
        step.snapshot.restSeconds > 0 &&
        (stillWorkOnStep || moreSteps) &&
        !allRequiredDone({ ...next, steps });

      if (shouldRest && stillWorkOnStep) {
        if (!ctx.eventId2) {
          throw new DomainError(
            'invalid_transition',
            'complete_set with rest requires CommandContext.eventId2 (UUIDv7)'
          );
        }
        const endsAtMs = ctx.nowMs + step.snapshot.restSeconds * 1000;
        const restEvent: SessionEvent = {
          eventId: ctx.eventId2,
          sessionId: session.sessionId,
          ordinal: setEvent.ordinal + 1,
          occurredAtMs: ctx.nowMs,
          payloadSchemaVersion: 1,
          operationId: ctx.operationId,
          type: 'rest_started',
          payload: {
            stepIndex,
            endsAtMs,
            durationSeconds: step.snapshot.restSeconds
          }
        };
        events.push(restEvent);
        next = {
          ...next,
          restEndsAtMs: endsAtMs,
          lastEventOrdinal: restEvent.ordinal,
          rowVersion: session.rowVersion + events.length
        };
        return { session: next, events };
      }

      next = bump(next, events);
      return { session: next, events };
    }

    case 'skip_rest': {
      assertNotTerminal(session);
      if (session.status !== 'active') {
        throw new DomainError('invalid_transition', 'skip_rest only while active');
      }
      if (session.restEndsAtMs === null) {
        throw new DomainError('not_resting', 'No active rest to skip');
      }
      const event: SessionEvent = {
        ...baseEvent(session, ctx, 'rest_skipped'),
        type: 'rest_skipped',
        payload: {}
      };
      const next = bump({ ...session, restEndsAtMs: null }, [event]);
      return { session: next, events: [event] };
    }

    case 'skip_step': {
      assertNotTerminal(session);
      if (session.status !== 'active' && session.status !== 'paused') {
        throw new DomainError('invalid_transition', 'skip_step only while active/paused');
      }
      const stepIndex = session.currentStepIndex;
      const step = session.steps[stepIndex];
      if (!step) {
        throw new DomainError('step_out_of_range', 'No current step');
      }
      if (step.skipped) {
        throw new DomainError('invalid_transition', 'Step already skipped');
      }

      const event: SessionEvent = {
        ...baseEvent(session, ctx, 'step_skipped'),
        type: 'step_skipped',
        payload: { stepIndex, reason: command.reason }
      };

      const steps = session.steps.map((s, i) =>
        i === stepIndex ? { ...s, skipped: true, skipReason: command.reason } : s
      );
      let currentStepIndex = stepIndex;
      if (stepIndex + 1 < steps.length) {
        currentStepIndex = stepIndex + 1;
      }

      const next = bump(
        {
          ...session,
          steps,
          currentStepIndex,
          restEndsAtMs: null
        },
        [event]
      );
      return { session: next, events: [event] };
    }

    case 'pause_session': {
      assertNotTerminal(session);
      if (session.status !== 'active') {
        throw new DomainError('invalid_transition', 'pause_session only while active');
      }
      const event: SessionEvent = {
        ...baseEvent(session, ctx, 'session_paused'),
        type: 'session_paused',
        payload: {}
      };
      const next = bump({ ...session, status: 'paused', restEndsAtMs: null }, [event]);
      return { session: next, events: [event] };
    }

    case 'resume_session': {
      assertNotTerminal(session);
      if (session.status !== 'paused') {
        throw new DomainError('invalid_transition', 'resume_session only while paused');
      }
      const event: SessionEvent = {
        ...baseEvent(session, ctx, 'session_resumed'),
        type: 'session_resumed',
        payload: {}
      };
      const next = bump({ ...session, status: 'active' }, [event]);
      return { session: next, events: [event] };
    }

    case 'complete_session': {
      assertNotTerminal(session);
      if (session.status !== 'active' && session.status !== 'paused') {
        throw new DomainError('invalid_transition', 'complete_session only from active/paused');
      }
      const reason =
        command.reason ??
        (allRequiredDone(session) ? 'all_sets_done' : 'user_finished_partial');
      const event: SessionEvent = {
        ...baseEvent(session, ctx, 'session_completed'),
        type: 'session_completed',
        payload: {
          reason,
          completedSets: totalCompletedSets(session),
          targetSets: totalTargetSets(session)
        }
      };
      const next = bump(
        {
          ...session,
          status: 'completed',
          completedAtMs: ctx.nowMs,
          terminalReason: reason,
          restEndsAtMs: null
        },
        [event]
      );
      return { session: next, events: [event] };
    }

    case 'abandon_session': {
      assertNotTerminal(session);
      if (session.status === 'prepared') {
        // ok
      } else if (session.status !== 'active' && session.status !== 'paused') {
        throw new DomainError('invalid_transition', 'abandon_session invalid status');
      }
      const reason = command.reason ?? 'user_left';
      const event: SessionEvent = {
        ...baseEvent(session, ctx, 'session_abandoned'),
        type: 'session_abandoned',
        payload: {
          reason,
          completedSets: totalCompletedSets(session),
          targetSets: totalTargetSets(session)
        }
      };
      const next = bump(
        {
          ...session,
          status: 'abandoned',
          completedAtMs: ctx.nowMs,
          terminalReason: reason,
          restEndsAtMs: null
        },
        [event]
      );
      return { session: next, events: [event] };
    }

    default: {
      const _exhaustive: never = command;
      throw new DomainError('invalid_transition', `Unknown command: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

/** Replay ordered events onto null → session (for recovery tests). */
export function replayEvents(
  events: SessionEvent[],
  seed: {
    sessionId: string;
    userId: string;
    steps: SessionStepState['snapshot'][];
  }
): WorkoutSession {
  let session: WorkoutSession | null = null;
  for (const ev of events) {
    const ctx: CommandContext = {
      operationId: ev.operationId,
      eventId: ev.eventId,
      nowMs: ev.occurredAtMs
    };
    if (ev.type === 'session_prepared') {
      const result = applyCommand(
        null,
        {
          type: 'prepare_session',
          sessionId: seed.sessionId,
          userId: seed.userId,
          templateRevisionId: ev.payload.templateRevisionId,
          contentHash: ev.payload.contentHash,
          steps: seed.steps,
          localStartDate: ev.payload.localStartDate,
          timezone: ev.payload.timezone
        },
        ctx
      );
      session = result.session;
      continue;
    }
    if (!session) throw new DomainError('invalid_transition', 'replay missing prepare');
    break;
  }
  if (!session) throw new DomainError('invalid_transition', 'no events to replay');
  return session;
}
