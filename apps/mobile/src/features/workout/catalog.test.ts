import { formatLoadLabel, isBodyweightExercise, resolveWorkingLoadKg } from './catalog';

describe('workout catalog load', () => {
  const bw = { workingWeight: 0 };
  const squat = { workingWeight: 80 };

  it('treats zero workingWeight as bodyweight', () => {
    expect(isBodyweightExercise(bw)).toBe(true);
    expect(isBodyweightExercise(squat)).toBe(false);
  });

  it('resolves bodyweight to profile mass, never 0 when profile is valid', () => {
    expect(resolveWorkingLoadKg(bw, 73)).toBe(73);
    expect(resolveWorkingLoadKg(bw, 0)).toBe(0);
    expect(resolveWorkingLoadKg(squat, 73)).toBe(80);
  });

  it('formats home load as bodyweight, gym as kg', () => {
    expect(formatLoadLabel(bw, 73)).toBe('свой вес · 73 кг');
    expect(formatLoadLabel(squat)).toBe('80 кг');
  });
});
