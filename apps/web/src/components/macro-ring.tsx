import { cn } from "@/lib/utils";

type Props = { value: number; max: number; label: string; size?: number; className?: string };

export function MacroRing({ value, max, label, size = 128, className }: Props) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max <= 0 ? 0 : Math.min(1.15, value / max);
  const offset = c * (1 - Math.min(1, pct));
  const over = value > max && max > 0;
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={over ? "var(--color-warn)" : "var(--color-accent)"}
          strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl tabular-nums leading-none text-fg">{Math.round(value)}</span>
        <span className="mt-1 text-[11px] text-muted">{label}</span>
      </div>
    </div>
  );
}
