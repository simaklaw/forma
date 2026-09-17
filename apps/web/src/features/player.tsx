import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { calculateBurnedCalories, metForExercise } from "@forma/core";
import { Button } from "@/components/ui/button";
import { planById, planExercises } from "@/lib/catalog";
import { canMarkSet, expectedExerciseId } from "@/lib/session-logic.ts";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function PlayerScreen({ planId }: { planId: string }) {
  const navigate = useNavigate();
  const profile = useAppStore((s) => s.profile);
  const session = useAppStore((s) => s.session);
  const startSession = useAppStore((s) => s.startSession);
  const toggleSet = useAppStore((s) => s.toggleSet);
  const goToExercise = useAppStore((s) => s.goToExercise);
  const nextExercise = useAppStore((s) => s.nextExercise);
  const prevExercise = useAppStore((s) => s.prevExercise);
  const clearRest = useAppStore((s) => s.clearRest);
  const endSession = useAppStore((s) => s.endSession);

  const plan = planById(planId);
  const exercises = plan ? planExercises(plan) : [];

  useEffect(() => {
    if (!plan) return;
    if (!session || session.planId !== planId) startSession(planId);
  }, [planId, plan, session, startSession]);

  const idx = session?.exerciseIndex ?? 0;
  const ex = exercises[Math.min(idx, Math.max(0, exercises.length - 1))];

  const expectedId =
    session && plan ? expectedExerciseId(session.planId, session.setsDone) : null;
  const sequentialMismatch = Boolean(expectedId && ex && expectedId !== ex.id);
  const expectedName =
    sequentialMismatch && expectedId
      ? exercises.find((e) => e.id === expectedId)?.name
      : null;
  const expectedIndex =
    sequentialMismatch && expectedId && plan
      ? plan.exerciseIds.indexOf(expectedId)
      : -1;

  const estKcal = useMemo(() => {
    if (!ex) return 0;
    const met = metForExercise(ex.id);
    const workSec = ex.unit === "sec" ? ex.reps * ex.sets : ex.reps * ex.sets * 3;
    const minutes = Math.max(0.5, workSec / 60);
    return calculateBurnedCalories(met, profile.weightKg, minutes);
  }, [ex, profile.weightKg]);

  if (!plan || !exercises.length || !ex) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5">
        <p>План не найден</p>
        <Button onClick={() => navigate({ to: "/" })}>Назад</Button>
      </div>
    );
  }

  const sets = session?.setsDone[ex.id] ?? Array(ex.sets).fill(false);
  const allDone = sets.every(Boolean);
  const restEndsAt = session?.restEndsAt ?? null;

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="flex items-center justify-between px-4 pt-4">
        <button
          type="button"
          className="flex size-11 items-center justify-center rounded-md bg-surface-2"
          aria-label="Закрыть"
          onClick={() => {
            navigate({ to: "/" });
          }}
        >
          <X className="size-5" />
        </button>
        <p className="text-sm text-muted">
          {idx + 1} / {exercises.length}
        </p>
        <button
          type="button"
          className="text-sm text-accent"
          onClick={() => {
            endSession(true);
            navigate({ to: "/" });
          }}
        >
          Готово
        </button>
      </header>

      <div className="relative mt-3 aspect-[4/5] w-full overflow-hidden bg-black">
        <video
          key={ex.id}
          src={ex.video}
          poster={ex.poster}
          className="size-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          controls
        />
        {restEndsAt && <RestOverlay endsAt={restEndsAt} onDone={clearRest} />}
      </div>

      <div className="flex-1 px-5 pt-4">
        {sequentialMismatch && expectedName && (
          <div className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            Сначала: <span className="font-medium">{expectedName}</span>. Подходы
            записываются по порядку упражнений.
            {expectedIndex >= 0 && (
              <button
                type="button"
                className="mt-2 block text-sm font-medium text-accent underline"
                onClick={() => goToExercise(expectedIndex)}
              >
                Перейти к упражнению
              </button>
            )}
          </div>
        )}
        <h1 className="font-display text-xl">{ex.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {ex.sets} × {ex.reps} {ex.unit === "sec" ? "сек" : "повт"} · отдых {ex.restSec} с
          {" · ~"}
          {estKcal} ккал
        </p>
        <ul className="mt-3 space-y-1 text-sm text-muted">
          {ex.cues.map((c) => (
            <li key={c}>· {c}</li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap gap-2">
          {sets.map((done, i) => {
            const allowed = session ? canMarkSet(session, ex.id, i) : false;
            return (
              <button
                key={i}
                type="button"
                disabled={!allowed}
                onClick={() => {
                  if (!allowed) return;
                  // Rest timer comes from toggleSet → domain restEndsAtMs.
                  toggleSet(ex.id, i);
                }}
                className={cn(
                  "flex size-12 items-center justify-center rounded-full text-sm font-medium",
                  done ? "bg-accent text-accent-fg" : "bg-surface-2 text-fg",
                  !allowed && "opacity-40",
                )}
              >
                {done ? <Check className="size-5" /> : i + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3 px-5 pb-8 pt-2">
        <Button variant="secondary" size="icon" onClick={prevExercise} disabled={idx === 0}>
          <ChevronLeft className="size-5" />
        </Button>
        <Button
          className="flex-1"
          onClick={() => {
            if (idx >= exercises.length - 1) {
              endSession(true);
              navigate({ to: "/" });
            } else {
              nextExercise();
            }
          }}
        >
          {idx >= exercises.length - 1
            ? allDone
              ? "Завершить"
              : "Пропустить и завершить"
            : "Следующее"}
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={nextExercise}
          disabled={idx >= exercises.length - 1}
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>
    </div>
  );
}

function RestOverlay({ endsAt, onDone }: { endsAt: number; onDone: () => void }) {
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
  const raf = useRef(0);

  useEffect(() => {
    const tick = () => {
      const s = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setLeft(s);
      if (s <= 0) onDone();
      else raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [endsAt, onDone]);

  const total = 60;
  const pct = Math.min(1, left / total);

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-scrim text-white">
      <div className="relative flex size-36 items-center justify-center">
        <div
          className="animate-breathe absolute inset-0 rounded-full border-2 border-white/40"
          style={{ transform: `scale(${0.85 + pct * 0.2})` }}
        />
        <span className="font-display text-5xl tabular-nums">{left}</span>
      </div>
      <p className="mt-4 text-sm text-white/80">Отдых · дыши</p>
      <button type="button" className="mt-6 text-sm underline" onClick={onDone}>
        Пропустить
      </button>
    </div>
  );
}
