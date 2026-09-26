import {
  configureSessionPersistence,
  resetSessionServiceForTests
} from '@/features/workout/data';
import { useFitPulseStore } from '@/state/useFitPulseStore';
import type { ExerciseDef } from '../ExerciseSheet';
import { ActiveSessionController } from './ActiveSessionController';
import { hydrateSessionReadModel } from './hydrateSessionReadModel';

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
    restSeconds: 0,
    targetMuscles: ['quads'],
    note: 't'
  }
];

describe('hydrateSessionReadModel', () => {
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

  it('merges durable set_completed into Zustand after cold start', async () => {
    await ActiveSessionController.ensureDaySession('legs', exercises);
    await ActiveSessionController.recordSetForExercise({
      dayId: 'legs',
      exercises,
      exerciseId: 1,
      weightKg: 80,
      reps: 8
    });

    ActiveSessionController.resetForTests();
    useFitPulseStore.setState({
      setLogs: [],
      dayProgress: {},
      profile: { ...TEST_PROFILE }
    });

    await hydrateSessionReadModel();

    const state = useFitPulseStore.getState();
    expect(state.setLogs.length).toBeGreaterThanOrEqual(1);
    expect(state.setLogs[0]?.exerciseId).toBe(1);
    expect(ActiveSessionController.getSessionId()).not.toBeNull();
  });
});
