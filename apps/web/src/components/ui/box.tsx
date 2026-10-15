import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Elevated surface — Bulma-inspired box, FitPulse tokens. */
export function Box({
  className,
  compact,
  ...props
}: HTMLAttributes<HTMLDivElement> & { compact?: boolean }) {
  return (
    <div
      className={cn("fp-box", compact && "is-compact", className)}
      {...props}
    />
  );
}
