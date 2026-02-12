import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="animate-in flex items-center justify-between py-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-[26px] font-bold tracking-tight text-[var(--foreground)]">
          {title}
        </h1>
        {description && (
          <p className="text-[13px] text-[var(--muted-foreground)]">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
