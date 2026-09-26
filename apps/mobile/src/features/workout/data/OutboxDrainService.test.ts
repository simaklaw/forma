import {
  configureSessionPersistence,
  resetSessionServiceForTests,
  getSessionService
} from './createSessionService';
import { OutboxDrainService, type OutboxTransport } from './OutboxDrainService';
import type { ExerciseDef } from '../ExerciseSheet';
import { ActiveSessionController } from '../session/ActiveSessionController';
import { useFitPulseStore } from '@/state/useFitPulseStore';

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

describe('OutboxDrainService', () => {
  beforeEach(() => {
    resetSessionServiceForTests();
    configureSessionPersistence('memory');
    ActiveSessionController.resetForTests();
    useFitPulseStore.setState({ profile: { ...TEST_PROFILE } });
  });

  it('lists pending rows after session commands', async () => {
    await ActiveSessionController.ensureDaySession('legs', exercises);
    const pending = await getSessionService().listPendingOutbox(50);
    expect(pending.length).toBeGreaterThan(0);
    expect(pending.every((r) => r.status === 'pending')).toBe(true);
  });

  it('drainOnce marks accepted via transport', async () => {
    await ActiveSessionController.ensureDaySession('legs', exercises);
    const transport: OutboxTransport = {
      async send() {
        return 'accepted';
      }
    };
    const drain = new OutboxDrainService(transport);
    const result = await drain.drainOnce(100);
    expect(result.accepted).toBeGreaterThan(0);
    expect(result.failed).toBe(0);
    const still = await drain.listPending(100);
    expect(still).toHaveLength(0);
  });
});
