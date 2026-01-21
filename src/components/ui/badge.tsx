import * as React from "react";

import { cn } from "~/lib/utils";

type BadgeVariant = "accent" | "muted" | "success" | "warning";

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const badgeStyles: Record<BadgeVariant, string> = {
  accent: "bg-[var(--accent)] text-white",
  muted: "bg-[color-mix(in_oklab,var(--ink)_8%,transparent)] text-[var(--ink)]",
  success: "bg-[var(--accent-2)] text-white",
  warning: "bg-[var(--gold)] text-white",
};

export const Badge = ({ className, variant = "muted", ...props }: BadgeProps) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]",
      badgeStyles[variant],
      className,
    )}
    {...props}
  />
);
