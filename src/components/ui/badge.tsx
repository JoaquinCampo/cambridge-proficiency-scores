import * as React from "react";

import { cn } from "~/lib/utils";

type BadgeVariant = "accent" | "muted" | "success" | "warning";

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const badgeStyles: Record<BadgeVariant, string> = {
  accent: "bg-[var(--accent)] text-white",
  muted: "bg-[var(--surface)] text-[#7A7A7A]",
  success: "bg-[var(--accent-2)] text-white",
  warning: "bg-[#F59E0B] text-white",
};

export const Badge = ({ className, variant = "muted", ...props }: BadgeProps) => (
  <span
    className={cn(
      "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium",
      badgeStyles[variant],
      className,
    )}
    {...props}
  />
);
