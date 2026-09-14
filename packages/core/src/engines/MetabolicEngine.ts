/**
 * MetabolicEngine — pure functions only (no Zustand, React, or I/O).
 * Shared by @forma/web and @forma/mobile.
 */

export type Sex = "male" | "female";
export type MetabolicGoal = "recomp" | "maintain" | "gain";
/** @deprecated use MetabolicGoal — alias kept for mobile import compatibility */
export type Goal = MetabolicGoal;
export type MetabolicProtocolType = "refeed" | "dietbreak" | null;

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

export function isProtocolActive(metabolic: MetabolicStatus, now: number = Date.now()): boolean {
  return metabolic.type !== null && metabolic.endsAt !== null && now < metabolic.endsAt;
}

export function startRefeed(now: number = Date.now()): MetabolicStatus {
  return { type: "refeed", endsAt: now + REFEED_DURATION_MS };
}

export function startDietBreak(now: number = Date.now()): MetabolicStatus {
  return { type: "dietbreak", endsAt: now + DIET_BREAK_DURATION_MS };
}

/**
 * Mifflin-St Jeor BMR → TDEE → calorie/macro targets.
 * ISSN mid-range: protein 2.0 g/kg, fat 1.0 g/kg.
 */
export function calculateTargets(
  profile: ProfileState,
  metabolic: MetabolicStatus,
  now: number = Date.now(),
): Targets {
  let bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age;
  bmr = profile.sex === "male" ? bmr + 5 : bmr - 161;

  const tdee = Math.round(bmr * profile.pal);
  const protocolActive = isProtocolActive(metabolic, now);

  let target = tdee;
  if (protocolActive) {
    target = tdee;
  } else if (profile.goal === "recomp") {
    target = Math.round(tdee * 0.88);
  } else if (profile.goal === "gain") {
    target = Math.round(tdee * 1.1);
  }

  const proteinTarget = Math.round(profile.weight * 2.0);
  const fatTarget = Math.round(profile.weight * 1.0);
  const carbTarget = Math.max(50, Math.round((target - proteinTarget * 4 - fatTarget * 9) / 4));

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

export function calculateBMR(bio: Biometrics): number {
  const base = 10 * bio.weightKg + 6.25 * bio.heightCm - 5 * bio.age;
  return Math.round(bio.gender === "male" ? base + 5 : base - 161);
}

export function calculateTDEE(bio: Biometrics): number {
  return Math.round(calculateBMR(bio) * bio.activityFactor);
}

/** MET-based energy expenditure (kcal). */
export function calculateBurnedCalories(met: number, weightKg: number, durationMinutes: number): number {
  return Math.round(((met * 3.5 * weightKg) / 200) * durationMinutes);
}

export function detectWeightPlateau(
  weightHistory: number[],
  goal: MetabolicGoal,
  sampleSize = 4,
  thresholdKg = 0.3,
): boolean {
  if (goal !== "recomp" || weightHistory.length < sampleSize) return false;
  const recent = weightHistory.slice(-sampleSize);
  const range = Math.max(...recent) - Math.min(...recent);
  return range <= thresholdKg;
}

export function estimateOneRepMax(weightKg: number, reps: number): number {
  return weightKg * (1 + reps / 30);
}

export function rpeFromRir(rir: number): number {
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
  static calculateTargets(profile: ProfileState, metabolic: MetabolicStatus, now?: number): Targets {
    return calculateTargets(profile, metabolic, now);
  }
}
