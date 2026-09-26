import type { HealthWorkoutExport } from './types';

export interface SessionBurnInput {
  sessionId: string;
  title: string;
  startedAtMs: number | null;
  completedAtMs: number | null;
  /** Estimated active burn from FitPulse engines (kcal). */
  burnedKcal: number;
}

/**
 * Maps a completed FitPulse session into a Health Connect–ready payload.
 * Pure: no native modules, safe for Jest and web.
 */
export function mapSessionToHealthWorkout(
  input: SessionBurnInput,
  nowMs: number = Date.now()
): HealthWorkoutExport | null {
  if (!input.sessionId.trim()) return null;
  if (!Number.isFinite(input.burnedKcal) || input.burnedKcal < 0) return null;

  const startMs =
    input.startedAtMs != null && Number.isFinite(input.startedAtMs)
      ? input.startedAtMs
      : null;
  const endMs =
    input.completedAtMs != null && Number.isFinite(input.completedAtMs)
      ? input.completedAtMs
      : null;

  if (startMs == null || endMs == null) return null;
  if (endMs < startMs) return null;
  // Reject future-dated sessions beyond clock skew tolerance
  if (startMs > nowMs + 5 * 60 * 1000) return null;

  return {
    startTime: new Date(startMs).toISOString(),
    endTime: new Date(endMs).toISOString(),
    activeCaloriesKcal: Math.round(input.burnedKcal),
    title: input.title.trim() || 'FitPulse workout',
    sessionId: input.sessionId
  };
}
