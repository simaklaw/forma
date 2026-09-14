import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/lib/types";

type Props = {
  exercise: Exercise;
  className?: string;
  video?: boolean;
  compact?: boolean;
  onClick?: () => void;
  onLongPress?: () => void;
};

export function ExerciseCard({ exercise, className, video, compact, onClick, onLongPress }: Props) {
  let timer: number | undefined;
  const startPress = () => {
    if (!onLongPress) return;
    timer = window.setTimeout(() => onLongPress(), 420);
  };
  const clearPress = () => {
    if (timer) window.clearTimeout(timer);
  };
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={startPress}
      onPointerUp={clearPress}
      onPointerLeave={clearPress}
      onPointerCancel={clearPress}
      className={cn(
        "group relative block w-full overflow-hidden rounded-xl text-left shadow-card",
        compact ? "aspect-[4/5]" : "aspect-[5/4]",
        className,
      )}
    >
      {video ? (
        <video src={exercise.video} poster={exercise.poster} className="absolute inset-0 size-full object-cover" autoPlay muted loop playsInline preload="metadata" />
      ) : (
        <img src={exercise.poster} alt="" className="absolute inset-0 size-full object-cover outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="font-display text-base font-medium tracking-tight text-white">{exercise.name}</p>
        <p className="mt-0.5 text-xs text-white/75">{exercise.muscles.join(" · ")}</p>
      </div>
      <span className="absolute left-3 top-3 flex size-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm">
        <Play className="size-4" fill="currentColor" style={{ marginLeft: 2 }} />
      </span>
    </button>
  );
}
