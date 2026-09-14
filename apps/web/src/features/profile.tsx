import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EQUIP_LABEL, GOAL_LABEL, PRESENT_LABEL } from "@/lib/forma";
import { useAppStore } from "@/lib/store";
import type { ThemeMode } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProfileScreen() {
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const resetAll = useAppStore((s) => s.resetAll);

  const themes: { id: ThemeMode; label: string }[] = [
    { id: "system", label: "Системная" },
    { id: "light", label: "Светлая" },
    { id: "dark", label: "Тёмная" },
  ];

  return (
    <div className="px-5 pb-8 pt-10">
      <h1 className="font-display text-2xl tracking-tight">Профиль</h1>

      <section className="mt-6 rounded-2xl bg-surface p-4 shadow-card">
        <p className="text-sm text-muted">Имя</p>
        <p className="font-display text-xl">{profile.name || "Друг"}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted">Презентация</dt>
            <dd>{PRESENT_LABEL[profile.presentation]}</dd>
          </div>
          <div>
            <dt className="text-muted">Цель</dt>
            <dd>{GOAL_LABEL[profile.goal]}</dd>
          </div>
          <div>
            <dt className="text-muted">Минуты</dt>
            <dd>{profile.minutes}</dd>
          </div>
          <div>
            <dt className="text-muted">Вес</dt>
            <dd>{profile.weightKg} кг</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-muted">Оборудование</dt>
            <dd>
              {profile.equipment.length
                ? profile.equipment.map((e) => EQUIP_LABEL[e]).join(", ")
                : "Только вес тела"}
            </dd>
          </div>
        </dl>
        <div className="mt-4 rounded-lg bg-surface-2 p-3 text-sm">
          <p className="text-muted">Норма на день</p>
          <p className="mt-1 tabular-nums">
            {profile.calorieGoal} ккал · Б {profile.proteinGoal} · Ж {profile.fatGoal} · У{" "}
            {profile.carbsGoal}
          </p>
        </div>
      </section>

      <section className="mt-4 rounded-2xl bg-surface p-4 shadow-card">
        <p className="mb-3 text-sm font-medium">Тема</p>
        <div className="flex gap-2">
          {themes.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setProfile({ theme: t.id })}
              className={cn(
                "flex-1 rounded-lg py-2.5 text-sm font-medium",
                profile.theme === t.id ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-dashed border-border bg-surface/50 p-4">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 size-4 text-muted" />
          <div>
            <p className="text-sm font-medium">FORMA Pro</p>
            <p className="mt-1 text-sm text-muted">
              Персональные планы, синхронизация с wger и облачные фото — скоро.
            </p>
          </div>
        </div>
      </section>

      <Button
        variant="danger"
        className="mt-8 w-full"
        onClick={() => {
          if (confirm("Сбросить все данные на этом устройстве?")) resetAll();
        }}
      >
        Сбросить данные
      </Button>
    </div>
  );
}
