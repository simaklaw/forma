import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  before: string | null;
  after: string | null;
  onPick: (slot: "before" | "after", file: File) => void;
};

export function CompareSlider({ before, after, onPick }: Props) {
  const [split, setSplit] = useState(50);
  const ready = before && after;
  return (
    <div className="overflow-hidden rounded-xl bg-surface-2 shadow-card">
      {ready ? (
        <div className="relative aspect-[4/5] select-none">
          <img src={after!} alt="После" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 overflow-hidden" style={{ width: `${split}%` }}>
            <img
              src={before!}
              alt="До"
              className="absolute inset-0 size-full object-cover"
              style={{ width: `${10000 / split}%`, maxWidth: "none" }}
            />
          </div>
          <div className="absolute inset-y-0 z-10 w-px bg-white" style={{ left: `${split}%` }} aria-hidden />
          <input
            type="range" min={2} max={98} value={split} aria-label="Сравнить фото"
            onChange={(e) => setSplit(Number(e.target.value))}
            className="absolute inset-0 z-20 cursor-ew-resize opacity-0"
          />
          <span className="absolute left-3 top-3 rounded-full bg-black/45 px-2 py-0.5 text-[11px] text-white">Было</span>
          <span className="absolute right-3 top-3 rounded-full bg-black/45 px-2 py-0.5 text-[11px] text-white">Стало</span>
        </div>
      ) : (
        <div className="flex aspect-[4/5] flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="font-display text-lg text-fg">Жест «было / стало»</p>
          <p className="text-sm text-muted">Добавь два фото — линия покажет разницу.</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 p-3">
        <FilePick label="Неделя 1" filled={Boolean(before)} onFile={(f) => onPick("before", f)} />
        <FilePick label="Сейчас" filled={Boolean(after)} onFile={(f) => onPick("after", f)} />
      </div>
    </div>
  );
}

function FilePick({ label, filled, onFile }: { label: string; filled: boolean; onFile: (file: File) => void }) {
  return (
    <label
      className={cn(
        "flex h-11 cursor-pointer items-center justify-center rounded-md text-sm font-medium",
        filled ? "bg-accent-soft text-accent" : "bg-surface text-fg shadow-card",
      )}
    >
      {label}
      <input
        type="file" accept="image/*" className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />
    </label>
  );
}
