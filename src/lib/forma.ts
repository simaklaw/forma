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

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function bmrMifflin({
  sex,
  weightKg,
  heightCm,
  age,
}: {
  sex: Presentation;
  weightKg: number;
  heightCm: number;
  age: number;
}): number {
  // Mifflin-St Jeor; neutral treated as average of man/woman coefficients
  const s = sex === "man" ? 5 : sex === "woman" ? -161 : (5 - 161) / 2;
  return 10 * weightKg + 6.25 * heightCm - 5 * age + s;
}

const ACTIVITY = 1.375; // lightly active (home workouts a few times a week)

export function calorieGoalFromProfile(p: Pick<Profile, "presentation" | "weightKg" | "heightCm" | "age" | "goal">): number {
  const bmr = bmrMifflin({
    sex: p.presentation,
    weightKg: p.weightKg,
    heightCm: p.heightCm,
    age: p.age,
  });
  const tdee = bmr * ACTIVITY;
  const delta =
    p.goal === "strength" ? 250 : p.goal === "tone" ? -300 : p.goal === "energy" ? 0 : -150;
  return Math.round(tdee + delta);
}

export function macroGoals(kcal: number, goal: Goal): Macros {
  // protein ~1.8–2.2 g/kg is ideal, but we only have kcal here → share of energy
  let pPct = 0.3;
  let fPct = 0.3;
  let cPct = 0.4;
  if (goal === "strength") {
    pPct = 0.32;
    fPct = 0.28;
    cPct = 0.4;
  } else if (goal === "tone") {
    pPct = 0.35;
    fPct = 0.3;
    cPct = 0.35;
  } else if (goal === "recovery") {
    pPct = 0.28;
    fPct = 0.32;
    cPct = 0.4;
  }
  return {
    kcal,
    protein: Math.round((kcal * pPct) / 4),
    fat: Math.round((kcal * fPct) / 9),
    carbs: Math.round((kcal * cPct) / 4),
  };
}

export function coachLine({
  name,
  goal,
  doneToday,
  restDay,
  streak,
}: {
  name: string;
  goal: Goal;
  doneToday: boolean;
  restDay: boolean;
  streak: number;
}): string {
  const first = name.trim().split(/\s+/)[0] || "друг";
  if (doneToday) {
    if (streak >= 5) return `${first}, уже ${streak} дней подряд. Тело запоминает.`;
    return `${first}, готово. Сегодня достаточно.`;
  }
  if (restDay) return `${first}, сегодня отдых. Можно просто пройтись.`;
  const byGoal: Record<Goal, string> = {
    strength: `${first}, сила растёт от повторений, а не от героизма.`,
    tone: `${first}, лёгкое движение сегодня важнее идеальной формы.`,
    energy: `${first}, короткая сессия вернёт ясность.`,
    recovery: `${first}, мягко и без давления — этого достаточно.`,
  };
  return byGoal[goal];
}

export function mealMacros(items: MealItem[], foods: Food[]): Macros {
  const byId = new Map(foods.map((f) => [f.id, f]));
  let kcal = 0;
  let protein = 0;
  let fat = 0;
  let carbs = 0;
  for (const it of items) {
    const f = byId.get(it.foodId);
    if (!f) continue;
    const k = it.grams / 100;
    kcal += f.kcal * k;
    protein += f.protein * k;
    fat += f.fat * k;
    carbs += f.carbs * k;
  }
  return {
    kcal: Math.round(kcal),
    protein: Math.round(protein),
    fat: Math.round(fat),
    carbs: Math.round(carbs),
  };
}

export function regionsFromExercises(exercises: Exercise[]): MuscleRegion[] {
  const set = new Set<MuscleRegion>();
  for (const e of exercises) for (const r of e.regions) set.add(r);
  return [...set];
}

export function isRestDay(days: number[], date = new Date()): boolean {
  const dow = date.getDay(); // 0 Sun … 6 Sat
  return !days.includes(dow);
}

export function streakCount(logs: { date: string; completed: boolean }[], upTo = todayKey()): number {
  const done = new Set(logs.filter((l) => l.completed).map((l) => l.date));
  let n = 0;
  const d = new Date(upTo + "T12:00:00");
  for (;;) {
    const key = todayKey(d);
    if (!done.has(key)) break;
    n += 1;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function filterPlans(
  plans: Plan[],
  opts: { minutes: number; goals: Goal[]; equipment: Equipment[]; noJumps?: boolean },
): Plan[] {
  return plans.filter((p) => {
    if (p.minutes > opts.minutes && !p.optional) return false;
    if (opts.noJumps && p.jumps) return false;
    if (opts.goals.length && !p.goals.some((g) => opts.goals.includes(g))) return false;
    return true;
  });
}

export function planById(plans: Plan[], id: string): Plan | undefined {
  return plans.find((p) => p.id === id);
}

export function planExercises(plan: Plan, exercises: Exercise[]): Exercise[] {
  const map = new Map(exercises.map((e) => [e.id, e]));
  return plan.exerciseIds.map((id) => map.get(id)).filter(Boolean) as Exercise[];
}
