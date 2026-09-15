/**
 * MetabolicEngine — pure functions only (no Zustand, React, or I/O).
 * Shared by @forma/web and @forma/mobile.
 */

export type Sex = "male" | "female";
export type MetabolicGoal = "recomp" | "maintain" | "gain";
/** @deprecated use MetabolicGoal — alias kept for mobile import compatibility */
export type Goal = MetabolicGoal;
export type MetabolicProtocolType = "refeed" | "dietbreak" | null;
export type Presentation = "man" | "woman" | "neutral";
export type FitnessGoal = "strength" | "tone" | "energy" | "recovery";

export interface ProfileState {
  sex: Sex;
  age: number;
  height: number; // cm
  weight: number; // kg
  pal: number; // 1.2 – 1.725
  goal: MetabolicGoal;
}

export interface MetabolicStatus {
  type: MetabolicProtocolType;
  endsAt: number | null;
}

export interface Targets {
  bmr: number;
  tdee: number;
  target: number;
  proteinTarget: number;
  fatTarget: number;
  carbTarget: number;
  protocolActive: boolean;
}

export interface TargetPolicy {
  recompFactor: number;
  gainFactor: number;
  proteinGramsPerKg: number;
  fatGramsPerKg: number;
}

export interface PresentationTargetInput {
  presentation: Presentation;
  weightKg: number;
  heightCm: number;
  age: number;
  goal: FitnessGoal;
}

export interface PresentationTargets {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  bmr: number;
  tdee: number;
}

/** Report-style biometrics (Mifflin + activity factor). */
export interface Biometrics {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Sex;
  activityFactor: number;
}

const REFEED_DURATION_MS = 24 * 60 * 60 * 1000;
const DIET_BREAK_DURATION_MS = 14 * 24 * 60 * 60 * 1000;
const DEFAULT_POLICY: TargetPolicy = {
  recompFactor: 0.88,
  gainFactor: 1.1,
  proteinGramsPerKg: 2,
  fatGramsPerKg: 1,
};

function assertFinitePositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a finite number greater than 0`);
  }
}

function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`);
  }
}

export function isProtocolActive(metabolic: MetabolicStatus, now: number = Date.now()): boolean {
  assertFinite(now, "now");
  if (metabolic.type === null || metabolic.endsAt === null) return false;
  assertFinite(metabolic.endsAt, "endsAt");
  return now < metabolic.endsAt;
}

export function startRefeed(now: number = Date.now()): MetabolicStatus {
  assertFinite(now, "now");
  return { type: "refeed", endsAt: now + REFEED_DURATION_MS };
}

export function startDietBreak(now: number = Date.now()): MetabolicStatus {
  assertFinite(now, "now");
  return { type: "dietbreak", endsAt: now + DIET_BREAK_DURATION_MS };
}

/**
 * Mifflin-St Jeor BMR → TDEE → calorie/macro targets.
 * Defaults are product policy, not universal physiological truths; callers can override them.
 */
export function calculateTargets(
  profile: ProfileState,
  metabolic: MetabolicStatus,
  now: number = Date.now(),
  policy: TargetPolicy = DEFAULT_POLICY,
): Targets {
  validateProfile(profile);
  validatePolicy(policy);

  let bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age;
  bmr = profile.sex === "male" ? bmr + 5 : bmr - 161;

  const tdee = Math.round(bmr * profile.pal);
  const protocolActive = isProtocolActive(metabolic, now);

  let target = tdee;
  if (!protocolActive && profile.goal === "recomp") {
    target = Math.round(tdee * policy.recompFactor);
  } else if (!protocolActive && profile.goal === "gain") {
    target = Math.round(tdee * policy.gainFactor);
  }

  const proteinTarget = Math.round(profile.weight * policy.proteinGramsPerKg);
  const fatTarget = Math.round(profile.weight * policy.fatGramsPerKg);
  // Never manufacture a minimum carb target that exceeds the calorie target.
  const carbTarget = Math.max(0, Math.round((target - proteinTarget * 4 - fatTarget * 9) / 4));

  return {
    bmr: Math.round(bmr),
    tdee,
    target,
    proteinTarget,
    fatTarget,
    carbTarget,
    protocolActive,
  };
}

/**
 * Shared target calculation for the web/mobile presentation goals.
 * The neutral presentation uses the existing product coefficient (-78), which is
 * a product convention rather than a validated sex-specific physiological model.
 */
export function calculatePresentationTargets(input: PresentationTargetInput): PresentationTargets {
  assertFinitePositive(input.weightKg, "weightKg");
  assertFinitePositive(input.heightCm, "heightCm");
  if (!Number.isInteger(input.age) || input.age < 13 || input.age > 120) {
    throw new RangeError("age must be an integer from 13 to 120");
  }
  if (!["man", "woman", "neutral"].includes(input.presentation)) {
    throw new RangeError("presentation is invalid");
  }
  if (!["strength", "tone", "energy", "recovery"].includes(input.goal)) {
    throw new RangeError("goal is invalid");
  }

  const sexCoefficient = input.presentation === "man" ? 5 : input.presentation === "woman" ? -161 : -78;
  const bmr = Math.round(10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + sexCoefficient);
  const tdee = Math.round(bmr * 1.375);
  const delta = { strength: 200, tone: -300, energy: 0, recovery: 100 }[input.goal];
  const kcal = Math.max(1200, Math.round(tdee + delta));
  const pPerKg = { strength: 2, tone: 1.8, energy: 1.6, recovery: 1.6 }[input.goal];
  const protein = Math.round(pPerKg * input.weightKg);
  const fat = Math.round((kcal * 0.28) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));

  return { kcal, protein, fat, carbs, bmr, tdee };
}

function validateProfile(profile: ProfileState): void {
  if (profile.sex !== "male" && profile.sex !== "female") throw new RangeError("sex is invalid");
  if (!Number.isInteger(profile.age) || profile.age < 13 || profile.age > 120) throw new RangeError("age must be an integer from 13 to 120");
  assertFinitePositive(profile.height, "height");
  assertFinitePositive(profile.weight, "weight");
  if (!Number.isFinite(profile.pal) || profile.pal < 1.2 || profile.pal > 1.725) throw new RangeError("pal must be between 1.2 and 1.725");
  if (!["recomp", "maintain", "gain"].includes(profile.goal)) throw new RangeError("goal is invalid");
}

function validatePolicy(policy: TargetPolicy): void {
  assertFinitePositive(policy.recompFactor, "recompFactor");
  assertFinitePositive(policy.gainFactor, "gainFactor");
  assertFinitePositive(policy.proteinGramsPerKg, "proteinGramsPerKg");
  assertFinitePositive(policy.fatGramsPerKg, "fatGramsPerKg");
}

export function calculateBMR(bio: Biometrics): number {
  assertFinitePositive(bio.weightKg, "weightKg");
  assertFinitePositive(bio.heightCm, "heightCm");
  if (!Number.isInteger(bio.age) || bio.age < 13 || bio.age > 120) throw new RangeError("age must be an integer from 13 to 120");
  if (bio.gender !== "male" && bio.gender !== "female") throw new RangeError("gender is invalid");

  const base = 10 * bio.weightKg + 6.25 * bio.heightCm - 5 * bio.age;
  return Math.round(bio.gender === "male" ? base + 5 : base - 161);
}

export function calculateTDEE(bio: Biometrics): number {
  if (!Number.isFinite(bio.activityFactor) || bio.activityFactor < 1.2 || bio.activityFactor > 1.725) {
    throw new RangeError("activityFactor must be between 1.2 and 1.725");
  }
  return Math.round(calculateBMR(bio) * bio.activityFactor);
}

/** MET-based energy expenditure (kcal). */
export function calculateBurnedCalories(met: number, weightKg: number, durationMinutes: number): number {
  assertFinitePositive(met, "met");
  assertFinitePositive(weightKg, "weightKg");
  if (!Number.isFinite(durationMinutes) || durationMinutes < 0) throw new RangeError("durationMinutes must be finite and >= 0");
  return Math.round(((met * 3.5 * weightKg) / 200) * durationMinutes);
}

export function detectWeightPlateau(
  weightHistory: number[],
  goal: MetabolicGoal,
  sampleSize = 4,
  thresholdKg = 0.3,
): boolean {
  if (!Number.isInteger(sampleSize) || sampleSize < 2) throw new RangeError("sampleSize must be an integer >= 2");
  if (!Number.isFinite(thresholdKg) || thresholdKg < 0) throw new RangeError("thresholdKg must be >= 0");
  if (weightHistory.some((weight) => !Number.isFinite(weight) || weight <= 0)) throw new RangeError("weightHistory contains an invalid weight");
  if (goal !== "recomp" || weightHistory.length < sampleSize) return false;
  const recent = weightHistory.slice(-sampleSize);
  const range = Math.max(...recent) - Math.min(...recent);
  return range <= thresholdKg;
}

export function estimateOneRepMax(weightKg: number, reps: number): number {
  assertFinitePositive(weightKg, "weightKg");
  if (!Number.isInteger(reps) || reps < 1) throw new RangeError("reps must be a positive integer");
  return weightKg * (1 + reps / 30);
}

export function rpeFromRir(rir: number): number {
  if (!Number.isFinite(rir) || rir < 0 || rir > 10) throw new RangeError("rir must be between 0 and 10");
  return 10 - rir;
}

/** Class façade matching the architectural report API. */
export class MetabolicEngine {
  static calculateBMR(bio: Biometrics): number {
    return calculateBMR(bio);
  }
  static calculateTDEE(bio: Biometrics): number {
    return calculateTDEE(bio);
  }
  static calculateBurnedCalories(met: number, weightKg: number, durationMinutes: number): number {
    return calculateBurnedCalories(met, weightKg, durationMinutes);
  }
  static calculateTargets(profile: ProfileState, metabolic: MetabolicStatus, now?: number, policy?: TargetPolicy): Targets {
    return calculateTargets(profile, metabolic, now, policy);
  }
  static calculatePresentationTargets(input: PresentationTargetInput): PresentationTargets {
    return calculatePresentationTargets(input);
  }
}