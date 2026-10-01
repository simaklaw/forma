import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CoachEngine,
  analyzeRecovery,
  calculateBurnedCalories,
  metForExercise,
  type UserContextSnapshot,
} from "@forma/core";
import { Button } from "@/components/ui/button";
import { ExerciseCard } from "@/components/exercise-card";
import { WeekDots } from "@/components/week-dots";
import { FOODS, PLANS, planById, planExercises, EXERCISES } from "@/lib/catalog";
import { coachLine, dayMacros, greeting, pickTodayPlan, todayKey } from "@/lib/forma";
import { useAppStore } from "@/lib/store";
import {
  peekDomainResumable,
  planIdFromTemplateRevision,
  uiSetsFromDomain,
} from "@/lib/workout-session/dualWrite.ts";

function countSets(setsDone: Record<string, boolean[]>): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const arr of Object.values(setsDone)) {
    total += arr.length;
    done += arr.filter(Boolean).length;
  }
  return { done, total };
}

export function TodayScreen() {
  const navigate = useNavigate();
  const profile = useAppStore((s) => s.profile);
  const workouts = useAppStore((s) => s.workouts);
  const meals = useAppStore((s) => s.meals);
  const waterByDate = useAppStore((s) => s.waterByDate);
  const addWater = useAppStore((s) => s.addWater);
  const session = useAppStore((s) => s.session);
  const startSession = useAppStore((s) => s.startSession);
  const restartSession = useAppStore((s) => s.restartSession);

  const [domainResume, setDomainResume] = useState<{
    planId: string;
    done: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    if (session) {
      setDomainResume(null);
      return;
    }
    let cancelled = false;
    void peekDomainResumable().then((ds) => {
      if (cancelled || !ds) {
        if (!cancelled) setDomainResume(null);
        return;
      }
      const planId = planIdFromTemplateRevision(ds.templateRevisionId);
      if (!planId || !planById(planId)) {
        setDomainResume(null);
        return;
      }
      const sets = uiSetsFromDomain(ds);
      const { done, total } = countSets(sets);
      setDomainResume({ planId, done, total });
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const today = todayKey();
  const doneToday = workouts.some((w) => w.date === today && w.completed);
  const doneDates = workouts.filter((w) => w.completed).map((w) => w.date);
  const streak = (() => {
    let n = 0;
    const d = new Date();
    for (;;) {
      const k = todayKey(d);
      if (!doneDates.includes(k)) break;
      n += 1;
      d.setDate(d.getDate() - 1);
    }
    return n;
  })();

  const plan = pickTodayPlan(PLANS, EXERCISES, profile, new Date());
  const restDay = !plan;
  const line = coachLine({
    name: profile.name,
    goal: profile.goal,
    doneToday,
    restDay,
    streak,
  });

  const preview = plan ? planExercises(plan).slice(0, 3) : [];

  const livePlanId = session?.planId ?? domainResume?.planId ?? null;
  const livePlan = livePlanId ? planById(livePlanId) : undefined;
  const liveCounts = session
    ? countSets(session.setsDone)
    : domainResume
      ? { done: domainResume.done, total: domainResume.total }
      : null;

  const waterMl = waterByDate[today] ?? 0;
  const recovery = useMemo(() => {
    const todayMeals = meals.filter((m) => m.date === today);
    const macros = dayMacros(todayMeals, FOODS);
    return analyzeRecovery({
      workouts,
      intakeKcal: macros.kcal,
      intakeProteinG: macros.protein,
      targetKcal: profile.calorieGoal,
      targetProteinG: profile.proteinGoal,
      waterLogsMl: waterMl,
      waterGoalMl: 2500,
    });
  }, [meals, workouts, today, profile.calorieGoal, profile.proteinGoal, waterMl]);

  const snapshot = useMemo((): UserContextSnapshot => {
    const todayMeals = meals.filter((m) => m.date === today);
    const macros = dayMacros(todayMeals, FOODS);
    const last = [...workouts].reverse().find((w) => w.completed);
    const lastPlan = last ? planById(last.planId) : undefined;
    let burned = 0;
    if (doneToday && plan) {
      burned = planExercises(plan).reduce((sum, ex) => {
        const workSec = ex.unit === "sec" ? ex.reps * ex.sets : ex.reps * ex.sets * 3;
        return sum + calculateBurnedCalories(metForExercise(ex.id), profile.weightKg, workSec / 60);
      }, 0);
    }
    return {
      userProfile: {
        weightKg: profile.weightKg,
        heightCm: profile.heightCm,
        age: profile.age,
        gender: profile.presentation === "woman" ? "female" : "male",
      },
      dailyMetrics: {
        consumedCalories: macros.kcal,
        targetCalories: profile.calorieGoal,
        burnedCalories: burned,
      },
      lastWorkout: lastPlan
        ? { name: lastPlan.title, completedAt: last!.date, rpeScore: 7 }
        : undefined,
    };
  }, [meals, workouts, today, doneToday, plan, profile]);

  const [advice, setAdvice] = useState("");
  useEffect(() => {
    let cancelled = false;
    CoachEngine.getTrainer()
      .generateAdvice(snapshot, doneToday ? "тренировка" : "совет на день")
      .then((text) => {
        if (!cancelled) setAdvice(text);
      });
    return () => {
      cancelled = true;
    };
  }, [snapshot, doneToday]);

  function continueLive() {
    if (!livePlan) return;
    startSession(livePlan.id);
    void navigate({ to: "/play/$planId", params: { planId: livePlan.id } });
  }

  function restartLive() {
    if (!livePlan) return;
    restartSession(livePlan.id);
    void navigate({ to: "/play/$planId", params: { planId: livePlan.id } });
  }

  return (
    <div className="px-5 pb-8 pt-10">
      <header className="mb-6">
        <p className="text-sm text-muted">{greeting(profile.name)}</p>
        <h1 className="mt-1 font-display text-2xl tracking-tight">FORMA</h1>
      </header>

      <div className="mb-4 rounded-2xl bg-surface p-4 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Восстановление</p>
            <p className="mt-1 font-display text-3xl tracking-tight">{recovery.recoveryScore}%</p>
            <p className="mt-1 text-sm text-accent">{recovery.statusLabel}</p>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-right text-xs text-muted">
            <span>Мышцы {recovery.muscularReadiness}</span>
            <span>Энергия {recovery.energyRestoration}</span>
            <span>ЦНС {recovery.cnsFreshness}</span>
            <span>Вода {recovery.hydrationScore}</span>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-fg">{recovery.recommendationTitle}</p>
        <p className="mt-1 text-sm text-muted">{recovery.recommendationDescription}</p>
        <p className="mt-2 text-xs text-muted">{recovery.nutritionAdvice}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-surface-2 pt-3">
          <span className="text-xs text-muted">
            Вода {(waterMl / 1000).toFixed(1)} / 2.5 л
          </span>
          {[250, 500].map((ml) => (
            <button
              key={ml}
              type="button"
              className="rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-fg"
              onClick={() => addWater(ml)}
            >
              +{ml} мл
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 rounded-2xl bg-surface p-4 shadow-card">
        <p className="text-sm leading-relaxed text-fg">{line}</p>
        <div className="mt-4">
          <WeekDots doneDates={doneDates} />
        </div>
        {advice && (
          <p className="mt-4 border-t border-surface-2 pt-3 text-sm leading-relaxed text-muted">
            {advice}
          </p>
        )}
      </div>

      {livePlan && liveCounts && (
        <div className="mb-4 rounded-2xl bg-surface p-4 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wide text-accent">Не закончена</p>
          <h2 className="mt-1 font-display text-lg">{livePlan.title}</h2>
          <p className="mt-1 text-sm text-muted">
            {liveCounts.done}/{liveCounts.total} подходов
            {session ? ` · шаг ${session.exerciseIndex + 1}/${livePlan.exerciseIds.length}` : ""}
          </p>
          <div className="mt-3 flex gap-2">
            <Button className="flex-1" onClick={continueLive}>
              Продолжить
            </Button>
            <Button variant="secondary" className="flex-1" onClick={restartLive}>
              Заново
            </Button>
          </div>
        </div>
      )}

      {plan ? (
        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-xl">{plan.title}</h2>
              <p className="text-sm text-muted">
                {plan.focus} · {plan.minutes} мин
              </p>
            </div>
            {doneToday && (
              <span className="rounded-full bg-accent-soft px-3 py-1 text-xs text-accent">Готово</span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {preview.map((ex) => (
              <ExerciseCard key={ex.id} exercise={ex} compact />
            ))}
          </div>

          <Link to="/play/$planId" params={{ planId: plan.id }}>
            <Button className="w-full" size="lg" disabled={doneToday}>
              {doneToday ? "Уже сделано сегодня" : "Начать тренировку"}
            </Button>
          </Link>

          <div className="pt-2">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Другие планы</p>
            <ul className="space-y-2">
              {PLANS.filter((p) => p.id !== plan.id)
                .slice(0, 3)
                .map((p) => (
                  <li key={p.id}>
                    <Link
                      to="/play/$planId"
                      params={{ planId: p.id }}
                      className="flex items-center justify-between rounded-lg bg-surface-2 px-4 py-3 text-sm"
                    >
                      <span>{p.title}</span>
                      <span className="text-muted">{p.minutes} мин</span>
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl bg-surface p-6 text-center shadow-card">
          <p className="font-display text-lg">День отдыха</p>
          <p className="mt-2 text-sm text-muted">
            Можно пройтись или сделать мягкую сессию из списка планов.
          </p>
          <ul className="mt-4 space-y-2 text-left">
            {PLANS.filter((p) => p.optional || p.minutes <= 15).map((p) => (
              <li key={p.id}>
                <Link
                  to="/play/$planId"
                  params={{ planId: p.id }}
                  className="flex items-center justify-between rounded-lg bg-surface-2 px-4 py-3 text-sm"
                >
                  <span>{p.title}</span>
                  <span className="text-muted">{p.minutes} мин</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
