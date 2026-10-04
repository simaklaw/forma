import {
  normalizeWorkoutSession,
  parseWorkoutSessionJson,
} from './normalizeWorkoutSession';

const validBase = {
  sessionId: 's1',
  userId: 'u1',
  status: 'active',
  templateRevisionId: 'day-mon@1',
  contentHash: 'abc',
  steps: [
    {
      snapshot: {
        stepIndex: 0,
        exerciseId: '1',
        exerciseRevisionId: '1',
        name: 'Squat',
        targetSets: 3,
        targetReps: 8,
        targetWeightKg: 60,
        restSeconds: 90,
      },
      completedSets: [],
      skipped: false,
    },
  ],
  currentStepIndex: 0,
  restEndsAtMs: null,
  startedAtMs: 1_700_000_000_000,
  completedAtMs: null,
  lastEventOrdinal: 2,
  rowVersion: 3,
  localStartDate: '2026-10-01',
  timezone: 'Europe/Moscow',
};

describe('normalizeWorkoutSession', () => {
  it('accepts a valid aggregate', () => {
    const s = normalizeWorkoutSession(validBase);
    expect(s).not.toBeNull();
    expect(s!.steps).toHaveLength(1);
    expect(s!.steps[0]!.snapshot.name).toBe('Squat');
  });

  it('coerces missing steps to empty array (never undefined)', () => {
    const { steps: _drop, ...withoutSteps } = validBase;
    const s = normalizeWorkoutSession(withoutSteps);
    expect(s).not.toBeNull();
    expect(s!.steps).toEqual([]);
    expect(Array.isArray(s!.steps)).toBe(true);
  });

  it('coerces non-array steps to empty array', () => {
    const s = normalizeWorkoutSession({ ...validBase, steps: null });
    expect(s).not.toBeNull();
    expect(s!.steps).toEqual([]);
  });

  it('drops corrupt step entries but keeps valid ones', () => {
    const s = normalizeWorkoutSession({
      ...validBase,
      steps: [null, validBase.steps[0], { snapshot: { name: 'bad' } }],
    });
    expect(s!.steps).toHaveLength(1);
  });

  it('returns null when identity fields are missing', () => {
    expect(normalizeWorkoutSession({ ...validBase, sessionId: '' })).toBeNull();
    expect(normalizeWorkoutSession({ ...validBase, status: 'nope' })).toBeNull();
    expect(normalizeWorkoutSession(null)).toBeNull();
  });

  it('parseWorkoutSessionJson returns null on invalid JSON', () => {
    expect(parseWorkoutSessionJson('{')).toBeNull();
  });

  it('parseWorkoutSessionJson round-trips a valid payload', () => {
    const s = parseWorkoutSessionJson(JSON.stringify(validBase));
    expect(s?.sessionId).toBe('s1');
    expect(s?.steps[0]?.completedSets).toEqual([]);
  });

  it('normalizes missing completedSets to []', () => {
    const step = { ...validBase.steps[0] } as Record<string, unknown>;
    delete step.completedSets;
    const s = normalizeWorkoutSession({ ...validBase, steps: [step] });
    expect(s!.steps[0]!.completedSets).toEqual([]);
  });
});
