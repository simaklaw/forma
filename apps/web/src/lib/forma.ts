import { calculatePresentationTargets } from "@forma/core";
import type {
  Equipment,
  Exercise,
  Food,
  Goal,
  Macros,
  MealItem,
  MuscleRegion,
  Plan,
  Presentation,
  Profile,
} from "./types";

export const WEEKDAYS = [
  { i: 1, label: "Пн" },
  { i: 2, label: "Вт" },
  { i: 3, label: "Ср" },
  { i: 4, label: "Чт" },
  { i: 5, label: "Пт" },
  { i: 6, label: "Сб" },
  { i: 0, label: "Вс" },
] as const;

/** Calendar day key YYYY-MM-DD (local timezone). */
export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfWeek(d = new Date()): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Home-workout goal macros. Calculation lives in @forma/core so web and
 * mobile do not silently drift apart.
 */
export function calcGoals(input: {
  presentation: Presentation;
  weightKg: number;
  heightCm: number;
  age: number;
  goal: Goal;
}): Macros {
  return calculatePresentationTargets(input);
}

export function exerciseAllowed(ex: Pick<Exercise, "equipment">, owned: Equipment[]): boolean {
  if (ex.equipment.length === 0) return true;
  return ex.equipment.every((item) => owned.includes(item));
}

export function pickTodayPlan(
  plans: Plan[],
  exercises: Exercise[],
  profile: Pick<Profile, "days" | "minutes" | "goal" | "equipment">,
  date: Date,
): Plan | null {
  const dow = date.getDay();
  if (!profile.days.includes(dow)) return null;
  const allowed = plans.filter((p) => {
    if (p.minutes > profile.minutes && !p.optional) return false;
    if (!p.goals.includes(profile.goal) && p.goals.length > 0) return false;
    const exs = p.exerciseIds
      .map((id) => exercises.find((e) => e.id === id))
      .filter(Boolean) as Exercise[];
    return exs.every((e) => exerciseAllowed(e, profile.equipment));
  });
  if (!allowed.length) return plans.find((p) => p.minutes <= profile.minutes) ?? plans[0] ?? null;
  const exact = allowed.find((p) => p.minutes === profile.minutes);
  return exact ?? allowed[0];
}

export const GOAL_LABEL: Record<Goal, string> = {
  strength: "Сила",
  tone: "Тонус",
  energy: "Энергия",
  recovery: "Восстановление",
};

/** Coach one-liner — mirrors RulesCoach in @forma/core (no ESM core import for node tests). */
export function coachLine(args: {
  name: string;
  goal: Goal;
  doneToday: boolean;
  restDay: boolean;
  streak: number;
}): string {
  const first = args.name.trim().split(/\s+/)[0] || "друг";
  if (args.doneToday) {
    if (args.streak >= 5) return `${first}, уже ${args.streak} дней подряд. Тело запоминает.`;
    return `${first}, готово. Сегодня достаточно.`;
  }
  if (args.restDay) return `${first}, сегодня отдых. Можно просто пройтись.`;
  const goal = GOAL_LABEL[args.goal].toLowerCase();
  if (goal.includes("сил")) return `${first}, сила растёт от повторений, а не от героизма.`;
  if (goal.includes("тонус")) return `${first}, лёгкое движение сегодня важнее идеальной формы.`;
  if (goal.includes("восстанов")) return `${first}, мягко и без давления — этого достаточно.`;
  if (goal.includes("энерг")) return `${first}, короткая сессия вернёт ясность.`;
  return `${first}, маленький шаг сегодня важнее идеального плана.`;
}

export function macrosFor(food: Food, grams: number): Macros {
  const k = grams / 100;
  return {
    kcal: Math.round(food.kcal * k),
    protein: Math.round(food.protein * k),
    fat: Math.round(food.fat * k),
    carbs: Math.round(food.carbs * k),
  };
}

export function sumMacros(items: Macros[]): Macros {
  return items.reduce(
    (a, b) => ({
      kcal: a.kcal + b.kcal,
      protein: a.protein + b.protein,
      fat: a.fat + b.fat,
      carbs: a.carbs + b.carbs,
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0 },
  );
}

export function dayMacros(items: MealItem[], foods: Food[]): Macros {
  const byId = new Map(foods.map((f) => [f.id, f]));
  const parts: Macros[] = [];
  for (const it of items) {
    if (it.kcal100 != null) {
      const k = it.grams / 100;
      parts.push({
        kcal: Math.round((it.kcal100 ?? 0) * k),
        protein: Math.round((it.protein100 ?? 0) * k),
        fat: Math.round((it.fat100 ?? 0) * k),
        carbs: Math.round((it.carbs100 ?? 0) * k),
      });
      continue;
    }
    const f = byId.get(it.foodId);
    if (f) parts.push(macrosFor(f, it.grams));
  }
  return sumMacros(parts);
}

export function greeting(name: string, d = new Date()): string {
  const h = d.getHours();
  const first = name.trim().split(/\s+/)[0] || "";
  const hi = h < 5 ? "Доброй ночи" : h < 12 ? "Доброе утро" : h < 18 ? "Добрый день" : "Добрый вечер";
  return first ? `${hi}, ${first}` : hi;
}

export function weekKeys(d = new Date()): string[] {
  const mon = startOfWeek(d);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(mon);
    x.setDate(mon.getDate() + i);
    return todayKey(x);
  });
}

export const MEAL_LABEL: Record<"breakfast" | "lunch" | "dinner" | "snack", string> = {
  breakfast: "Завтрак",
  lunch: "Обед",
  dinner: "Ужин",
  snack: "Перекус",
};

export const EQUIP_LABEL: Record<Equipment, string> = {
  bands: "Резинки",
  dumbbells: "Гантели",
  pullup: "Турник",
  chair: "Стул",
};

export const PRESENT_LABEL: Record<Presentation, string> = {
  man: "Мужской",
  woman: "Женский",
  neutral: "Нейтральный",
};

export function regionHit(regions: MuscleRegion[], region: MuscleRegion): boolean {
  return regions.includes(region);
}
