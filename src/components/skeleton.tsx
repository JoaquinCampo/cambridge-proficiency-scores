import { cn } from "~/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton", className)} {...props} />;
}

/** Three stat card placeholders in a row */
export function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card-static flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <Skeleton className="skeleton-text w-24" />
            <Skeleton className="h-10 w-10 rounded-[10px]" />
          </div>
          <Skeleton className="h-9 w-20" />
          <Skeleton className="skeleton-text w-32" />
        </div>
      ))}
    </div>
  );
}

/** Full-width card placeholder */
export function CardSkeleton({ height = 200 }: { height?: number }) {
  return <Skeleton className="skeleton-card w-full" style={{ height }} />;
}

/** Page loading layout: header + stat cards + chart */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 py-6">
        <Skeleton className="skeleton-heading" />
        <Skeleton className="skeleton-text w-48" />
      </div>
      <StatCardsSkeleton />
      <CardSkeleton height={300} />
    </div>
  );
}

/** Student list skeleton rows */
export function StudentListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="card-static overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-[var(--border)] px-6 py-3.5 last:border-b-0"
        >
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="skeleton-text w-32" />
            <Skeleton className="skeleton-text w-44" style={{ height: 10 }} />
          </div>
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
