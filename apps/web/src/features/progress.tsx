import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  analyzeWorkoutPerformance,
  calculateBurnedCalories,
  evaluateAchievements,
  metForExercise,
  type ExerciseCompletion,
} from "@forma/core";
import { Button } from "@/components/ui/button";
import { CompareSlider } from "@/components/compare-slider";
import { MuscleWeek } from "@/components/muscle-map";
import { EXERCISES, FOODS, planById, planExercises } from "@/lib/catalog";
import { dayMacros, todayKey } from "@/lib/forma";
import { useAppStore } from "@/lib/store";
import type { MuscleRegion } from "@/lib/types";
import { cn } from "@/lib/utils";

function planBurnKcal(planId: string, weightKg: number): number {
  const plan = planById(planId);
  if (!plan) return 0;
  return planExercises(plan).reduce((sum, ex) => {
    const workSec = ex.unit === "sec" ? ex.reps * ex.sets : ex.reps * ex.sets * 3;
    return sum + calculateBurnedCalories(metForExercise(ex.id), weightKg, workSec / 60);
  }, 0);
}

export function ProgressScreen() {
  const weights = useAppStore((s) => s.weights);
  const measurements = useAppStore((s) => s.measurements);
  const workouts = useAppStore((s) => s.workouts);
  const meals = useAppStore((s) => s.meals);
  const photos = useAppStore((s) => s.photos);
  const addWeight = useAppStore((s) => s.addWeight);
  const addMeasurement = useAppStore((s) => s.addMeasurement);
  const setPhoto = useAppStore((s) => s.setPhoto);
  const profile = useAppStore((s) => s.profile);

  const [kg, setKg] = useState(profile.weightKg);
  const [waist, setWaist] = useState(80);

  const weightData = [...weights]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((w) => ({ date: w.date.slice(5), kg: w.kg }));

  const regionsHit: MuscleRegion[] = [];
  const recent = workouts.slice(-7);
  for (const w of recent) for (const r of w.regions) if (!regionsHit.includes(r)) regionsHit.push(r);

  const burnStats = useMemo(() => {
    const today = todayKey();
    let todayKcal = 0;
    let weekKcal = 0;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 6);
    const cutoffKey = cutoff.toISOString().slice(0, 10);
    for (const w of workouts) {
      if (!w.completed) continue;
      const kcal = planBurnKcal(w.planId, profile.weightKg);
      if (w.date >= cutoffKey) weekKcal += kcal;
      if (w.date === today) todayKcal += kcal;
    }
    return { todayKcal, weekKcal };
  }, [workouts, profile.weightKg]);

  const badges = evaluateAchievements({
    workouts,
    proteinTodayG: dayMacros(meals, FOODS).protein,
    proteinGoalG: profile.proteinGoal,
  });

  const performance = useMemo(() => {
    const exerciseCompletions: ExerciseCompletion[] = [];
    for (const w of workouts) {
      if (!w.completed) continue;
      const plan = planById(w.planId);
      if (!plan) continue;
      for (const id of plan.exerciseIds) {
        const ex = EXERCISES.find((e) => e.id === id);
        if (!ex) continue;
        exerciseCompletions.push({
          exerciseId: id,
          name: ex.name,
          date: w.date,
          completed: true,
          regions: ex.regions as ExerciseCompletion["regions"],
          equipment: ex.equipment,
          unit: ex.unit,
        });
      }
    }
    return analyzeWorkoutPerformance({ workouts, exercises: exerciseCompletions });
  }, [workouts]);

  function onPick(slot: "before" | "after", file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPhoto(slot, reader.result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="px-4 pb-24 pt-4">
      <h1 className="font-display text-2xl">Прогресс</h1>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-surface p-4 shadow-card">
          <p className="text-xs text-muted">Сегодня</p>
          <p className="mt-1 text-2xl tabular-nums">{Math.round(burnStats.todayKcal)}</p>
          <p className="text-xs text-muted">ккал</p>
        </div>
        <div className="rounded-2xl bg-surface p-4 shadow-card">
          <p className="text-xs text-muted">За 7 дней</p>
          <p className="mt-1 text-2xl tabular-nums">{Math.round(burnStats.weekKcal)}</p>
          <p className="text-xs text-muted">ккал</p>
        </div>
      </section>

      {badges.length > 0 && (
        <section className="mt-4 rounded-2xl bg-surface p-4 shadow-card">
          <h2 className="mb-3 text-sm font-medium text-muted">Достижения</h2>
          <div className="grid grid-cols-3 gap-2">
            {badges.map((b) => (
              <div
                key={b.id}
                className={cn(
                  "flex flex-col items-center rounded-xl bg-surface-2 p-3 text-center",
                  !b.unlocked && "opacity-40",
                )}
              >
                <span className="mt-1 text-[11px] font-medium leading-tight">{b.title}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {performance.muscleRecovery.length > 0 && (
        <section className="mt-4 rounded-2xl bg-surface p-4 shadow-card">
          <h2 className="mb-3 text-sm font-medium text-muted">Восстановление мышц</h2>
          <div className="flex flex-wrap gap-2">
            {performance.muscleRecovery.map((m) => (
              <span
                key={m.region}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium",
                  m.status === "ready"
                    ? "bg-emerald-500/15 text-emerald-600"
                    : m.status === "recovering"
                      ? "bg-amber-500/15 text-amber-600"
                      : "bg-rose-500/15 text-rose-600",
                )}
              >
                {m.label}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="mt-4 rounded-2xl bg-surface p-4 shadow-card">
        <h2 className="text-sm font-medium text-muted">Вес, кг</h2>
        {weightData.length >= 2 ? (
          <div className="mt-2 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-muted)" }} />
                <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fontSize: 11, fill: "var(--color-muted)" }} width={36} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                  }}
                />
                <Line type="monotone" dataKey="kg" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">Добавь 2+ замера, появится график.</p>
        )}
        <div className="mt-3 flex gap-2">
          <input
            type="number"
            className="h-11 flex-1 rounded-lg bg-surface-2 px-3 text-sm outline-none"
            value={kg}
            onChange={(e) => setKg(Number(e.target.value))}
          />
          <Button onClick={() => addWeight(kg)}>Записать</Button>
        </div>
      </section>

      <section className="mt-4 rounded-2xl bg-surface p-4 shadow-card">
        <h2 className="text-sm font-medium text-muted">Талия, см</h2>
        <p className="mt-1 text-2xl tabular-nums">
          {measurements.at(-1)?.waist ?? "—"}
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="number"
            className="h-11 flex-1 rounded-lg bg-surface-2 px-3 text-sm outline-none"
            value={waist}
            onChange={(e) => setWaist(Number(e.target.value))}
          />
          <Button variant="secondary" onClick={() => addMeasurement(waist)}>
            Записать
          </Button>
        </div>
      </section>

      <section className="mt-4 rounded-2xl bg-surface p-4 shadow-card">
        <h2 className="mb-3 text-sm font-medium text-muted">Мышцы за неделю</h2>
        <MuscleWeek hit={regionsHit} />
      </section>

      <section className="mt-4">
        <h2 className="mb-3 text-sm font-medium text-muted">Фото «было / стало»</h2>
        <CompareSlider before={photos.before} after={photos.after} onPick={onPick} />
      </section>
    </div>
  );
}
