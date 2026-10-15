import type { HTMLAttributes, ElementRef } from "react";
import { forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type Tone = "default" | "accent" | "warn";

/** Pill label — Bulma-inspired tag. */
export const Tag = forwardRef<ElementRef<typeof Slot>, HTMLAttributes<HTMLSpanElement> & { tone?: Tone; asChild?: boolean }>(
  (props, ref) => {
    const { className, tone = "default", asChild = false, ...rest } = props;
    const Comp = asChild ? Slot : "span";
    return (
      <Comp
        ref={ref}
        className={cn(
          "fp-tag",
          tone === "accent" && "is-accent",
          tone === "warn" && "is-warn",
          className,
        )}
        {...rest}
      />
    );
  }
);
Tag.displayName = "Tag";

export function Tags({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("fp-tags", className)} {...props} />;
}
