/**
 * Structured offline coach brief — same shape a remote model would return.
 * Filled only by on-device rules (RecoveryEngine + plan title). No network.
 */

import type { RecoveryInsight } from "../engines/RecoveryEngine.ts";

export type CoachBriefStatus = "optimal" | "ready" | "fatigued" | "rest_required";

export type CoachBrief = {
  readinessScore: number;
  readinessStatus: CoachBriefStatus;
  readinessLabel: string;
  summary: string;
  workoutAdvice: string;
  nutritionAdvice: string;
  hydrationAdvice: string;
  restAdvice: string;
  actionItems: string[];
  source: "local_rules";
};

function mapStatus(status: RecoveryInsight["status"]): CoachBriefStatus {
  if (status === "peak") return "optimal";
  if (status === "ready") return "ready";
  if (status === "active_recovery_recommended") return "fatigued";
  return "rest_required";
}

/** Build a compact structured brief from RecoveryInsight + optional plan title. */
export function buildCoachBrief(insight: RecoveryInsight, planTitle = "план дня"): CoachBrief {
  const readinessStatus = mapStatus(insight.status);

  const workoutAdvice =
    readinessStatus === "rest_required"
      ? "Силовую сегодня пропусти. Если хочется движения — только лёгкая мобильность."
      : readinessStatus === "fatigued"
        ? "Снизь объём: разминка и рабочие подходы без добивания."
        : `${insight.recommendationTitle}. План: ${planTitle}.`;

  const hydrationAdvice =
    insight.waterAdequacyPct < 70
      ? `Вода на ${insight.waterAdequacyPct}% цели. Один стакан до тренировки.`
      : "Вода в норме. Между подходами — глоток, не литр.";

  const restAdvice = `Следующий лёгкий день: ${insight.optimalRestDay}.`;

  const actionItems: string[] = [];
  if (readinessStatus === "rest_required") actionItems.push("Без силовой сегодня");
  else actionItems.push(`Старт: ${planTitle}`);
  if (insight.proteinAdequacyPct < 80) actionItems.push("Добери белок до вечера");
  if (insight.waterAdequacyPct < 70) actionItems.push("Стакан воды сейчас");
  if (actionItems.length < 3) actionItems.push("Отдых между подходами полный");

  return {
    readinessScore: insight.recoveryScore,
    readinessStatus,
    readinessLabel: insight.statusLabel,
    summary: insight.recommendationDescription,
    workoutAdvice,
    nutritionAdvice: insight.nutritionAdvice,
    hydrationAdvice,
    restAdvice,
    actionItems: actionItems.slice(0, 3),
    source: "local_rules"
  };
}
