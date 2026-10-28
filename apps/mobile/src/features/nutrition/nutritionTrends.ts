/**
 * Тренды питания: дневная история калорий/макросов и средние за окна 7/30/90.
 * todayMeals не ресетится по датам (позиции несут loggedAt) — вся история здесь.
 */

import { toDateKey } from '@/engines/WorkoutStats';
import type { DayMeals } from '@/state/useFitPulseStore';

export type TrendWindow = 7 | 30 | 90;

export const TREND_WINDOWS: readonly TrendWindow[] = [7, 30, 90];

export interface DailyNutrition {
  dateKey: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface NutritionWindowSummary {
  avgKcal: number;
  avgProtein: number;
  daysLogged: number;
}

/** Все приёмы пищи → суммы по дням, по возрастанию даты. Без loggedAt — сегодня. */
export function dailyNutritionTotals(meals: DayMeals, now: Date = new Date()): DailyNutrition[] {
  const todayKey = toDateKey(now);
  const byDay = new Map<string, DailyNutrition>();
  const items = [...meals.breakfast, ...meals.lunch, ...meals.snack, ...meals.dinner];
  for (const item of items) {
    const key = item.loggedAt != null ? toDateKey(new Date(item.loggedAt)) : todayKey;
    const day = byDay.get(key) ?? { dateKey: key, kcal: 0, protein: 0, fat: 0, carbs: 0 };
    day.kcal += item.kcal;
    day.protein += item.protein;
    day.fat += item.fat;
    day.carbs += item.carbs;
    byDay.set(key, day);
  }
  return [...byDay.values()].sort((a, b) => (a.dateKey < b.dateKey ? -1 : 1));
}

/** Дни окна (включая сегодня) — срез истории для графика. */
export function windowDailyNutrition(
  daily: DailyNutrition[],
  windowDays: TrendWindow,
  now: Date = new Date()
): DailyNutrition[] {
  const todayKey = toDateKey(now);
  const from = new Date(now);
  from.setDate(from.getDate() - (windowDays - 1));
  const fromKey = toDateKey(from);
  return daily.filter((d) => d.dateKey >= fromKey && d.dateKey <= todayKey);
}

/** Средние за окно: делим на дни с записями, а не на длину окна. */
export function nutritionWindowSummary(
  daily: DailyNutrition[],
  windowDays: TrendWindow,
  now: Date = new Date()
): NutritionWindowSummary {
  const inWindow = windowDailyNutrition(daily, windowDays, now);
  if (inWindow.length === 0) return { avgKcal: 0, avgProtein: 0, daysLogged: 0 };
  const sum = inWindow.reduce(
    (acc, d) => ({ kcal: acc.kcal + d.kcal, protein: acc.protein + d.protein }),
    { kcal: 0, protein: 0 }
  );
  return {
    avgKcal: Math.round(sum.kcal / inWindow.length),
    avgProtein: Math.round(sum.protein / inWindow.length),
    daysLogged: inWindow.length
  };
}
