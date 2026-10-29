import type { SessionStepSnapshot, SkipReason, TerminalReason } from './types.ts';

/**
 * Commands are validated intents. Reducer turns them into events + new state.
 * expectedVersion enables optimistic concurrency (optional on local-only P0).
 */

export type WorkoutCommand =
  | {
      type: 'prepare_session';
      sessionId: string;
      userId: string;
      templateRevisionId: string;
      contentHash: string;
      steps: SessionStepSnapshot[];
      localStartDate: string;
      timezone: string;
      /** User body mass at session start (optional for older callers). */
      weightKgSnapshot?: number;
    }
  | { type: 'start_session' }
  | {
      type: 'complete_set';
      weightKg: number;
      reps: number;
      rir?: number;
      /** If true, auto-start rest from step.restSeconds when more sets remain. */
      autoStartRest?: boolean;
      /**
       * Rest duration override (Fud AI presets): number = fixed seconds,
       * null = rest off, undefined = use step.restSeconds from the plan.
       */
      restSecondsOverride?: number | null;
      /** Шаг, в который логается подход; по умолчанию текущий. Не-текущий шаг
       * редьюсер принимает только внутри активной суперсет-группы. */
      stepIndex?: number;
    }
  | { type: 'skip_rest' }
  | { type: 'skip_step'; reason: SkipReason }
  | { type: 'pause_session' }
  | { type: 'resume_session' }
  | {
      type: 'complete_session';
      reason?: Extract<TerminalReason, 'all_sets_done' | 'user_finished_partial'>;
    }
  | {
      type: 'abandon_session';
      reason?: Extract<TerminalReason, 'user_left' | 'replaced_by_new_session' | 'user_restarted'>;
    };

export interface ApplyOptions {
  /** Reject if session.rowVersion !== expectedVersion. */
  expectedVersion?: number;
}
