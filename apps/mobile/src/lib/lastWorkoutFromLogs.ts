import type { SetLogEntry } from '@forma/core';

export interface LastWorkoutHint {
  name: string;
  completedAt: string;
  sets: number;
}

/**
 * Infer a display name for the most recent training day from set logs.
 * Pure — no RN / Date.now().
 */
export function lastWorkoutFromLogs(
  setLogs: SetLogEntry[],
  exerciseNames: Record<number, string>
): LastWorkoutHint | null {
  if (setLogs.length === 0) return null;

  let latest = setLogs[0].dateKey;
  for (const e of setLogs) {
    if (e.dateKey > latest) latest = e.dateKey;
  }

  const day = setLogs.filter((e) => e.dateKey === latest);
  const counts = new Map<number, number>();
  for (const e of day) {
    counts.set(e.exerciseId, (counts.get(e.exerciseId) ?? 0) + 1);
  }

  let bestId = day[0].exerciseId;
  let bestCount = 0;
  for (const [id, c] of counts) {
    if (c > bestCount) {
      bestCount = c;
      bestId = id;
    }
  }

  return {
    name: exerciseNames[bestId] ?? `Упр. #${bestId}`,
    completedAt: latest,
    sets: day.length
  };
}
