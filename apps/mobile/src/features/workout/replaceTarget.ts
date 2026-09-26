import type { TrainingMode } from './catalog';

/** In-memory target for "replace slot from catalog" flow (not persisted). */
export type ReplaceTarget = {
  mode: TrainingMode;
  dayId: string;
  dayName: string;
  slotIndex: number;
  currentExerciseId: number;
  currentName: string;
};

let target: ReplaceTarget | null = null;
const listeners = new Set<() => void>();

export function getReplaceTarget(): ReplaceTarget | null {
  return target;
}

export function setReplaceTarget(next: ReplaceTarget | null): void {
  target = next;
  listeners.forEach((fn) => fn());
}

export function clearReplaceTarget(): void {
  setReplaceTarget(null);
}

export function subscribeReplaceTarget(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
