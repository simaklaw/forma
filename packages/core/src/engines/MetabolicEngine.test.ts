import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateBMR,
  calculateBurnedCalories,
  calculatePresentationTargets,
  calculateTargets,
  detectWeightPlateau,
  estimateOneRepMax,
  rpeFromRir,
  startDietBreak,
  startRefeed,
} from "./MetabolicEngine.ts";

test("calculateBMR uses Mifflin-St Jeor", () => {
  assert.equal(calculateBMR({ weightKg: 80, heightCm: 180, age: 30, gender: "male", activityFactor: 1.5 }), 1780);
  assert.equal(calculateBMR({ weightKg: 65, heightCm: 165, age: 30, gender: "female", activityFactor: 1.5 }), 1370);
  assert.throws(() => calculateBMR({ weightKg: 80, heightCm: 180, age: 12, gender: "male", activityFactor: 1.5 }), RangeError);
});

test("calculateTargets applies goal policy and protocol", () => {
  const profile = { sex: "male" as const, age: 30, height: 180, weight: 80, pal: 1.5, goal: "recomp" as const };
  const base = calculateTargets(profile, { type: null, endsAt: null }, 1_000);
  const active = calculateTargets(profile, startRefeed(1_000), 1_000);
  assert.equal(base.tdee, 2670);
  assert.equal(base.target, 2350);
  assert.equal(active.target, 2670);
  assert.equal(active.protocolActive, true);
});

test("target policy is configurable", () => {
  const profile = { sex: "female" as const, age: 30, height: 165, weight: 65, pal: 1.4, goal: "gain" as const };
  const targets = calculateTargets(profile, { type: null, endsAt: null }, 1_000, {
    recompFactor: 0.9,
    gainFactor: 1.05,
    proteinGramsPerKg: 1.8,
    fatGramsPerKg: 0.8,
  });
  assert.equal(targets.target, Math.round(targets.tdee * 1.05));
  assert.equal(targets.proteinTarget, 117);
  assert.equal(targets.fatTarget, 52);
});

test("shared presentation targets preserve the documented web goal policy", () => {
  const input = { presentation: "man" as const, weightKg: 80, heightCm: 180, age: 30 };
  const energy = calculatePresentationTargets({ ...input, goal: "energy" });
  const strength = calculatePresentationTargets({ ...input, goal: "strength" });
  const tone = calculatePresentationTargets({ ...input, goal: "tone" });
  const recovery = calculatePresentationTargets({ ...input, goal: "recovery" });
  assert.equal(energy.kcal, 2448);
  assert.equal(strength.kcal, 2648);
  assert.equal(tone.kcal, 2148);
  assert.equal(recovery.kcal, 2548);
  assert.ok(strength.protein > tone.protein);
});

test("neutral presentation uses the documented product coefficient", () => {
  const targets = calculatePresentationTargets({
    presentation: "neutral",
    weightKg: 80,
    heightCm: 180,
    age: 30,
    goal: "energy",
  });
  assert.equal(targets.bmr, 1697);
  assert.equal(targets.tdee, 2333);
});

test("macro calculation never creates calories from thin air", () => {
  const targets = calculateTargets(
    { sex: "female", age: 30, height: 150, weight: 40, pal: 1.2, goal: "recomp" },
    { type: null, endsAt: null },
  );
  assert.ok(targets.carbTarget >= 0);
  assert.ok(targets.proteinTarget * 4 + targets.fatTarget * 9 + targets.carbTarget * 4 <= targets.target + 4);
});

test("protocol boundaries are deterministic", () => {
  const refeed = startRefeed(1_000);
  const dietBreak = startDietBreak(1_000);
  assert.equal(refeed.endsAt, 1_000 + 24 * 60 * 60 * 1000);
  assert.equal(dietBreak.endsAt, 1_000 + 14 * 24 * 60 * 60 * 1000);
});

test("protocol timestamps accept epoch zero and reject non-finite values", () => {
  assert.equal(startRefeed(0).endsAt, 24 * 60 * 60 * 1000);
  assert.throws(() => startRefeed(Number.NaN), RangeError);
  assert.throws(() => startDietBreak(Number.POSITIVE_INFINITY), RangeError);
});

test("exercise calculations validate inputs", () => {
  assert.equal(calculateBurnedCalories(8, 80, 60), 672);
  assert.equal(calculateBurnedCalories(8, 80, 0), 0);
  assert.equal(Math.round(estimateOneRepMax(100, 5)), 117);
  assert.equal(rpeFromRir(2), 8);
  assert.throws(() => estimateOneRepMax(100, 0), RangeError);
  assert.throws(() => rpeFromRir(11), RangeError);
});

test("plateau detection validates and evaluates the recent sample", () => {
  assert.equal(detectWeightPlateau([80, 79.9, 80.1, 80], "recomp"), true);
  assert.equal(detectWeightPlateau([80, 79, 78, 77], "recomp"), false);
  assert.equal(detectWeightPlateau([80, 80, 80, 80], "maintain"), false);
  assert.throws(() => detectWeightPlateau([80, 80], "recomp", 1), RangeError);
  assert.throws(() => detectWeightPlateau([], "recomp", 4, -0.1), RangeError);
});
