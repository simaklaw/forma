import { configureSessionPersistence, resetSessionServiceForTests } from '@/features/workout/data';
import type { ExerciseDef } from '../ExerciseSheet';
import { ActiveSessionController } from './ActiveSessionController';

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

describe('ActiveSessionController', () => {
  beforeEach(() => {
    resetSessionServiceForTests();
    configureSessionPersistence('memory');
    ActiveSessionController.resetForTests();
  });

  it('ensureDaySession prepares and starts once per day', async () => {
    const a = await ActiveSessionController.ensureDaySession('legs', exercises);
    expect(a.status).toBe('active');
    expect(a.steps).toHaveLength(2);

    const b = await ActiveSessionController.ensureDaySession('legs', exercises);
    expect(b.sessionId).toBe(a.sessionId);
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
