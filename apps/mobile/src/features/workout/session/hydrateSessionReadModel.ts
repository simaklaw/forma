import { useFitPulseStore } from '@/state/useFitPulseStore';
import { mergeSessionProjection } from '@/features/workout/data/sessionProjections';
import { ActiveSessionController } from './ActiveSessionController';

/**
 * After SQLite (or memory) is ready: bind resumable session and merge its
 * journal into Zustand setLogs/dayProgress so Home/Progress match player
 * without opening WorkoutScreen first.
 */
export async function hydrateSessionReadModel(): Promise<void> {
  try {
    const session = await ActiveSessionController.load();
    if (!session) return;

    const projection = await ActiveSessionController.getLegacyProjection(session.sessionId);
    if (!projection) return;

    const current = useFitPulseStore.getState();
    const merged = mergeSessionProjection(
      { setLogs: current.setLogs, dayProgress: current.dayProgress },
      projection
    );
    current.hydrate({
      setLogs: merged.setLogs,
      dayProgress: merged.dayProgress
    });
  } catch (err) {
    console.warn('[FitPulse] session read-model hydrate failed', err);
  }
}
