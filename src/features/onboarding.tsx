import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { calcGoals, EQUIP_LABEL, GOAL_LABEL, PRESENT_LABEL, WEEKDAYS } from "@/lib/forma";
import { useAppStore } from "@/lib/store";
import type { Equipment, Goal, Presentation } from "@/lib/types";
import { cn } from "@/lib/utils";

const GOALS: Goal[] = ["energy", "tone", "strength", "recovery"];
const PRES: Presentation[] = ["woman", "man", "neutral"];
const EQUIP: Equipment[] = ["bands", "dumbbells", "pullup", "chair"];
const MINUTES = [15, 25, 40] as const;

export function OnboardingScreen() {
  const complete = useAppStore((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [presentation, setPresentation] = useState<Presentation>("neutral");
  const [goal, setGoal] = useState<Goal>("energy");
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [minutes, setMinutes] = useState<(typeof MINUTES)[number]>(25);
  const [days, setDays] = useState<number[]>([1, 3, 5]);
  const [heightCm, setHeightCm] = useState(170);
  const [weightKg, setWeightKg] = useState(70);
  const [age, setAge] = useState(30);

  const macros = useMemo(
    () => calcGoals({ presentation, weightKg, heightCm, age, goal }),
    [presentation, weightKg, heightCm, age, goal],
  );

  const toggleDay = (i: number) =>
    setDays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i].sort()));
  const toggleEquip = (e: Equipment) =>
    setEquipment((list) => (list.includes(e) ? list.filter((x) => x !== e) : [...list, e]));

  const finish = () => {
    complete({
      name: name.trim() || "Друг",
      presentation,
      goal,
      equipment,
      minutes,
      days,
      heightCm,
      weightKg,
      age,
    });
  };

  const steps: ReactNode[] = [
    <Step key="name" title="Как к тебе обращаться?">
      <input
        className="h-14 w-full rounded-lg bg-surface-2 px-4 text-lg outline-none ring-accent focus:ring-2"
        placeholder="Имя"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
      <p className="mt-3 text-sm text-muted">Можно оставить пустым — будет «друг».</p>
    </Step>,
    <Step key="pres" title="Презентация">
      <div className="grid gap-2">
        {PRES.map((p) => (
          <Choice key={p} active={presentation === p} onClick={() => setPresentation(p)}>
            {PRESENT_LABEL[p]}
          </Choice>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted">Влияет на расчёт калорий и тон подсказок.</p>
    </Step>,
    <Step key="goal" title="Главная цель">
      <div className="grid gap-2">
        {GOALS.map((g) => (
          <Choice key={g} active={goal === g} onClick={() => setGoal(g)}>
            {GOAL_LABEL[g]}
          </Choice>
        ))}
      </div>
    </Step>,
    <Step key="equip" title="Что есть дома?">
      <div className="grid grid-cols-2 gap-2">
        {EQUIP.map((e) => (
          <Choice key={e} active={equipment.includes(e)} onClick={() => toggleEquip(e)}>
            {EQUIP_LABEL[e]}
          </Choice>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted">Можно ничего не выбирать — только вес тела.</p>
    </Step>,
    <Step key="time" title="Сколько минут в день?">
      <div className="grid grid-cols-3 gap-2">
        {MINUTES.map((m) => (
          <Choice key={m} active={minutes === m} onClick={() => setMinutes(m)}>
            {m} мин
          </Choice>
        ))}
      </div>
    </Step>,
    <Step key="days" title="В какие дни?">
      <div className="flex flex-wrap gap-2">
        {WEEKDAYS.map((d) => (
          <button
            key={d.i}
            type="button"
            onClick={() => toggleDay(d.i)}
            className={cn(
              "flex size-11 items-center justify-center rounded-full text-sm font-medium",
              days.includes(d.i) ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted",
            )}
          >
            {d.label}
          </button>
        ))}
      </div>
    </Step>,
    <Step key="body" title="Рост, вес, возраст">
      <div className="grid gap-3">
        <Num label="Рост, см" value={heightCm} set={setHeightCm} min={140} max={220} />
        <Num label="Вес, кг" value={weightKg} set={setWeightKg} min={40} max={160} />
        <Num label="Возраст" value={age} set={setAge} min={14} max={80} />
      </div>
      <div className="mt-4 rounded-xl bg-surface-2 p-4 text-sm">
        <p className="text-muted">Ориентир на день</p>
        <p className="mt-1 font-display text-xl tabular-nums">{macros.kcal} ккал</p>
        <p className="mt-1 text-muted">
          Б {macros.protein} · Ж {macros.fat} · У {macros.carbs}
        </p>
      </div>
    </Step>,
  ];

  const last = step === steps.length - 1;

  return (
    <div className="flex min-h-dvh flex-col px-5 pb-8 pt-12">
      <div className="mb-8 flex gap-1.5">
        {steps.map((_, i) => (
          <span
            key={i}
            className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-accent" : "bg-surface-2")}
          />
        ))}
      </div>
      <div className="flex-1 animate-rise">{steps[step]}</div>
      <div className="mt-6 flex gap-3">
        {step > 0 && (
          <Button variant="secondary" className="flex-1" onClick={() => setStep((s) => s - 1)}>
            Назад
          </Button>
        )}
        <Button className="flex-1" onClick={() => (last ? finish() : setStep((s) => s + 1))}>
          {last ? "Начать" : "Дальше"}
        </Button>
      </div>
    </div>
  );
}

function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h1 className="font-display text-2xl tracking-tight">{title}</h1>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg px-4 py-3.5 text-left text-sm font-medium transition-colors",
        active ? "bg-accent text-accent-fg" : "bg-surface-2 text-fg",
      )}
    >
      {children}
    </button>
  );
}

function Num({
  label,
  value,
  set,
  min,
  max,
}: {
  label: string;
  value: number;
  set: (n: number) => void;
  min: number;
  max: number;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-lg bg-surface-2 px-4 py-3">
      <span className="text-sm text-muted">{label}</span>
      <input
        type="number"
        className="w-20 bg-transparent text-right text-lg tabular-nums outline-none"
        value={value}
        min={min}
        max={max}
        onChange={(e) => set(Number(e.target.value) || min)}
      />
    </label>
  );
}
