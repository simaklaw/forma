import {
  ProfileState,
  calculateTargets,
  detectWeightPlateau,
  estimateOneRepMax,
  isProtocolActive,
  rpeFromRir,
  startDietBreak,
  startRefeed
} from './MetabolicEngine';

const baseProfile: ProfileState = {
  sex: 'male',
  age: 26,
  height: 178,
  weight: 76,
  pal: 1.375,
  goal: 'recomp'
};

const noProtocol = { type: null, endsAt: null } as const;

// Raw (unrounded) Mifflin-St Jeor BMR for baseProfile, mirroring the
// formula's own precedence: BMR is computed at full precision, TDEE is
// derived from that full-precision value, and only the *displayed* BMR
// gets rounded. Tests below rely on this order matching the engine.
const rawBmrMale = 10 * baseProfile.weight + 6.25 * baseProfile.height - 5 * baseProfile.age + 5;

describe('calculateTargets', () => {
  it('computes BMR via Mifflin-St Jeor (+5 for male)', () => {
    const targets = calculateTargets(baseProfile, noProtocol);
    expect(targets.bmr).toBe(Math.round(rawBmrMale));
  });

  it('subtracts 161 instead of adding 5 for a female profile', () => {
    const rawBmrFemale = 10 * baseProfile.weight + 6.25 * baseProfile.height - 5 * baseProfile.age - 161;
    const targets = calculateTargets({ ...baseProfile, sex: 'female' }, noProtocol);
    expect(targets.bmr).toBe(Math.round(rawBmrFemale));
  });

  it('derives TDEE from full-precision BMR times PAL, not the rounded BMR', () => {
    const targets = calculateTargets(baseProfile, noProtocol);
    expect(targets.tdee).toBe(Math.round(rawBmrMale * baseProfile.pal));
  });

  it('applies a 12% deficit for the recomp goal', () => {
    const targets = calculateTargets(baseProfile, noProtocol);
    expect(targets.target).toBe(Math.round(targets.tdee * 0.88));
  });

  it('applies a 10% surplus for the gain goal', () => {
    const targets = calculateTargets({ ...baseProfile, goal: 'gain' }, noProtocol);
    expect(targets.target).toBe(Math.round(targets.tdee * 1.1));
  });

  it('holds the target at maintenance (TDEE) while maintain is the goal', () => {
    const targets = calculateTargets({ ...baseProfile, goal: 'maintain' }, noProtocol);
    expect(targets.target).toBe(targets.tdee);
  });

  it('overrides the standing goal to maintenance while a protocol is active', () => {
    const metabolic = startRefeed(0);
    const targets = calculateTargets(baseProfile, metabolic, 1000); // well within the 24h refeed window
    expect(targets.protocolActive).toBe(true);
    expect(targets.target).toBe(targets.tdee);
  });

  it('derives protein (2 g/kg) and fat (1 g/kg) from bodyweight', () => {
    const targets = calculateTargets(baseProfile, noProtocol);
    expect(targets.proteinTarget).toBe(Math.round(baseProfile.weight * 2.0));
    expect(targets.fatTarget).toBe(Math.round(baseProfile.weight * 1.0));
  });

  it('backs carbs out of remaining calories after protein/fat (floor at 0)', () => {
    const targets = calculateTargets(baseProfile, noProtocol);
    const expectedCarbs = Math.max(
      0,
      Math.round((targets.target - targets.proteinTarget * 4 - targets.fatTarget * 9) / 4)
    );
    expect(targets.carbTarget).toBe(expectedCarbs);
  });

  it('does not invent carb calories when protein+fat exceed the target', () => {
    // Extreme profile where protein+fat kcal can exceed the calorie target.
    const extremeDeficitProfile: ProfileState = {
      sex: 'female',
      age: 90,
      height: 140,
      weight: 25,
      pal: 1.2,
      goal: 'recomp'
    };
    const targets = calculateTargets(extremeDeficitProfile, noProtocol);
    expect(targets.carbTarget).toBeGreaterThanOrEqual(0);
    expect(targets.proteinTarget * 4 + targets.fatTarget * 9 + targets.carbTarget * 4).toBeLessThanOrEqual(
      targets.target + 4 // allow single-gram rounding slack
    );
  });
});

describe('protocol lifecycle (refeed / diet break)', () => {
  it('marks a refeed active immediately and inactive once its 24h window elapses', () => {
    const metabolic = startRefeed(0);
    expect(isProtocolActive(metabolic, 1000)).toBe(true);
    expect(isProtocolActive(metabolic, 24 * 60 * 60 * 1000 + 1)).toBe(false);
  });

  it('gives a diet break a 14-day window', () => {
    const metabolic = startDietBreak(0);
    expect(isProtocolActive(metabolic, 13 * 24 * 60 * 60 * 1000)).toBe(true);
    expect(isProtocolActive(metabolic, 14 * 24 * 60 * 60 * 1000 + 1)).toBe(false);
  });

  it('treats "no protocol" as never active', () => {
    expect(isProtocolActive(noProtocol, Date.now())).toBe(false);
  });
});

describe('detectWeightPlateau', () => {
  it('is never suspected outside the recomp goal, even with flat weight', () => {
    expect(detectWeightPlateau([76, 76, 76, 76], 'gain')).toBe(false);
    expect(detectWeightPlateau([76, 76, 76, 76], 'maintain')).toBe(false);
  });

  it('requires at least sampleSize entries before flagging anything', () => {
    expect(detectWeightPlateau([76, 75.9], 'recomp')).toBe(false);
  });

  it('flags a plateau when the last 4 entries stay within the default 0.3kg threshold', () => {
    expect(detectWeightPlateau([80, 76.1, 76.0, 75.9, 76.0], 'recomp')).toBe(true);
  });

  it('does not flag a plateau while weight is still trending down', () => {
    expect(detectWeightPlateau([80, 78, 77, 76, 74], 'recomp')).toBe(false);
  });

  it('only looks at the most recent sampleSize entries, ignoring older swings', () => {
    // First two entries swing wildly; the last 4 are flat — should still flag.
    expect(detectWeightPlateau([90, 70, 76.1, 76.0, 75.9, 76.0], 'recomp')).toBe(true);
  });
});

describe('estimateOneRepMax (Epley formula)', () => {
  it('matches weight * (1 + reps / 30)', () => {
    expect(estimateOneRepMax(80, 8)).toBeCloseTo(80 * (1 + 8 / 30));
  });

  it('rejects zero or negative reps', () => {
    expect(() => estimateOneRepMax(100, 0)).toThrow(RangeError);
    expect(() => estimateOneRepMax(100, -1)).toThrow(RangeError);
  });
});

describe('rpeFromRir', () => {
  it('is definitional: RPE = 10 - RIR', () => {
    expect(rpeFromRir(2)).toBe(8);
    expect(rpeFromRir(0)).toBe(10);
    expect(rpeFromRir(10)).toBe(0);
  });
});
