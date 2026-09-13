import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ExerciseCard } from "@/components/exercise-card";
import { WeekDots } from "@/components/week-dots";
import { PLANS, planExercises } from "@/lib/catalog";
import {
  coachLine,
  greeting,
  pickTodayPlan,
  todayKey,
  weekKeys,
} from "@/lib/forma";
import { EXERCISES } from "@/lib/catalog";
import { useAppStore } from "@/lib/store";

export function TodayScreen() {
  const profile = useAppStore((s) => s.profile);
  const workouts = useAppStore((s) => s.workouts);
  const session = useAppStore((s) => s.session);

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

  return (
    <div className="px-5 pb-8 pt-10">
      <header className="mb-6">
        <p className="text-sm text-muted">{greeting(profile.name)}</p>
        <h1 className="mt-1 font-display text-2xl tracking-tight">FORMA</h1>
      </header>

      <div className="mb-6 rounded-2xl bg-surface p-4 shadow-card">
        <p className="text-sm leading-relaxed text-fg">{line}</p>
        <div className="mt-4">
          <WeekDots doneDates={doneDates} />
        </div>
      </div>

      {session && (
        <Link to="/play/$planId" params={{ planId: session.planId }} className="mb-4 block">
          <div className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">
            Сессия не закончена — продолжить
          </div>
        </Link>
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
