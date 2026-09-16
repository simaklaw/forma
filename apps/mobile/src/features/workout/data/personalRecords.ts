import type { SetLogEntry } from '@/engines/WorkoutStats';

/** Max weight per exerciseId from set logs (local PR projection). */
export function personalRecordsFromSetLogs(
  logs: readonly SetLogEntry[]
): Record<number, number> {
  const pr: Record<number, number> = {};
  for (const entry of logs) {
    const prev = pr[entry.exerciseId] ?? 0;
    if (entry.weight > prev) pr[entry.exerciseId] = entry.weight;
  }
  return pr;
}

/** Merge two PR maps with Math.max per exercise. */
export function mergePersonalRecords(
  current: Record<number, number>,
  next: Record<number, number>
): Record<number, number> {
  const out = { ...current };
  for (const [id, weight] of Object.entries(next)) {
    const key = Number(id);
    out[key] = Math.max(out[key] ?? 0, weight);
  }
  return out;
}
