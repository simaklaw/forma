/**
 * PerformanceEngine — progression cues and muscle readiness (pure, no I/O).
 * Catalog-agnostic: callers pass exercise completions and region hits.
 */

import { calculateStreakStats, type AchievementWorkout } from "./Achievements.ts";

export type MuscleRegionId =
  | "legs"
  | "glutes"
  | "core"
  | "chest"
  | "back"
  | "arms"
  | "shoulders";

export type ExerciseCompletion = {
  exerciseId: string;
  name: string;
  date: string;
  completed: boolean;
  regions: MuscleRegionId[];
  equipment?: string[];
  unit?: "rep" | "sec";
};

export type ExercisePerformanceAnalysis = {
  exerciseId: string;
  name: string;
  timesCompleted: number;
  lastTrainedDate: string | null;
  suggestedText: string;
  actionType: "increase" | "maintain" | "deload" | "reps_up";
  formCues: string[];
  fatigueRisk: "low" | "medium" | "high";
};

export type OverallPerformanceReport = {
  totalWorkouts: number;
  completedWorkouts: number;
  streakDays: number;
  weeklyTrend: "accelerating" | "stable" | "declining";
  muscleRecovery: {
    region: MuscleRegionId;
    label: string;
    status: "ready" | "recovering" | "fatigued";
    lastTrainedDaysAgo: number;
  }[];
  exerciseAnalyses: Record<string, ExercisePerformanceAnalysis>;
  primaryCoachTakeaway: string;
};

export type RealtimeSetFeedback = {
  setNumber: number;
  totalSets: number;
  adjustmentNote: string;
  formFocus: string;
  safetyCheck: string;
};

const REGION_LABELS: Record<MuscleRegionId, string> = {
  legs: "Ноги",
  glutes: "Ягодицы",
  core: "Кор",
  chest: "Грудь",
  back: "Спина",
  arms: "Руки",
  shoulders: "Плечи",
};

const DEFAULT_CUES = ["Темп 2-0-1, без рывков.", "Выдох в усилии."];

function daysAgo(dateStr: string | undefined, nowMs: number): number {
  if (!dateStr) return 999;
  return Math.max(
    0,
    Math.floor((nowMs - new Date(dateStr + "T12:00:00").getTime()) / 86400000),
  );
}

export function analyzeWorkoutPerformance(input: {
  workouts: AchievementWorkout[];
  exercises: ExerciseCompletion[];
  formCuesById?: Record<string, string[]>;
  now?: Date;
}): OverallPerformanceReport {
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const completedWorkouts = input.workouts.filter((w) => w.completed).length;
  const totalWorkouts = input.workouts.length;

  const exerciseCounts: Record<string, number> = {};
  const exerciseLastDate: Record<string, string> = {};
  const names: Record<string, string> = {};
  const meta: Record<string, ExerciseCompletion> = {};
  const regionLastDate: Partial<Record<MuscleRegionId, string>> = {};

  for (const e of input.exercises) {
    names[e.exerciseId] = e.name;
    meta[e.exerciseId] = e;
    exerciseCounts[e.exerciseId] =
      (exerciseCounts[e.exerciseId] || 0) + (e.completed ? 1 : 0.5);
    if (!exerciseLastDate[e.exerciseId] || e.date > exerciseLastDate[e.exerciseId]) {
      exerciseLastDate[e.exerciseId] = e.date;
    }
    for (const r of e.regions) {
      if (!regionLastDate[r] || e.date > (regionLastDate[r] as string)) {
        regionLastDate[r] = e.date;
      }
    }
  }

  const allRegions: MuscleRegionId[] = [
    "legs",
    "glutes",
    "core",
    "chest",
    "back",
    "arms",
    "shoulders",
  ];
  const muscleRecovery = allRegions.map((region) => {
    const days = daysAgo(regionLastDate[region], nowMs);
    let status: "ready" | "recovering" | "fatigued" = "ready";
    if (days === 0) status = "fatigued";
    else if (days === 1) status = "recovering";
    return {
      region,
      label: REGION_LABELS[region],
      status,
      lastTrainedDaysAgo: days,
    };
  });

  const recent7 = input.workouts.filter((w) => daysAgo(w.date, nowMs) <= 7).length;
  const previous7 = input.workouts.filter((w) => {
    const d = daysAgo(w.date, nowMs);
    return d > 7 && d <= 14;
  }).length;
  let weeklyTrend: OverallPerformanceReport["weeklyTrend"] = "stable";
  if (recent7 > previous7) weeklyTrend = "accelerating";
  else if (recent7 < previous7 && previous7 > 0) weeklyTrend = "declining";

  const exerciseAnalyses: Record<string, ExercisePerformanceAnalysis> = {};
  for (const id of Object.keys(exerciseCounts)) {
    const times = exerciseCounts[id] || 0;
    const lastDate = exerciseLastDate[id] || null;
    const ago = daysAgo(lastDate ?? undefined, nowMs);
    const ex = meta[id];
    let suggestedText = "Держи нагрузку";
    let actionType: ExercisePerformanceAnalysis["actionType"] = "maintain";

    if (times >= 4) {
      if (ex?.equipment?.includes("dumbbells")) {
        suggestedText = "+2.5 кг к гантелям";
        actionType = "increase";
      } else if (ex?.unit === "sec") {
        suggestedText = "+10–15 с к подходу";
        actionType = "reps_up";
      } else {
        suggestedText = "+2 повторения или +2 кг";
        actionType = "increase";
      }
    } else if (times >= 2) {
      suggestedText = "+1–2 повторения в последнем сете";
      actionType = "reps_up";
    }

    let fatigueRisk: "low" | "medium" | "high" = "low";
    if (ago === 0 && times > 0) fatigueRisk = "high";
    else if (ago === 1) fatigueRisk = "medium";

    exerciseAnalyses[id] = {
      exerciseId: id,
      name: names[id] ?? id,
      timesCompleted: Math.floor(times),
      lastTrainedDate: lastDate,
      suggestedText,
      actionType,
      formCues: input.formCuesById?.[id] ?? DEFAULT_CUES,
      fatigueRisk,
    };
  }

  let primaryCoachTakeaway = "База есть. 3–4 силовых в неделю закрывают прогресс.";
  if (completedWorkouts >= 5) {
    primaryCoachTakeaway = `Стабильно: ${completedWorkouts} сессий. Можно +5–10% в базовых.`;
  } else if (completedWorkouts === 0) {
    primaryCoachTakeaway = "Первая сессия — техника и дыхание, не вес.";
  }

  return {
    totalWorkouts,
    completedWorkouts,
    streakDays: calculateStreakStats(input.workouts, now).currentStreak,
    weeklyTrend,
    muscleRecovery,
    exerciseAnalyses,
    primaryCoachTakeaway,
  };
}

export function getRealtimeSetFeedback(input: {
  exerciseId: string;
  exerciseName: string;
  currentSetIndex: number;
  totalSets: number;
  formCues?: string[];
  suggestedText?: string;
}): RealtimeSetFeedback {
  const setNumber = input.currentSetIndex + 1;
  const cues = input.formCues ?? DEFAULT_CUES;
  const isFirst = setNumber === 1;
  const isFinal = setNumber === input.totalSets;

  if (isFirst) {
    return {
      setNumber,
      totalSets: input.totalSets,
      adjustmentNote: "Разминочный сет — плавность важнее веса",
      formFocus: cues[0] ?? DEFAULT_CUES[0],
      safetyCheck: "Проверь суставы до рабочих подходов",
    };
  }
  if (isFinal) {
    return {
      setNumber,
      totalSets: input.totalSets,
      adjustmentNote: input.suggestedText ?? "Максимальная концентрация",
      formFocus: "Если есть запас — +1–2 повторения. Технический отказ — стоп.",
      safetyCheck: "Не ломай амплитуду ради ещё одного раза",
    };
  }
  return {
    setNumber,
    totalSets: input.totalSets,
    adjustmentNote: "Рабочий подход, темп 2-1-1",
    formFocus: cues[1] ?? cues[0] ?? DEFAULT_CUES[0],
    safetyCheck: "Глубина важнее скорости",
  };
}
