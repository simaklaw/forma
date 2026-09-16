import {
  applyCommand,
  type ApplyResult,
  type CommandContext,
  type WorkoutCommand,
  type WorkoutSession,
} from "@forma/workout-domain";
import { newEventId, newOperationId } from "./ids.ts";
import { WebMemorySessionRepository } from "./memoryRepo.ts";

export class WebSessionCommandService {
  constructor(private readonly repo: WebMemorySessionRepository) {}

  async getSession(sessionId: string): Promise<WorkoutSession | null> {
    return this.repo.getSession(sessionId);
  }

  async getResumable(userId: string): Promise<WorkoutSession | null> {
    return this.repo.getResumableSession(userId);
  }

  async listEvents(sessionId: string) {
    return this.repo.listEvents(sessionId);
  }

  async dispatch(
    sessionId: string | null,
    command: WorkoutCommand,
    nowMs: number = Date.now(),
  ): Promise<ApplyResult> {
    const existing =
      command.type === "prepare_session"
        ? null
        : sessionId
          ? await this.repo.getSession(sessionId)
          : null;

    if (command.type !== "prepare_session" && !existing) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const ctx: CommandContext = {
      operationId: newOperationId(nowMs),
      eventId: newEventId(nowMs),
      eventId2: newEventId(nowMs + 1),
      nowMs,
    };

    const result = applyCommand(existing, command, ctx);
    await this.repo.commitSessionChange({
      session: result.session,
      events: result.events,
    });
    return result;
  }
}

const LOCAL_USER = "local-user";

let repo = new WebMemorySessionRepository();
let service = new WebSessionCommandService(repo);
let boundSessionId: string | null = null;

export function resetWebSessionForTests(): void {
  repo = new WebMemorySessionRepository();
  service = new WebSessionCommandService(repo);
  boundSessionId = null;
}

export function getWebSessionService(): WebSessionCommandService {
  return service;
}

export function getBoundDomainSessionId(): string | null {
  return boundSessionId;
}

export function getLocalUserId(): string {
  return LOCAL_USER;
}

export function bindDomainSessionId(id: string | null): void {
  boundSessionId = id;
}
