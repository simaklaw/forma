import { estimateSessionBurnKcal, metForExercise } from '@forma/core';

describe('estimateSessionBurnKcal', () => {
  it('returns 0 for no sets', () => {
    expect(estimateSessionBurnKcal({ weightKg: 80, setsCompleted: 0 })).toBe(0);
  });

  it('scales with sets and body weight', () => {
    const a = estimateSessionBurnKcal({ weightKg: 80, setsCompleted: 10 });
    const b = estimateSessionBurnKcal({ weightKg: 80, setsCompleted: 20 });
    expect(b).toBeGreaterThan(a);
    expect(a).toBeGreaterThan(0);
  });
});

describe('metForExercise keywords', () => {
  it('maps russian and english strength names', () => {
    expect(metForExercise('Приседания со штангой')).toBe(6);
    expect(metForExercise('Bench Press')).toBe(6);
    expect(metForExercise('unknown-move')).toBe(3.5);
  });
});
