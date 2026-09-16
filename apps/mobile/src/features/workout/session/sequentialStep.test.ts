import type { WorkoutSession } from '@forma/workout-domain';
import { sequentialStepInfo } from './sequentialStep';

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
