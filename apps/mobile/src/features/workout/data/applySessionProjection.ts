import { useFitPulseStore } from '@/state/useFitPulseStore';
import { mergeSessionProjection, type SessionProjection } from './sessionProjections';
import { mergePersonalRecords, personalRecordsFromSetLogs } from './personalRecords';

/**
 * Merge a session projection into Zustand setLogs / dayProgress / personalRecords.
 * Single entry for ExerciseSheet, WorkoutScreen, and bootstrap hydrate.
 */
export function applySessionProjection(next: SessionProjection): void {
  const current = useFitPulseStore.getState();
  const merged = mergeSessionProjection(
    { setLogs: current.setLogs, dayProgress: current.dayProgress },
    next
  );
  const prFromLogs = personalRecordsFromSetLogs(merged.setLogs);
  const personalRecords = mergePersonalRecords(current.personalRecords, prFromLogs);
  current.hydrate({
    setLogs: merged.setLogs,
    dayProgress: merged.dayProgress,
    personalRecords
  });
}
