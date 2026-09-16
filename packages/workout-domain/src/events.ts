import type { SkipReason, TerminalReason } from './types.ts';

/** Append-only domain events. Payload is schema-versioned for forward compat. */

export type SessionEventType =
  | 'session_prepared'
  | 'session_started'
  | 'set_completed'
  | 'rest_started'
  | 'rest_skipped'
  | 'step_skipped'
  | 'session_paused'
  | 'session_resumed'
  | 'session_completed'
  | 'session_abandoned';

export interface SessionEventBase {
  eventId: string;
  sessionId: string;
  ordinal: number;
  type: SessionEventType;
  occurredAtMs: number;
  payloadSchemaVersion: 1;
  operationId: string;
}

export interface SessionPreparedPayload {
  templateRevisionId: string;
  contentHash: string;
  stepCount: number;
  localStartDate: string;
  timezone: string;
}

export interface SetCompletedPayload {
  stepIndex: number;
  setNo: number;
  weightKg: number;
  reps: number;
  rir?: number;
}

export interface RestStartedPayload {
  stepIndex: number;
  endsAtMs: number;
  durationSeconds: number;
}

export interface StepSkippedPayload {
  stepIndex: number;
  reason: SkipReason;
}

export interface SessionTerminalPayload {
  reason: TerminalReason;
  completedSets: number;
  targetSets: number;
}

export type SessionEvent =
  | (SessionEventBase & { type: 'session_prepared'; payload: SessionPreparedPayload })
  | (SessionEventBase & { type: 'session_started'; payload: Record<string, never> })
  | (SessionEventBase & { type: 'set_completed'; payload: SetCompletedPayload })
  | (SessionEventBase & { type: 'rest_started'; payload: RestStartedPayload })
  | (SessionEventBase & { type: 'rest_skipped'; payload: Record<string, never> })
  | (SessionEventBase & { type: 'step_skipped'; payload: StepSkippedPayload })
  | (SessionEventBase & { type: 'session_paused'; payload: Record<string, never> })
  | (SessionEventBase & { type: 'session_resumed'; payload: Record<string, never> })
  | (SessionEventBase & { type: 'session_completed'; payload: SessionTerminalPayload })
  | (SessionEventBase & { type: 'session_abandoned'; payload: SessionTerminalPayload });
