import { cn } from "@/lib/utils";

/**
 * Skeleton primitives for route-segment loading states.
 * Pulse animation only — no spinners. Shapes mirror the page layouts
 * they stand in for, so the swap feels like content arriving, not a jump.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-lg bg-surface-muted", className)}
    />
  );
}

/** Header block: title line, supporting sentence, optional action on the right. */
export function PageHeaderSkeleton({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-3 h-4 w-full max-w-md" />
        <Skeleton className="mt-1.5 h-4 w-72" />
      </div>
      {withAction ? <Skeleton className="h-10 w-36 shrink-0" /> : null}
    </div>
  );
}

/** KPI strip: one container split into equal cells, like the dashboard summary. */
export function KpiStripSkeleton({ cells = 4 }: { cells?: number }) {
  return (
    <div
      className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4"
      style={{ gridTemplateColumns: `repeat(${Math.min(cells, 4)}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: cells }).map((_, index) => (
        <div key={index} className="bg-surface p-4">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="mt-2 h-7 w-16" />
          <Skeleton className="mt-1.5 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

/** Card grid matching the marketplace/deal card layouts. */
export function CardGridSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: cards }).map((_, index) => (
        <div key={index} className="rounded-xl border border-line bg-surface p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="mt-1.5 h-4 w-32" />
            </div>
            <Skeleton className="h-6 w-20 shrink-0" />
          </div>
          <Skeleton className="mt-3 h-3 w-40" />
          <Skeleton className="mt-3 h-3.5 w-full" />
          <Skeleton className="mt-3 h-9 w-full" />
        </div>
      ))}
    </div>
  );
}
