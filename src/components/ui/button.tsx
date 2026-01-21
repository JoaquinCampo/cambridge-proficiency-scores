import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "~/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";

type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--accent)] text-white shadow-[0_8px_18px_rgba(139,30,63,0.25)] hover:bg-[color-mix(in_oklab,var(--accent)_90%,black)]",
  secondary:
    "bg-[var(--accent-2)] text-white shadow-[0_8px_18px_rgba(15,76,92,0.25)] hover:bg-[color-mix(in_oklab,var(--accent-2)_90%,black)]",
  ghost:
    "bg-transparent text-[var(--ink)] hover:bg-[color-mix(in_oklab,var(--ink)_6%,transparent)]",
  outline:
    "border border-[color-mix(in_oklab,var(--ink)_25%,transparent)] text-[var(--ink)] hover:bg-[color-mix(in_oklab,var(--ink)_6%,transparent)]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      asChild = false,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-[0.01em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:pointer-events-none disabled:opacity-60",
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
