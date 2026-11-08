import { verifiedMediaKeyForExercise } from './verifiedExerciseMedia';

describe('verifiedMediaKeyForExercise', () => {
  it('allows a bundled clip for its exact canonical search term', () => {
    expect(verifiedMediaKeyForExercise('pushup', 'Push-up')).toBe('pushup');
    expect(verifiedMediaKeyForExercise('squat', 'Squat')).toBe('squat');
    expect(verifiedMediaKeyForExercise('dead-bug', 'Dead bug')).toBe('dead-bug');
  });

  it('rejects clips shared by variants with different mechanics', () => {
    expect(verifiedMediaKeyForExercise('pushup', 'Close-grip Press-ups')).toBeUndefined();
    expect(verifiedMediaKeyForExercise('pushup', 'Decline Push-Ups')).toBeUndefined();
    expect(verifiedMediaKeyForExercise('pullup', 'Inverted Rows')).toBeUndefined();
    expect(verifiedMediaKeyForExercise('lunge', 'Bulgarian split squats')).toBeUndefined();
    expect(verifiedMediaKeyForExercise('plank', 'Crunches')).toBeUndefined();
    expect(verifiedMediaKeyForExercise('glute-bridge', 'Kneeling kickbacks')).toBeUndefined();
  });

  it('rejects missing keys or search terms', () => {
    expect(verifiedMediaKeyForExercise(undefined, 'Push-up')).toBeUndefined();
    expect(verifiedMediaKeyForExercise('pushup', undefined)).toBeUndefined();
  });
});
