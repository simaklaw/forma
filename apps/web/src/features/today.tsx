import { Link, useNavigate } from "@tanstack/react-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  analyzeRecovery,
  buildCoachBrief,
} from "@forma/core";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Tag, Tags } from "@/components/ui/tag";
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

function recoveryRingColor(status: string): string {
  switch (status) {
    case "peak":
      return "var(--color-ok)";
    case "ready":
      return "var(--color-accent)";
    case "active_recovery_recommended":
      return "var(--color-warn)";
    case "rest_required":
      return "var(--color-danger)";
    default:
      return "var(--color-accent)";
  }
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
  const todayIsResumable = Boolean(plan && livePlan && plan.id === livePlan.id);

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

  const coachBrief = useMemo(
    () => buildCoachBrief(recovery, plan?.title ?? "план дня"),
    [recovery, plan?.title],
  );

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

      <Box className="animate-rise mb-4 fp-block">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-accent">
              FitPulse · {coachBrief.readinessLabel} · offline
            </p>
            <p className="mt-1 text-sm leading-snug text-fg line-clamp-2">{coachBrief.summary}</p>
            <p className="mt-1 text-sm font-medium text-fg line-clamp-2">
              {doneToday ? coachBrief.restAdvice : coachBrief.workoutAdvice}
            </p>
          </div>
          <div
            className="recovery-score-ring shrink-0"
            style={
              {
                "--ring-pct": recovery.recoveryScore,
                "--ring-color": recoveryRingColor(recovery.status),
              } as React.CSSProperties
            }
            aria-label={`Восстановление ${recovery.recoveryScore} процентов`}
          >
            <span>{recovery.recoveryScore}%</span>
          </div>
        </div>
        <Tags className="mt-3">
          {coachBrief.actionItems.map((item) => (
            <Tag key={item} tone="accent">
              {item}
            </Tag>
          ))}
        </Tags>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <span className="text-xs text-muted tabular-nums">
            Вода {(waterMl / 1000).toFixed(1)} / 2.5 л
          </span>
          {[250, 500].map((ml) => (
            <Button
              key={ml}
              type="button"
              variant="soft"
              size="pill"
              onClick={() => addWater(ml)}
            >
              +{ml} мл
            </Button>
          ))}
        </div>
      </Box>

      <Box className="mb-6 fp-block">
        <p className="text-sm leading-relaxed text-fg">{line}</p>
        <div className="mt-4">
          <WeekDots doneDates={doneDates} />
        </div>
      </Box>

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
            {doneToday && !todayIsResumable && (
              <span className="rounded-full bg-accent-soft px-3 py-1 text-xs text-accent">Готово</span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {preview.map((ex) => (
              <ExerciseCard key={ex.id} exercise={ex} compact />
            ))}
          </div>

          {todayIsResumable ? (
            <Button className="w-full" size="lg" onClick={continueLive}>
              Продолжить тренировку
            </Button>
          ) : (
            <Link to="/play/$planId" params={{ planId: plan.id }}>
              <Button className="w-full" size="lg" disabled={doneToday}>
                {doneToday ? "Уже сделано сегодня" : "Начать тренировку"}
              </Button>
            </Link>
          )}

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
