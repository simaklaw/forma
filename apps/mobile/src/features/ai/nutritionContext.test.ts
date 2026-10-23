import { buildNutritionDaySnapshot, renderNutritionContext } from './nutritionContext';
import type { DayMeals } from '@/state/useFitPulseStore';

const meals: DayMeals = {
  breakfast: [{ id: '1', name: 'Овсянка', kcal: 350, protein: 12, fat: 8, carbs: 50 }],
  lunch: [{ id: '2', name: 'Рис с курицей', kcal: 600, protein: 45, fat: 12, carbs: 70 }],
  snack: [],
  dinner: []
};

const targets = { target: 2400, proteinTarget: 180, fatTarget: 70, carbTarget: 240 };
const now = new Date('2026-09-26T12:00:00.000Z');

describe('buildNutritionDaySnapshot', () => {
  it('flattens meals with human labels and totals', () => {
    const snapshot = buildNutritionDaySnapshot(meals, targets, 5, now);
    expect(snapshot.dateKey).toBe('2026-09-26');
    expect(snapshot.meals).toHaveLength(2);
    expect(snapshot.meals[0].meal).toBe('Завтрак');
    expect(snapshot.totals).toEqual({ kcal: 950, protein: 57, fat: 20, carbs: 120 });
    expect(snapshot.waterGlasses).toBe(5);
  });

  it('keeps targets null when the profile is incomplete', () => {
    const snapshot = buildNutritionDaySnapshot(meals, null, 0, now);
    expect(snapshot.targets).toBeNull();
  });
});

describe('renderNutritionContext', () => {
  it('renders meals, totals, targets and asks for analysis', () => {
    const text = renderNutritionContext(buildNutritionDaySnapshot(meals, targets, 5, now));
    expect(text).toContain('Завтрак: Овсянка — 350 ккал (Б12 Ж8 У50)');
    expect(text).toContain('Итого: 950 ккал');
    expect(text).toContain('Цель: 2400 ккал');
    expect(text).toContain('Вода: 5 стаканов.');
    expect(text).toContain('рекомендаций');
  });

  it('mentions the empty diary explicitly', () => {
    const empty = { breakfast: [], lunch: [], snack: [], dinner: [] };
    const text = renderNutritionContext(buildNutritionDaySnapshot(empty, null, 0, now));
    expect(text).toContain('записей о питании нет');
    expect(text).toContain('Цели КБЖУ не заполнены');
  });
});
