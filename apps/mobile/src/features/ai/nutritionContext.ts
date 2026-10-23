import { selectDailyTotals, type DayMeals } from '@/state/useFitPulseStore';
import { toDateKey } from '@/engines/WorkoutStats';

export interface NutritionDaySnapshot {
  dateKey: string;
  meals: Array<{
    meal: string;
    name: string;
    kcal: number;
    protein: number;
    fat: number;
    carbs: number;
  }>;
  totals: { kcal: number; protein: number; fat: number; carbs: number };
  targets: {
    target: number;
    proteinTarget: number;
    fatTarget: number;
    carbTarget: number;
  } | null;
  waterGlasses: number;
}

const MEAL_LABELS: Record<keyof DayMeals, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  snack: 'Перекус',
  dinner: 'Ужин'
};

/** Снимок дневника питания для AI-анализа: сериализуемая, без функций. */
export function buildNutritionDaySnapshot(
  todayMeals: DayMeals,
  targets: NutritionDaySnapshot['targets'],
  waterGlasses: number,
  now: Date = new Date()
): NutritionDaySnapshot {
  const meals = (Object.keys(MEAL_LABELS) as (keyof DayMeals)[]).flatMap((meal) =>
    todayMeals[meal].map((item) => ({
      meal: MEAL_LABELS[meal],
      name: item.name,
      kcal: item.kcal,
      protein: item.protein,
      fat: item.fat,
      carbs: item.carbs
    }))
  );
  const totals = selectDailyTotals(todayMeals);
  return { dateKey: toDateKey(now), meals, totals, targets, waterGlasses };
}

/** Текст бизнес-контекста для промпта: дневник + цели + вода. */
export function renderNutritionContext(snapshot: NutritionDaySnapshot): string {
  const lines: string[] = [`Дневник питания за ${snapshot.dateKey}:`];
  if (snapshot.meals.length === 0) {
    lines.push('Сегодня записей о питании нет.');
  }
  for (const item of snapshot.meals) {
    lines.push(
      `- ${item.meal}: ${item.name} — ${item.kcal} ккал (Б${item.protein} Ж${item.fat} У${item.carbs})`
    );
  }
  const { totals, targets } = snapshot;
  lines.push(
    `Итого: ${totals.kcal} ккал, белки ${totals.protein} г, жиры ${totals.fat} г, углеводы ${totals.carbs} г.`
  );
  if (targets) {
    lines.push(
      `Цель: ${targets.target} ккал (Б${targets.proteinTarget} Ж${targets.fatTarget} У${targets.carbTarget}).`
    );
  } else {
    lines.push('Цели КБЖУ не заполнены (профиль неполный).');
  }
  lines.push(`Вода: ${snapshot.waterGlasses} стаканов.`);
  lines.push(
    'Проанализируй рацион: соответствие цели, баланс БЖУ, дефициты и излишки. Дай не более 3 конкретных рекомендаций на сегодня.'
  );
  return lines.join('\n');
}
