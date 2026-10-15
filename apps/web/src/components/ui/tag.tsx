import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "default" | "accent" | "warn";

/** Pill label — Bulma-inspired tag. */
export function Tag({
  className,
  tone = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "fp-tag",
        tone === "accent" && "is-accent",
        tone === "warn" && "is-warn",
        className,
      )}
      {...props}
    />
  );
}

export function Tags({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("fp-tags", className)} {...props} />;
}
