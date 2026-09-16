import type { DayProgress, SetLogEntry } from '@/engines/WorkoutStats';
import { useFitPulseStore } from '@/state/useFitPulseStore';

/**
 * After user_restarted: drop legacy projection rows for that calendar day so
 * mergeSessionProjection (Math.max) cannot keep abandoned-session set counts.
 */
export function clearDayReadModel(dateKey: string): void {
  const current = useFitPulseStore.getState();
  const setLogs: SetLogEntry[] = current.setLogs.filter((e) => e.dateKey !== dateKey);
  const dayProgress: DayProgress = { ...current.dayProgress };
  delete dayProgress[dateKey];
  current.hydrate({ setLogs, dayProgress });
}
