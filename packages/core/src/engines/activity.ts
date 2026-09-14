/** PAL / k_activity from the architectural report. */

export type ActivityLevel = "sedentary" | "light" | "moderate" | "high" | "extra";

export const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  extra: 1.9,
};

export const ACTIVITY_LABEL_RU: Record<ActivityLevel, string> = {
  sedentary: "Минимальный",
  light: "Низкий",
  moderate: "Умеренный",
  high: "Высокий",
  extra: "Экстремальный",
};

export function nearestActivityLevel(factor: number): ActivityLevel {
  const entries = Object.entries(ACTIVITY_FACTOR) as [ActivityLevel, number][];
  let best: ActivityLevel = "light";
  let dist = Infinity;
  for (const [level, value] of entries) {
    const d = Math.abs(value - factor);
    if (d < dist) {
      dist = d;
      best = level;
    }
  }
  return best;
}
