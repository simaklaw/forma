/**
 * Thin mobile helper over @forma/core session burn.
 */

import { estimateBurnFromSetLogs, type SetLogEntry } from '@forma/core';

export function estimateWorkoutBurnKcal(
  setLogs: SetLogEntry[],
  dateKey: string,
  bodyKg: number | null | undefined
): number {
  if (typeof bodyKg !== 'number' || !Number.isFinite(bodyKg) || bodyKg <= 0) {
    return 0;
  }
  return estimateBurnFromSetLogs({
    weightKg: bodyKg,
    setLogs,
    dateKey
  });
}
