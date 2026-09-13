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
];

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function coachLine(profile: Profile, doneToday: boolean, restDay: boolean): string {
  if (!profile.onboarded) return "Давай познакомимся — это займёт минуту.";
  if (doneToday) return "Сегодня уже сделано. Хорошая работа.";
  if (restDay) return "Сегодня день восстановления. Можно лёгкую прогулку.";
  const hour = new Date().getHours();
  if (hour < 11) return "Утро — хорошее время для короткой сессии.";
  if (hour < 17) return "Есть 15–25 минут? Можно начать сейчас.";
  return "Вечерняя сессия тоже считается. Без спешки.";
}

export function bmrMifflin(profile: Pick<Profile, "weightKg" | "heightCm" | "age" | "presentation">): number {
  const { weightKg, heightCm, age, presentation } = profile;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (presentation === "woman") return base - 161;
  if (presentation === "man") return base + 5;
  return base - 78;
}

export function calorieTarget(profile: Profile): number {
  const bmr = bmrMifflin(profile);
  const activity = 1.375;
  let tdee = bmr * activity;
  if (profile.goal === "tone") tdee -= 300;
  if (profile.goal === "strength") tdee += 150;
  if (profile.goal === "recovery") tdee -= 100;
  return Math.round(tdee / 10) * 10;
}

export function macroTargets(kcal: number, goal: Goal): Macros {
  let proteinRatio = 0.3;
  let fatRatio = 0.3;
  if (goal === "strength") proteinRatio = 0.35;
  if (goal === "tone") proteinRatio = 0.32;
  const protein = Math.round((kcal * proteinRatio) / 4);
  const fat = Math.round((kcal * fatRatio) / 9);
  const carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);
  return { kcal, protein, fat, carbs };
}

export function mealMacros(items: MealItem[], foods: Food[]): Macros {
  let kcal = 0, protein = 0, fat = 0, carbs = 0;
  for (const item of items) {
    const food = foods.find((f) => f.id === item.foodId);
    if (!food) continue;
    const k = item.grams / 100;
    kcal += food.kcal * k;
    protein += food.protein * k;
    fat += food.fat * k;
    carbs += food.carbs * k;
  }
  return {
    kcal: Math.round(kcal),
    protein: Math.round(protein),
    fat: Math.round(fat),
    carbs: Math.round(carbs),
  };
}

export function isTrainingDay(days: number[], date = new Date()): boolean {
  return days.includes(date.getDay());
}

export function planMatches(
  plan: Plan,
  profile: Profile,
  exercises: Exercise[],
): boolean {
  if (!plan.goals.includes(profile.goal) && plan.goals.length > 0) return false;
  if (plan.minutes > profile.minutes && !plan.optional) return false;
  const ids = plan.exerciseIds;
  for (const id of ids) {
    const ex = exercises.find((e) => e.id === id);
    if (!ex) continue;
    if (ex.equipment.length && !ex.equipment.every((eq) => profile.equipment.includes(eq) || eq === "chair")) {
      // soft match — allow if mostly ok
    }
  }
  return true;
}

export function regionHit(regions: MuscleRegion[], region: MuscleRegion): boolean {
  return regions.includes(region);
}
