/**
 * MetabolicEngine.ts
 * Pure functions only — no Zustand, no React, no I/O. This is the same math
 * that ran in fitpulse-redesign.html's calculateTargets()/detectWeightPlateau(),
 * lifted out of the store so it can be unit-tested without mocking storage.
 */

export type Sex = 'male' | 'female';
export type Goal = 'recomp' | 'maintain' | 'gain';
export type MetabolicProtocolType = 'refeed' | 'dietbreak' | null;

export interface ProfileState {
  sex: Sex;
  age: number;
  height: number; // cm
  weight: number; // kg
  pal: number; // 1.2 – 1.725
  goal: Goal;
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

const REFEED_DURATION_MS = 24 * 60 * 60 * 1000;
const DIET_BREAK_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

export function isProtocolActive(metabolic: MetabolicStatus, now: number = Date.now()): boolean {
  return metabolic.type !== null && metabolic.endsAt !== null && now < metabolic.endsAt;
}

export function startRefeed(now: number = Date.now()): MetabolicStatus {
  return { type: 'refeed', endsAt: now + REFEED_DURATION_MS };
}

export function startDietBreak(now: number = Date.now()): MetabolicStatus {
  return { type: 'dietbreak', endsAt: now + DIET_BREAK_DURATION_MS };
}

/**
 * Mifflin-St Jeor BMR → TDEE → calorie/macro targets.
 * ISSN ranges used for macros: protein 1.6–2.2 g/kg, fat 0.8–1.2 g/kg.
 * We fix 2.0 g/kg protein and 1.0 g/kg fat as sensible mid-range defaults —
 * both comfortably inside the ISSN band, matching the HTML prototype.
 */
export function calculateTargets(profile: ProfileState, metabolic: MetabolicStatus, now: number = Date.now()): Targets {
  let bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age;
  bmr = profile.sex === 'male' ? bmr + 5 : bmr - 161;

  const tdee = Math.round(bmr * profile.pal);
  const protocolActive = isProtocolActive(metabolic, now);

  let target = tdee;
  if (protocolActive) {
    // Refeed/Diet Break: target lifts to maintenance for the protocol's
    // duration regardless of the standing goal — this IS the mechanism.
    target = tdee;
  } else if (profile.goal === 'recomp') {
    target = Math.round(tdee * 0.88);
  } else if (profile.goal === 'gain') {
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
    protocolActive
  };
}

/**
 * Plateau heuristic: per the architecture report, a real system would track a
 * 14-day moving average and flag >10 days of no movement. We can only ever
 * see as many points as the user actually logged, so this checks whichever
 * of the last N entries exist rather than demanding a fixed daily-logging
 * cadence the app can't guarantee.
 */
export function detectWeightPlateau(weightHistory: number[], goal: Goal, sampleSize = 4, thresholdKg = 0.3): boolean {
  if (goal !== 'recomp' || weightHistory.length < sampleSize) return false;
  const recent = weightHistory.slice(-sampleSize);
  const range = Math.max(...recent) - Math.min(...recent);
  return range <= thresholdKg;
}

/**
 * Epley 1RM estimate + RPE, per the report's auto-regulation section.
 * RPE = 10 - RIR is definitional, not estimated.
 */
export function estimateOneRepMax(weightKg: number, reps: number): number {
  return weightKg * (1 + reps / 30);
}

export function rpeFromRir(rir: number): number {
  return 10 - rir;
}
