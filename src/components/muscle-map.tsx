import type { MuscleRegion } from "@/lib/types";
import { cn } from "@/lib/utils";

const REGIONS: { id: MuscleRegion; label: string }[] = [
  { id: "shoulders", label: "Плечи" },
  { id: "chest", label: "Грудь" },
  { id: "arms", label: "Руки" },
  { id: "back", label: "Спина" },
  { id: "core", label: "Кор" },
  { id: "glutes", label: "Ягодицы" },
  { id: "legs", label: "Ноги" },
];

export function MuscleWeek({ hit }: { hit: MuscleRegion[] }) {
  const set = new Set(hit);
  return (
    <div className="grid grid-cols-2 gap-2">
      {REGIONS.map((region) => {
        const on = set.has(region.id);
        return (
          <div
            key={region.id}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm",
              on ? "bg-accent-soft text-accent" : "bg-surface-2 text-muted",
            )}
          >
            <span className={cn("size-2 rounded-full", on ? "bg-accent" : "bg-border")} />
            {region.label}
          </div>
        );
      })}
    </div>
  );
}
