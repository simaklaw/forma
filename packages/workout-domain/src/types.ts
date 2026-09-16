/**
 * Workout domain types — platform-neutral.
 * No React, no Date.now(), no network. Time and IDs arrive via CommandContext.
 */

export type SessionStatus = 'prepared' | 'active' | 'paused' | 'completed' | 'abandoned';

export type TerminalReason =
  | 'all_sets_done'
  | 'user_finished_partial'
  | 'user_left'
  | 'replaced_by_new_session';

export type SkipReason = 'pain' | 'equipment' | 'time' | 'too_hard' | 'other';

/** Immutable snapshot of one exercise step at session start. */
export interface SessionStepSnapshot {
  stepIndex: number;
  exerciseId: string;
  exerciseRevisionId: string;
  name: string;
  targetSets: number;
  targetReps: number;
  /** Planned working weight in kg; 0 for bodyweight. */
  targetWeightKg: number;
  restSeconds: number;
}

/** One logged set inside a step (projection of set_completed events). */
export interface SessionSetLog {
  setNo: number;
  weightKg: number;
  reps: number;
  rir?: number;
  completedAtMs: number;
  eventId: string;
}

export interface SessionStepState {
  snapshot: SessionStepSnapshot;
  completedSets: SessionSetLog[];
  skipped: boolean;
  skipReason?: SkipReason;
}

/**
 * Aggregate root. Source of truth for player; UI reads projections of this.
 * rowVersion bumps on every accepted command (optimistic concurrency).
 */
export interface WorkoutSession {
  sessionId: string;
  userId: string;
  status: SessionStatus;
  /** Template/program identity at start — never mutated after prepare. */
  templateRevisionId: string;
  contentHash: string;
  steps: SessionStepState[];
  currentStepIndex: number;
  /** Absolute rest deadline (ms UTC). Null when not resting. */
  restEndsAtMs: number | null;
  startedAtMs: number | null;
  completedAtMs: number | null;
  terminalReason?: TerminalReason;
  lastEventOrdinal: number;
  rowVersion: number;
  localStartDate: string;
  timezone: string;
}

export interface CommandContext {
  /** Client-generated stable id for this command (UUIDv7). */
  operationId: string;
  /** Domain event id (UUIDv7) for the primary event. */
  eventId: string;
  /**
   * Optional second event id when one command emits two events
   * (e.g. set_completed + rest_started). Must be a full UUIDv7 — never a suffix.
   */
  eventId2?: string;
  /** Wall-clock ms at command time — injected, never Date.now() inside reducer. */
  nowMs: number;
  deviceId?: string;
}

export type DomainErrorCode =
  | 'invalid_transition'
  | 'terminal_session'
  | 'step_out_of_range'
  | 'set_already_complete'
  | 'not_resting'
  | 'still_resting'
  | 'empty_plan'
  | 'version_conflict';

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}
