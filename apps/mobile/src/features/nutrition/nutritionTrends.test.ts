import {
  dailyNutritionTotals,
  nutritionWindowSummary,
  windowDailyNutrition
} from './nutritionTrends';
import type { DayMeals, FoodItem } from '@/state/useFitPulseStore';

// Дата-время в UTC-полдень: CI-раннеры в UTC, локальные даты стабильны.
const NOW = new Date('2026-10-28T12:00:00Z');
const DAY = (offsetDays: number, hour = 10): number =>
  new Date(`2026-10-${String(28 - offsetDays).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00Z`).getTime();

function meals(items: FoodItem[]): DayMeals {
  return { breakfast: items, lunch: [], snack: [], dinner: [] };
}

function item(kcal: number, protein: number, loggedAt?: number): FoodItem {
  return { id: `id-${kcal}-${loggedAt ?? 'no-ts'}`, name: 'x', kcal, protein, fat: 0, carbs: 0, loggedAt };
}

describe('nutritionTrends', () => {
  it('группирует позиции по дням и сортирует по возрастанию', () => {
    const all = meals([
      item(300, 20, DAY(0, 9)),
      item(500, 30, DAY(0, 14)),
      item(800, 50, DAY(1, 13)),
      item(200, 10, DAY(3, 8))
    ]);
    const daily = dailyNutritionTotals(all, NOW);
    expect(daily.map((d) => d.dateKey)).toEqual(['2026-10-25', '2026-10-27', '2026-10-28']);
    expect(daily[2]).toEqual({ dateKey: '2026-10-28', kcal: 800, protein: 50, fat: 0, carbs: 0 });
  });

  it('позиции без loggedAt считаются сегодняшними', () => {
    const all = meals([item(150, 10), item(250, 15, DAY(2, 9))]);
    const daily = dailyNutritionTotals(all, NOW);
    expect(daily.map((d) => d.dateKey)).toEqual(['2026-10-26', '2026-10-28']);
    expect(daily[1].kcal).toBe(150);
  });

  it('окно 7 дней: срез и средние только по дням с записями', () => {
    const daily = dailyNutritionTotals(
      meals([
        item(1000, 100, DAY(0)),
        item(500, 50, DAY(6)),
        item(4000, 400, DAY(10)) // вне окна
      ]),
      NOW
    );
    expect(windowDailyNutrition(daily, 7, NOW).map((d) => d.dateKey)).toEqual([
      '2026-10-22',
      '2026-10-28'
    ]);
    const summary = nutritionWindowSummary(daily, 7, NOW);
    expect(summary).toEqual({ avgKcal: 750, avgProtein: 75, daysLogged: 2 });
  });

  it('окно 30 дней включает более старые записи, окно 7 — нет', () => {
    const daily = dailyNutritionTotals(meals([item(2000, 200, DAY(10)), item(1000, 100, DAY(0))]), NOW);
    expect(nutritionWindowSummary(daily, 7, NOW).daysLogged).toBe(1);
    const month = nutritionWindowSummary(daily, 30, NOW);
    expect(month.daysLogged).toBe(2);
    expect(month.avgKcal).toBe(1500);
  });

  it('пустой дневник — пустая история и нулевые средние', () => {
    const daily = dailyNutritionTotals(meals([]), NOW);
    expect(daily).toEqual([]);
    expect(nutritionWindowSummary(daily, 30, NOW)).toEqual({
      avgKcal: 0,
      avgProtein: 0,
      daysLogged: 0
    });
  });
});
