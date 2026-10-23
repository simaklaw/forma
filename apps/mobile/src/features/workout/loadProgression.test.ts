import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ExerciseDef } from './ExerciseSheet';
import {
  applyLoadProgression,
  isLoadProgressionEnabled,
  loadLoadProgression,
  nextLoadDecision,
  nextLoadKg,
  sessionProgressionInputs,
  setLoadProgressionEnabled,
  updateLoadProgressionFromSession
} from './loadProgression';

function exercise(over: Partial<ExerciseDef> = {}): ExerciseDef {
  return {
    id: 101,
    index: 1,
    name: 'Присед со штангой',
    workingWeight: 60,
    workingReps: 8,
    totalSets: 3,
    restSeconds: 90,
    targetMuscles: ['quads'],
    note: '',
    ...over
  };
}

type SessionLike = Parameters<typeof updateLoadProgressionFromSession>[0];

function fakeSession(
  steps: Array<{
    exerciseId: number;
    targetSets: number;
    targetReps: number;
    skipped?: boolean;
    sets: Array<{ weightKg: number; reps: number }>;
  }>
): SessionLike {
  return {
    steps: steps.map((step, i) => ({
      snapshot: {
        stepIndex: i,
        exerciseId: String(step.exerciseId),
        exerciseRevisionId: 'rev-' + step.exerciseId,
        name: 'ex' + step.exerciseId,
        targetSets: step.targetSets,
        targetReps: step.targetReps,
        targetWeightKg: 50,
        restSeconds: 90
      },
      completedSets: step.sets.map((set, j) => ({
        setNo: j + 1,
        weightKg: set.weightKg,
        reps: set.reps,
        rir: 2
      })),
      skipped: step.skipped ?? false
    }))
  } as unknown as SessionLike;
}

describe('nextLoadDecision', () => {
  const base = { skipped: false, weighted: true };

  it('increase when all planned sets are done with reps on target', () => {
    expect(
      nextLoadDecision({
        ...base,
        targetSets: 3,
        targetReps: 8,
        completedSets: [
          { weightKg: 60, reps: 8 },
          { weightKg: 60, reps: 9 },
          { weightKg: 62.5, reps: 8 }
        ]
      })
    ).toBe('increase');
  });

  it('decrease when at least two sets average below target reps', () => {
    expect(
      nextLoadDecision({
        ...base,
        targetSets: 3,
        targetReps: 10,
        completedSets: [
          { weightKg: 40, reps: 8 },
          { weightKg: 40, reps: 8 }
        ]
      })
    ).toBe('decrease');
  });

  it('keep when a single set is below the plan', () => {
    expect(
      nextLoadDecision({
        ...base,
        targetSets: 3,
        targetReps: 10,
        completedSets: [{ weightKg: 40, reps: 8 }]
      })
    ).toBe('keep');
  });

  it('skip for bodyweight, skipped or empty steps', () => {
    expect(
      nextLoadDecision({
        ...base,
        weighted: false,
        targetSets: 3,
        targetReps: 8,
        completedSets: [{ weightKg: 0, reps: 8 }]
      })
    ).toBe('skip');
    expect(
      nextLoadDecision({
        ...base,
        skipped: true,
        targetSets: 3,
        targetReps: 8,
        completedSets: [{ weightKg: 60, reps: 8 }]
      })
    ).toBe('skip');
    expect(nextLoadDecision({ ...base, targetSets: 3, targetReps: 8, completedSets: [] })).toBe(
      'skip'
    );
  });
});

describe('nextLoadKg', () => {
  it('steps +2.5 kg from a base of 20 kg and up, +1 kg below', () => {
    expect(nextLoadKg(60, 'increase')).toBe(62.5);
    expect(nextLoadKg(20, 'increase')).toBe(22.5);
    expect(nextLoadKg(12.5, 'increase')).toBe(13.5);
  });

  it('decreases symmetrically with a 1 kg floor and 0.5 rounding', () => {
    expect(nextLoadKg(60, 'decrease')).toBe(57.5);
    expect(nextLoadKg(2, 'decrease')).toBe(1);
  });

  it('null for keep/skip or invalid base', () => {
    expect(nextLoadKg(60, 'keep')).toBeNull();
    expect(nextLoadKg(60, 'skip')).toBeNull();
    expect(nextLoadKg(0, 'increase')).toBeNull();
  });
});

describe('applyLoadProgression', () => {
  const defs = [exercise({ id: 1, workingWeight: 60 }), exercise({ id: 2, workingWeight: 0 })];

  it('overrides only weighted exercises with valid entries', () => {
    const next = applyLoadProgression(defs, { '1': { targetKg: 65, updatedAt: '2026-10-23' } });
    expect(next[0]?.workingWeight).toBe(65);
    expect(next[1]?.workingWeight).toBe(0);
  });

  it('keeps references for untouched exercises and empty maps', () => {
    expect(applyLoadProgression(defs, {})).toBe(defs);
    const next = applyLoadProgression(defs, { '9': { targetKg: 40, updatedAt: 'x' } });
    expect(next[0]).toBe(defs[0]);
    expect(next[1]).toBe(defs[1]);
  });
});

describe('sessionProgressionInputs', () => {
  it('drops skipped and empty steps, maps weighted-ness from defs', () => {
    const defs = [exercise({ id: 1, workingWeight: 60 }), exercise({ id: 3, workingWeight: 0 })];
    const inputs = sessionProgressionInputs(
      fakeSession([
        { exerciseId: 1, targetSets: 3, targetReps: 8, sets: [{ weightKg: 60, reps: 8 }] },
        { exerciseId: 2, targetSets: 3, targetReps: 8, skipped: true, sets: [] },
        { exerciseId: 3, targetSets: 3, targetReps: 8, sets: [{ weightKg: 0, reps: 10 }] }
      ]),
      defs
    );
    expect(inputs.map((input) => input.exerciseId)).toEqual(['1', '3']);
    expect(inputs[0]?.weighted).toBe(true);
    expect(inputs[1]?.weighted).toBe(false);
  });
});

describe('updateLoadProgressionFromSession', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('persists increase and decrease entries, skips keep/bodyweight', async () => {
    const defs = [
      exercise({ id: 1, workingWeight: 60 }),
      exercise({ id: 2, workingWeight: 40, workingReps: 10 }),
      exercise({ id: 3, workingWeight: 50 }),
      exercise({ id: 4, workingWeight: 0 })
    ];
    const session = fakeSession([
      {
        exerciseId: 1,
        targetSets: 3,
        targetReps: 8,
        sets: [
          { weightKg: 60, reps: 8 },
          { weightKg: 60, reps: 8 },
          { weightKg: 60, reps: 8 }
        ]
      },
      {
        exerciseId: 2,
        targetSets: 3,
        targetReps: 10,
        sets: [
          { weightKg: 40, reps: 8 },
          { weightKg: 40, reps: 8 }
        ]
      },
      { exerciseId: 3, targetSets: 3, targetReps: 8, sets: [{ weightKg: 50, reps: 8 }] },
      { exerciseId: 4, targetSets: 3, targetReps: 10, sets: [{ weightKg: 70, reps: 12 }] }
    ]);
    const changed = await updateLoadProgressionFromSession(session, defs);
    expect(changed).toEqual({
      '1': { targetKg: 62.5, updatedAt: expect.any(String) },
      '2': { targetKg: 37.5, updatedAt: expect.any(String) }
    });
    const stored = await loadLoadProgression();
    expect(stored['1']?.targetKg).toBe(62.5);
    expect(stored['2']?.targetKg).toBe(37.5);
  });

  it('returns null and writes nothing when disabled', async () => {
    await setLoadProgressionEnabled(false);
    expect(await isLoadProgressionEnabled()).toBe(false);
    const defs = [exercise({ id: 1, workingWeight: 60 })];
    const session = fakeSession([
      { exerciseId: 1, targetSets: 1, targetReps: 8, sets: [{ weightKg: 60, reps: 8 }] }
    ]);
    expect(await updateLoadProgressionFromSession(session, defs)).toBeNull();
    expect(await loadLoadProgression()).toEqual({});
    await setLoadProgressionEnabled(true);
    expect(await isLoadProgressionEnabled()).toBe(true);
  });

  it('ignores corrupted storage', async () => {
    await AsyncStorage.setItem('fitpulse_load_progression_v1', 'not-json');
    expect(await loadLoadProgression()).toEqual({});
    await AsyncStorage.setItem(
      'fitpulse_load_progression_v1',
      JSON.stringify({ '5': { targetKg: 'heavy', updatedAt: 1 } })
    );
    expect(await loadLoadProgression()).toEqual({});
  });
});
