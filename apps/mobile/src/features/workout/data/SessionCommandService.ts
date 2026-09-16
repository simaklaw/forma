import {
  applyCommand,
  type ApplyResult,
  type CommandContext,
  type WorkoutCommand,
  type WorkoutSession
} from '@forma/workout-domain';
import { newEventId, newOperationId } from './ids';
import { hashPayload, type SessionRepository } from './SessionRepository';

export interface DispatchContext {
  /** Injected wall clock; defaults to Date.now() at the adapter edge only. */
  nowMs?: number;
  operationId?: string;
  eventId?: string;
  eventId2?: string;
  deviceId?: string;
  expectedVersion?: number;
}

/**
 * Application service: load aggregate → pure reducer → durable commit.
 * UI never calls applyCommand + repository separately.
 */
export class SessionCommandService {
  constructor(private readonly repo: SessionRepository) {}

  async getSession(sessionId: string): Promise<WorkoutSession | null> {
    return this.repo.getSession(sessionId);
  }

  async getResumable(userId: string): Promise<WorkoutSession | null> {
    return this.repo.getResumableSession(userId);
  }

  async dispatch(
    sessionId: string | null,
    command: WorkoutCommand,
    dispatchCtx: DispatchContext = {}
  ): Promise<ApplyResult> {
    const existing =
      command.type === 'prepare_session'
        ? null
        : sessionId
          ? await this.repo.getSession(sessionId)
          : null;

    if (command.type !== 'prepare_session' && !existing) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const nowMs = dispatchCtx.nowMs ?? Date.now();
    const ctx: CommandContext = {
      operationId: dispatchCtx.operationId ?? newOperationId(nowMs),
      eventId: dispatchCtx.eventId ?? newEventId(nowMs),
      eventId2: dispatchCtx.eventId2 ?? newEventId(nowMs),
      nowMs,
      deviceId: dispatchCtx.deviceId
    };

    const result = applyCommand(existing, command, ctx, {
      expectedVersion: dispatchCtx.expectedVersion
    });

    const payloadHashes = result.events.map((e) => hashPayload(e.payload));

    await this.repo.commitSessionChange({
      session: result.session,
      events: result.events,
      payloadHashes
    });

    return result;
  }
}
