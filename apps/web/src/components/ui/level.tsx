import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Horizontal metric row — Bulma-inspired level. */
export function Level({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("fp-level", className)} {...props} />;
}

export function LevelItem({
  className,
  heading,
  title,
  ...props
}: HTMLAttributes<HTMLDivElement> & { heading?: string; title?: ReactNode }) {
  return (
    <div className={cn("fp-level-item", className)} {...props}>
      {heading ? <span className="heading">{heading}</span> : null}
      {title != null ? <span className="title">{title}</span> : null}
      {props.children}
    </div>
  );
}
