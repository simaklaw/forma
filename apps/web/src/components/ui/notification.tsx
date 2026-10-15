import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "default" | "accent" | "warn" | "danger";

/** Soft status banner — Bulma-inspired notification. */
export function Notification({
  className,
  tone = "default",
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: Tone }) {
  return (
    <div
      role="status"
      className={cn(
        "fp-notification",
        tone === "accent" && "is-accent",
        tone === "warn" && "is-warn",
        tone === "danger" && "is-danger",
        className,
      )}
      {...props}
    />
  );
}
