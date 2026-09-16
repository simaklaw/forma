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
import { calculateBurnedCalories, metForExercise } from "@forma/core";
import { Button } from "@/components/ui/button";
import { CompareSlider } from "@/components/compare-slider";
import { MuscleWeek } from "@/components/muscle-map";
import { planById, planExercises } from "@/lib/catalog";
import { todayKey } from "@/lib/forma";
import { useAppStore } from "@/lib/store";
import type { MuscleRegion } from "@/lib/types";

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
    return { todayKcal: Math.round(todayKcal), weekKcal: Math.round(weekKcal) };
  }, [workouts, profile.weightKg]);

  const onPick = (slot: "before" | "after", file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPhoto(slot, reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="px-5 pb-8 pt-10">
      <h1 className="font-display text-2xl tracking-tight">Прогресс</h1>

      <section className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-surface p-4 shadow-card">
          <p className="text-xs text-muted">Сожжено сегодня</p>
          <p className="mt-1 text-2xl tabular-nums">
            {burnStats.todayKcal > 0 ? `~${burnStats.todayKcal}` : "—"}
          </p>
          <p className="text-xs text-muted">ккал · MET</p>
        </div>
        <div className="rounded-2xl bg-surface p-4 shadow-card">
          <p className="text-xs text-muted">За 7 дней</p>
          <p className="mt-1 text-2xl tabular-nums">
            {burnStats.weekKcal > 0 ? `~${burnStats.weekKcal}` : "—"}
          </p>
          <p className="text-xs text-muted">ккал · MET</p>
        </div>
      </section>

      <section className="mt-4 rounded-2xl bg-surface p-4 shadow-card">
        <h2 className="text-sm font-medium text-muted">Вес</h2>
        {weightData.length > 1 ? (
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
