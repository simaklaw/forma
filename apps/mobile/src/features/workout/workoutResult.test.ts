import type { WorkoutSession } from '@forma/workout-domain';
import { summarizeWorkoutResult, workoutResultMessage } from './workoutResult';

function completedSession(): WorkoutSession {
  return {
    sessionId: 'session-1',
    userId: 'local-user',
    status: 'completed',
    templateRevisionId: 'day-push',
    contentHash: 'hash',
    currentStepIndex: 1,
    restEndsAtMs: null,
    startedAtMs: 1,
    completedAtMs: 2,
    lastEventOrdinal: 4,
    rowVersion: 4,
    localStartDate: '2026-10-11',
    timezone: 'UTC',
    weightKgSnapshot: 80,
    steps: [
      {
        snapshot: {
          stepIndex: 0,
          exerciseId: '1',
          exerciseRevisionId: '1',
          name: 'Bench Press',
          targetSets: 3,
          targetReps: 10,
          targetWeightKg: 50,
          restSeconds: 60
        },
        completedSets: [{ setNo: 1, weightKg: 50, reps: 10, completedAtMs: 2, eventId: 'set-1' }],
        skipped: true,
        skipReason: 'time'
      },
      {
        snapshot: {
          stepIndex: 1,
          exerciseId: '2',
          exerciseRevisionId: '1',
          name: 'Squat',
          targetSets: 3,
          targetReps: 10,
          targetWeightKg: 50,
          restSeconds: 60
        },
        completedSets: [],
        skipped: true,
        skipReason: 'time'
      }
    ]
  };
}

describe('workout result', () => {
  it('shares performed sets rather than planned or skipped sets and freezes the result', () => {
    const session = completedSession();
    const result = summarizeWorkoutResult(session, 'Силовая', 2);
    expect(result.totalSets).toBe(1);
    expect(result.burnedKcal).toBeGreaterThan(0);
    expect(result.burnedKcal).toBe(Math.round(result.burnedKcal));
    session.steps[0].completedSets.length = 0;
    expect(workoutResultMessage(result)).toBe(
      `Завершил(а) тренировку «Силовая» в FitPulse!\n💪 Подходов: 1\n🔥 Сожжено: ~${result.burnedKcal} ккал\n🔥 Серия: 2 дн. подряд`
    );
  });

  it('omits calories without a body weight snapshot and omits an empty streak', () => {
    const session = completedSession();
    delete session.weightKgSnapshot;
    const result = summarizeWorkoutResult(session, 'Силовая', 0);
    expect(result.burnedKcal).toBe(0);
    expect(workoutResultMessage(result)).toBe(
      'Завершил(а) тренировку «Силовая» в FitPulse!\n💪 Подходов: 1'
    );
  });

  it('does not include calories for a session without performed sets', () => {
    const session = completedSession();
    session.steps[0].completedSets = [];
    expect(summarizeWorkoutResult(session, 'Силовая', 0)).toMatchObject({
      totalSets: 0,
      burnedKcal: 0
    });
  });
});
