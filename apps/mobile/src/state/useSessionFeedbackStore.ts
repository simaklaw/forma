/**
 * Lightweight feedback log, deliberately separate from the event-sourced
 * workout-domain aggregate (packages/workout-domain) — see
 * GROK-instructions-session-feedback-06.md for why. Keyed by sessionId so
 * it can be joined with session history later without migrating the domain.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type EarlyLeaveReason =
  | 'no_time'
  | 'too_tired'
  | 'pain'
  | 'equipment'
  | 'not_motivated'
  | 'other';

export type FeelRating = 1 | 2 | 3 | 4 | 5; // 1 = ужасно, 5 = отлично
export type PerceivedDifficulty = 'too_easy' | 'just_right' | 'too_hard';

export interface SessionFeedbackEntry {
  sessionId: string;
  dayId: string;
  recordedAtMs: number;
  kind: 'early_leave' | 'completed';
  earlyLeaveReason?: EarlyLeaveReason;
  feel?: FeelRating;
  difficulty?: PerceivedDifficulty;
  hadPain?: boolean;
  wouldRepeat?: boolean;
}

interface SessionFeedbackStore {
  entries: SessionFeedbackEntry[];
  recordEarlyLeave: (sessionId: string, dayId: string, reason: EarlyLeaveReason) => void;
  recordCompletionFeedback: (
    sessionId: string,
    dayId: string,
    feedback: {
      feel: FeelRating;
      difficulty: PerceivedDifficulty;
      hadPain: boolean;
      wouldRepeat: boolean;
    }
  ) => void;
}

const MAX_ENTRIES = 200; // mirrors SET_LOG_RETENTION-style bound in useFitPulseStore

export const useSessionFeedbackStore = create<SessionFeedbackStore>()(
  persist(
    (set) => ({
      entries: [],

      recordEarlyLeave: (sessionId, dayId, reason) =>
        set((s) => ({
          entries: [
            ...s.entries,
            {
              sessionId,
              dayId,
              recordedAtMs: Date.now(),
              kind: 'early_leave',
              earlyLeaveReason: reason
            }
          ].slice(-MAX_ENTRIES)
        })),

      recordCompletionFeedback: (sessionId, dayId, feedback) =>
        set((s) => ({
          entries: [
            ...s.entries,
            {
              sessionId,
              dayId,
              recordedAtMs: Date.now(),
              kind: 'completed',
              ...feedback
            }
          ].slice(-MAX_ENTRIES)
        }))
    }),
    {
      name: 'fitpulse_session_feedback',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SessionFeedbackStore>;
        return {
          ...current,
          entries: Array.isArray(p.entries) ? p.entries : current.entries
        };
      }
    }
  )
);
