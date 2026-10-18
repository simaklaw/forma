import type { WorkoutSession } from '@forma/workout-domain';
import { sequentialStepInfo, sessionMatchesDayAndExercises } from './sequentialStep';

function fakeSession(partial: {
  currentStepIndex: number;
  steps: { exerciseId: string; name: string }[];
  status?: WorkoutSession['status'];
}): WorkoutSession {
  return {
    sessionId: 's1',
    userId: 'local-user',
    status: partial.status ?? 'active',
    templateRevisionId: 'day-legs',
    contentHash: 'h',
    localStartDate: '2026-09-17',
    timezone: 'UTC',
    currentStepIndex: partial.currentStepIndex,
    restEndsAtMs: null,
    version: 1,
    steps: partial.steps.map((s, i) => ({
      snapshot: {
        stepIndex: i,
        exerciseId: s.exerciseId,
        name: s.name,
        targetSets: 3,
        targetReps: 8,
        restSeconds: 60
      },
      completedSets: [],
      skipped: false
    })),
    terminalReason: null
  } as WorkoutSession;
}

describe('sequentialStepInfo', () => {
  const names = (id: number) => ({ 1: 'Squat', 2: 'RDL' }[id]);

  it('allows current step', () => {
    const session = fakeSession({
      currentStepIndex: 0,
      steps: [
        { exerciseId: '1', name: 'Squat' },
        { exerciseId: '2', name: 'RDL' }
      ]
    });
    const info = sequentialStepInfo(session, 1, names);
    expect(info.isCurrent).toBe(true);
    expect(info.expectedName).toBeNull();
  });

  it('blocks later exercise and points at expected name', () => {
    const session = fakeSession({
      currentStepIndex: 0,
      steps: [
        { exerciseId: '1', name: 'Squat' },
        { exerciseId: '2', name: 'RDL' }
      ]
    });
    const info = sequentialStepInfo(session, 2, names);
    expect(info.isCurrent).toBe(false);
    expect(info.expectedName).toBe('Squat');
    expect(info.expectedExerciseId).toBe(1);
  });

  it('treats null session as unlocked (no active sequential plan)', () => {
    expect(sequentialStepInfo(null, 2, names).isCurrent).toBe(true);
  });
});

describe('sessionMatchesDayAndExercises', () => {
  const session = fakeSession({
    currentStepIndex: 0,
    steps: [
      { exerciseId: '1', name: 'Squat' },
      { exerciseId: '2', name: 'RDL' }
    ]
  });

  it('accepts the same day and exact frozen exercise order', () => {
    expect(sessionMatchesDayAndExercises(session, 'legs', [1, 2])).toBe(true);
  });

  it('rejects a different day even if numeric IDs happen to overlap', () => {
    expect(sessionMatchesDayAndExercises(session, 'chest', [1, 2])).toBe(false);
  });

  it('rejects stale/modified exercise lists from a previous plan revision', () => {
    expect(sessionMatchesDayAndExercises(session, 'legs', [1, 48])).toBe(false);
    expect(sessionMatchesDayAndExercises(session, 'legs', [1, 2, 3])).toBe(false);
  });

  it('does not treat a missing session as a match', () => {
    expect(sessionMatchesDayAndExercises(null, 'legs', [1, 2])).toBe(false);
  });
});
