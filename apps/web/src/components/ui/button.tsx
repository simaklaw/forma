import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium select-none transition-[transform,background-color,opacity] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-40 active:not-disabled:scale-[0.96]",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg",
        secondary: "bg-surface-2 text-fg shadow-card",
        ghost: "bg-transparent text-fg",
        danger: "bg-danger/10 text-danger",
      },
      size: {
        sm: "h-10 rounded-md px-4 text-sm",
        md: "h-12 rounded-md px-5 text-sm",
        lg: "h-14 rounded-lg px-6 text-base",
        icon: "size-11 rounded-md",
        pill: "h-10 rounded-full px-4 text-sm",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
export { buttonVariants };
