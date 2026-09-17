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

  getRepo(): WebMemorySessionRepository {
    return this.repo;
  }

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

/** Tests: no localStorage. Browser: persist by default. */
function createRepo(forTests = false): WebMemorySessionRepository {
  return new WebMemorySessionRepository({ persist: !forTests });
}

let repo = createRepo(false);
let service = new WebSessionCommandService(repo);

export function resetWebSessionForTests(): void {
  repo = createRepo(true);
  service = new WebSessionCommandService(repo);
}

export function getWebSessionService(): WebSessionCommandService {
  return service;
}

export function getBoundDomainSessionId(): string | null {
  return repo.getBoundSessionId();
}

export function getLocalUserId(): string {
  return LOCAL_USER;
}

export function bindDomainSessionId(id: string | null): void {
  repo.setBoundSessionId(id);
}

/** Expected exercise id for the domain sequential step (if any). */
export async function getDomainExpectedExerciseId(): Promise<string | null> {
  const id = getBoundDomainSessionId();
  if (!id) return null;
  const session = await service.getSession(id);
  if (!session || session.status === "completed" || session.status === "abandoned") {
    return null;
  }
  const step = session.steps[session.currentStepIndex];
  return step?.snapshot.exerciseId ?? null;
}
