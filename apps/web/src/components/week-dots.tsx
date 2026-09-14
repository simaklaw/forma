import { WEEKDAYS, todayKey } from "@/lib/forma";
import { cn } from "@/lib/utils";

export function WeekDots({ doneDates }: { doneDates: string[] }) {
  const today = todayKey();
  const set = new Set(doneDates);
  return (
    <ul className="flex justify-between gap-1">
      {WEEKDAYS.map((day) => {
        const date = dateForWeekday(day.i);
        const done = set.has(date);
        const isToday = date === today;
        return (
          <li key={day.i} className="flex flex-1 flex-col items-center gap-1">
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-xs font-medium tabular-nums",
                done && "bg-accent text-accent-fg",
                !done && isToday && "bg-accent-soft text-accent",
                !done && !isToday && "bg-surface-2 text-muted",
              )}
            >
              {day.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function dateForWeekday(i: number): string {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const offset = i === 0 ? 6 : i - 1;
  const d = new Date(monday);
  d.setDate(monday.getDate() + offset);
  return todayKey(d);
}
