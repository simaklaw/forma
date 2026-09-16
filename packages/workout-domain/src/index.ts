/**
 * @forma/workout-domain — pure workout session aggregate.
 * UI-agnostic. Persistence and timers live in app adapters.
 */

export const WORKOUT_DOMAIN_VERSION = '0.1.0';

export type {
  SessionStatus,
  TerminalReason,
  SkipReason,
  SessionStepSnapshot,
  SessionSetLog,
  SessionStepState,
  WorkoutSession,
  CommandContext,
  DomainErrorCode
} from './types.ts';
export { DomainError } from './types.ts';

export type {
  SessionEventType,
  SessionEvent,
  SessionPreparedPayload,
  SetCompletedPayload,
  RestStartedPayload,
  StepSkippedPayload,
  SessionTerminalPayload
} from './events.ts';

export type { WorkoutCommand, ApplyOptions } from './commands.ts';

/** Pure command application. Event-log replay is not a public API in P0. */
export { applyCommand } from './reducer.ts';
export type { ApplyResult } from './reducer.ts';
