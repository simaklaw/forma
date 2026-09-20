import {
  configureSessionPersistence,
  getSessionService,
  resetSessionServiceForTests
} from '@/features/workout/data';
import { mergeSessionProjection } from '@/features/workout/data/sessionProjections';
import { useFitPulseStore } from '@/state/useFitPulseStore';
import type { ExerciseDef } from '../ExerciseSheet';
import { ActiveSessionController } from './ActiveSessionController';

/** Complete biometrics so isProfileComplete / ensureDaySession gate passes in unit tests. */
const TEST_PROFILE = {
  sex: 'male' as const,
  age: 28,
  height: 178,
  weight: 78,
  pal: 1.375,
  goal: 'recomp' as const
};

const exercises: ExerciseDef[] = [
  {
    id: 1,
    index: 1,
    name: 'Squat',
    workingWeight: 80,
    workingReps: 8,
    totalSets: 2,
    restSeconds: 60,
    targetMuscles: ['quads'],
    note: 'test'
  },
  {
    id: 2,
    index: 2,
    name: 'RDL',
    workingWeight: 100,
    workingReps: 5,
    totalSets: 1,
    restSeconds: 90,
    targetMuscles: ['hamstrings'],
    note: 'test'
  }
];

async function projectIntoStore(sessionId: string): Promise<void> {
  const projection = await ActiveSessionController.getLegacyProjection(sessionId);
  if (!projection) return;
  const current = useFitPulseStore.getState();
  const merged = mergeSessionProjection(
    { setLogs: current.setLogs, dayProgress: current.dayProgress },
    projection
  );
  current.hydrate({ setLogs: merged.setLogs, dayProgress: merged.dayProgress });
}

describe('ActiveSessionController', () => {
  beforeEach(() => {
    resetSessionServiceForTests();
    configureSessionPersistence('memory');
    ActiveSessionController.resetForTests();
    useFitPulseStore.setState({
      setLogs: [],
      dayProgress: {},
      profile: { ...TEST_PROFILE }
    });
  });

  it('ensureDaySession prepares and starts once per day', async () => {
    const a = await ActiveSessionController.ensureDaySession('legs', exercises);
    expect(a.status).toBe('active');
    expect(a.steps).toHaveLength(2);

    const b = await ActiveSessionController.ensureDaySession('legs', exercises);
    expect(b.sessionId).toBe(a.sessionId);
  });

  it('cold start resumes same day without abandon (simulates process restart)', async () => {
    const first = await ActiveSessionController.ensureDaySession('legs', exercises);
    await ActiveSessionController.recordSetForExercise({
      dayId: 'legs',
      exercises,
      exerciseId: 1,
      weightKg: 80,
      reps: 8
    });

    ActiveSessionController.resetForTests();
    expect(ActiveSessionController.getSessionId()).toBeNull();

    const resumed = await ActiveSessionController.ensureDaySession('legs', exercises);
    expect(resumed.sessionId).toBe(first.sessionId);
    expect(resumed.status).toBe('active');
    expect(resumed.steps[0]?.completedSets.length).toBeGreaterThanOrEqual(1);

    const stored = await getSessionService().getSession(first.sessionId);
    expect(stored?.status).not.toBe('abandoned');
  });

  it('switching day abandons previous session (single-active)', async () => {
    const legs = await ActiveSessionController.ensureDaySession('legs', exercises);
    const push = await ActiveSessionController.ensureDaySession('push', exercises);

    expect(push.sessionId).not.toBe(legs.sessionId);
    expect(push.status).toBe('active');

    const previous = await getSessionService().getSession(legs.sessionId);
    expect(previous?.status).toBe('abandoned');
    expect(previous?.terminalReason).toBe('replaced_by_new_session');

    const resumable = await getSessionService().getResumable('local-user');
    expect(resumable?.sessionId).toBe(push.sessionId);
  });

  it('cold start then switch day still abandons previous day', async () => {
    const legs = await ActiveSessionController.ensureDaySession('legs', exercises);
    ActiveSessionController.resetForTests();

    const push = await ActiveSessionController.ensureDaySession('push', exercises);
    expect(push.sessionId).not.toBe(legs.sessionId);

    const previous = await getSessionService().getSession(legs.sessionId);
    expect(previous?.status).toBe('abandoned');
  });

  it('restartDaySession abandons with user_restarted and starts fresh', async () => {
    const first = await ActiveSessionController.ensureDaySession('legs', exercises);
    await ActiveSessionController.recordSetForExercise({
      dayId: 'legs',
      exercises,
      exerciseId: 1,
      weightKg: 80,
      reps: 8
    });

    ActiveSessionController.resetForTests();

    const next = await ActiveSessionController.restartDaySession('legs', exercises);
    expect(next.sessionId).not.toBe(first.sessionId);
    expect(next.status).toBe('active');
    expect(next.steps[0]?.completedSets).toHaveLength(0);

    const old = await getSessionService().getSession(first.sessionId);
    expect(old?.status).toBe('abandoned');
    expect(old?.terminalReason).toBe('user_restarted');
  });

  it('restartDaySession clears dayProgress so merge cannot stick abandoned counts', async () => {
    const first = await ActiveSessionController.ensureDaySession('legs', exercises);
    await ActiveSessionController.recordSetForExercise({
      dayId: 'legs',
      exercises,
      exerciseId: 1,
      weightKg: 80,
      reps: 8
    });
    await ActiveSessionController.recordSetForExercise({
      dayId: 'legs',
      exercises,
      exerciseId: 1,
      weightKg: 80,
      reps: 7
    });
    await projectIntoStore(first.sessionId);
    expect(useFitPulseStore.getState().completedSetsToday(1)).toBe(2);

    const next = await ActiveSessionController.restartDaySession('legs', exercises);
    expect(useFitPulseStore.getState().completedSetsToday(1)).toBe(0);

    await ActiveSessionController.recordSetForExercise({
      dayId: 'legs',
      exercises,
      exerciseId: 1,
      weightKg: 82,
      reps: 8
    });
    await projectIntoStore(next.sessionId);

    expect(useFitPulseStore.getState().completedSetsToday(1)).toBe(1);
    expect(next.sessionId).not.toBe(first.sessionId);
  });

  it('recordSetForExercise dual-writes sequential sets', async () => {
    await ActiveSessionController.ensureDaySession('legs', exercises);

    const after1 = await ActiveSessionController.recordSetForExercise({
      dayId: 'legs',
      exercises,
      exerciseId: 1,
      weightKg: 80,
      reps: 8,
      rir: 2
    });
    expect(after1?.steps[0]?.completedSets).toHaveLength(1);

    const after2 = await ActiveSessionController.recordSetForExercise({
      dayId: 'legs',
      exercises,
      exerciseId: 1,
      weightKg: 80,
      reps: 7,
      rir: 1
    });
    expect(after2?.steps[0]?.completedSets).toHaveLength(2);
    expect(after2?.currentStepIndex).toBe(1);
  });

  it('out-of-order exercise returns null without throwing', async () => {
    await ActiveSessionController.ensureDaySession('legs', exercises);
    const result = await ActiveSessionController.recordSetForExercise({
      dayId: 'legs',
      exercises,
      exerciseId: 2,
      weightKg: 100,
      reps: 5
    });
    expect(result).toBeNull();
  });
});
