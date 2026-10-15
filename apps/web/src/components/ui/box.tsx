import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BoxVariant = "default" | "dashed";

/** Elevated surface — Bulma-inspired box, FitPulse tokens. */
export function Box({
  className,
  compact,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLDivElement> & { compact?: boolean; variant?: BoxVariant }) {
  return (
    <div
      className={cn(
        "fp-box",
        compact && "is-compact",
        variant === "dashed" && "fp-box--dashed",
        className
      )}
      {...props}
    />
  );
}
