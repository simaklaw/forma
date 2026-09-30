/**
 * ChangeApplier for entity_type 'workout_session': merges a server-side
 * session projection (payload.projection = { setLogs, dayProgress }) into
 * the local UI read model. Unknown payload shapes are skipped (false),
 * never guessed — a later push payload enrichment will fill them in.
 */

import type { PullChange } from './syncPullService';

export type ApplySessionProjection = (next: {
  setLogs: unknown[];
  dayProgress: Record<string, Record<string, number>>;
}) => void;

function isSessionProjectionPayload(payload: unknown):
  payload is { setLogs: unknown[]; dayProgress: Record<string, Record<string, number>> } {
  if (!payload || typeof payload !== 'object') return false;
  const v = payload as Record<string, unknown>;
  if (!Array.isArray(v.setLogs)) return false;
  if (!v.dayProgress || typeof v.dayProgress !== 'object') return false;
  return true;
}

export function createWorkoutSessionChangeApplier(
  apply: ApplySessionProjection,
): { apply(change: PullChange): boolean } {
  return {
    apply(change: PullChange): boolean {
      if (change.entity_type !== 'workout_session') return false;
      if (change.mutation === 'tombstone') {
        // Tombstones are acknowledged but not applied yet (no delete
        // path in the local read model); count as applied to advance.
        return true;
      }
      const payload = change.payload as Record<string, unknown> | undefined;
      const projection =
        payload && typeof payload === 'object' && 'projection' in payload
          ? payload.projection
          : undefined;
      if (!isSessionProjectionPayload(projection)) return false;
      apply(projection);
      return true;
    },
  };
}
