import { Minus, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { MacroRing } from "@/components/macro-ring";
import { FOODS, foodById } from "@/lib/catalog";
import { dayMacros, MEAL_LABEL, todayKey } from "@/lib/forma";
import { useAppStore } from "@/lib/store";
import type { MealType } from "@/lib/types";
import { cn } from "@/lib/utils";

const MEALS: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export function NutritionScreen() {
  const profile = useAppStore((s) => s.profile);
  const meals = useAppStore((s) => s.meals);
  const addMeal = useAppStore((s) => s.addMeal);
  const removeMeal = useAppStore((s) => s.removeMeal);
  const [meal, setMeal] = useState<MealType>("breakfast");
  const [foodId, setFoodId] = useState(FOODS[0]?.id ?? "");
  const [grams, setGrams] = useState(100);

  const today = todayKey();
  const todayItems = meals.filter((m) => m.date === today);
  const macros = useMemo(() => dayMacros(todayItems, FOODS), [todayItems]);

  const byMeal = (t: MealType) => todayItems.filter((m) => m.meal === t);

  return (
    <div className="px-5 pb-8 pt-10">
      <h1 className="font-display text-2xl tracking-tight">Питание</h1>
      <p className="mt-1 text-sm text-muted">Сегодня · {macros.kcal} / {profile.calorieGoal} ккал</p>

      <div className="mt-6 flex justify-center gap-4">
        <MacroRing value={macros.kcal} max={profile.calorieGoal} label="ккал" size={110} />
        <div className="grid grid-cols-1 gap-2 self-center text-sm">
          <MacroLine label="Белки" value={macros.protein} max={profile.proteinGoal} />
          <MacroLine label="Жиры" value={macros.fat} max={profile.fatGoal} />
          <MacroLine label="Углеводы" value={macros.carbs} max={profile.carbsGoal} />
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {MEALS.map((t) => {
          const items = byMeal(t);
          return (
            <section key={t} className="rounded-xl bg-surface p-4 shadow-card">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-medium">{MEAL_LABEL[t]}</h2>
                <button
                  type="button"
                  className="text-xs text-accent"
                  onClick={() => setMeal(t)}
                >
                  + добавить
                </button>
              </div>
              {items.length === 0 ? (
                <p className="text-sm text-muted">Пока пусто</p>
              ) : (
                <ul className="space-y-2">
                  {items.map((it) => {
                    const f = foodById(it.foodId);
                    return (
                      <li key={it.id} className="flex items-center justify-between text-sm">
                        <span>
                          {f?.name ?? it.foodId} · {it.grams} г
                        </span>
                        <button
                          type="button"
                          className="text-muted hover:text-danger"
                          onClick={() => removeMeal(it.id)}
                        >
                          ✕
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl bg-surface p-4 shadow-card">
        <p className="mb-3 text-sm font-medium">Быстро добавить · {MEAL_LABEL[meal]}</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {MEALS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setMeal(t)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                meal === t ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted",
              )}
            >
              {MEAL_LABEL[t]}
            </button>
          ))}
        </div>
        <select
          className="mb-3 h-11 w-full rounded-lg bg-surface-2 px-3 text-sm outline-none"
          value={foodId}
          onChange={(e) => setFoodId(e.target.value)}
        >
          {FOODS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <div className="mb-3 flex items-center justify-center gap-4">
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-full bg-surface-2"
            onClick={() => setGrams((g) => Math.max(20, g - 20))}
          >
            <Minus className="size-4" />
          </button>
          <span className="w-16 text-center font-display text-xl tabular-nums">{grams} г</span>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-full bg-surface-2"
            onClick={() => setGrams((g) => g + 20)}
          >
            <Plus className="size-4" />
          </button>
        </div>
        <Button
          className="w-full"
          onClick={() => {
            if (foodId) addMeal(meal, foodId, grams);
          }}
        >
          Добавить
        </Button>
      </div>
    </div>
  );
}

function MacroLine({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums">
          {value}/{max}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
