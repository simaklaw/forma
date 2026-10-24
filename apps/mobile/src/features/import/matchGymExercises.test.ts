import type { GymCsvParseResult, ImportedGymSet } from '@forma/core';
import { buildGymNameIndex, coreKey, exactKey, matchGymCsvSets } from './matchGymExercises';

function parsedSet(exerciseName: string, weightKg: number, reps: number): ImportedGymSet {
  return {
    exerciseName,
    workoutName: 'Workout',
    dateKey: '2025-03-28',
    setIndex: 1,
    weightKg,
    reps,
    rir: 2
  };
}

describe('gym csv name matching', () => {
  it('normalizes case punctuation and bracketed segments', () => {
    expect(exactKey('Жим лёжа (штанга)')).toBe('жим лёжа штанга');
    expect(coreKey('Жим лёжа (штанга)')).toBe('жим лёжа');
    expect(exactKey('Bench  Press!')).toBe('bench press');
  });

  it('matches exact names first then core names', () => {
    const index = buildGymNameIndex([
      { id: 1, aliases: ['Bench Press'] },
      { id: 2, aliases: ['Жим лёжа (штанга)'] }
    ]);
    const result: GymCsvParseResult = {
      format: 'hevy',
      sets: [
        parsedSet('Bench press', 60, 8),
        parsedSet('жим лёжа (гантель)', 30, 12),
        parsedSet('Unknown Machine', 40, 10)
      ],
      warnings: []
    };
    const matched = matchGymCsvSets(result, index);
    expect(matched.drafts).toEqual([
      { exerciseId: 1, dateKey: '2025-03-28', weight: 60, reps: 8, rir: 2 },
      { exerciseId: 2, dateKey: '2025-03-28', weight: 30, reps: 12, rir: 2 }
    ]);
    expect(matched.unmatchedNames).toEqual(['Unknown Machine']);
    expect(matched.totalSets).toBe(3);
  });

  it('treats ambiguous core names as unmatched', () => {
    const index = buildGymNameIndex([
      { id: 1, aliases: ['Жим лёжа (штанга)'] },
      { id: 2, aliases: ['Жим лёжа (гантель)'] }
    ]);
    const result: GymCsvParseResult = {
      format: 'strong',
      sets: [parsedSet('жим лёжа (в тренажёре)', 50, 8)],
      warnings: []
    };
    const matched = matchGymCsvSets(result, index);
    expect(matched.drafts).toEqual([]);
    expect(matched.unmatchedNames).toEqual(['жим лёжа (в тренажёре)']);
  });

  it('keeps ru and en aliases for the same id', () => {
    const index = buildGymNameIndex([{ id: 7, aliases: ['Bench Press', 'Жим лёжа'] }]);
    const result: GymCsvParseResult = {
      format: 'hevy',
      sets: [parsedSet('BENCH PRESS', 60, 8), parsedSet('жим лёжа', 60, 8)],
      warnings: []
    };
    const matched = matchGymCsvSets(result, index);
    expect(matched.drafts.map((d) => d.exerciseId)).toEqual([7, 7]);
    expect(matched.unmatchedNames).toEqual([]);
  });

  it('passes set type and superset id through to drafts', () => {
    const index = buildGymNameIndex([{ id: 3, aliases: ['Squat'] }]);
    const result: GymCsvParseResult = {
      format: 'hevy',
      sets: [{ ...parsedSet('Squat', 100, 5), setType: 'warmup', supersetId: 's1' }],
      warnings: []
    };
    const matched = matchGymCsvSets(result, index);
    expect(matched.drafts).toEqual([
      {
        exerciseId: 3,
        dateKey: '2025-03-28',
        weight: 100,
        reps: 5,
        rir: 2,
        setType: 'warmup',
        supersetId: 's1'
      }
    ]);
  });

});
