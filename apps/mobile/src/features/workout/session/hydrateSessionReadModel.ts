import { applySessionProjection } from '@/features/workout/data/applySessionProjection';
import { ActiveSessionController } from './ActiveSessionController';

/**
 * After SQLite (or memory) is ready: bind resumable session and merge its
 * journal into Zustand setLogs/dayProgress/personalRecords so Home/Progress
 * match player without opening WorkoutScreen first.
 */
export async function hydrateSessionReadModel(): Promise<void> {
  try {
    const session = await ActiveSessionController.load();
    if (!session) return;

    const projection = await ActiveSessionController.getLegacyProjection(session.sessionId);
    if (!projection) return;

    applySessionProjection(projection);
  } catch (err) {
    console.warn('[FitPulse] session read-model hydrate failed', err);
  }
}
