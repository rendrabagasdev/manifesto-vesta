import {
  CardGridSkeleton,
  KpiStripSkeleton,
  PageHeaderSkeleton,
} from "@/src/components/skeleton";

/** Loading state for the dashboard route group. */
export default function DashboardLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Memuat dashboard…</span>
      <PageHeaderSkeleton withAction />
      <KpiStripSkeleton cells={4} />
      <div className="mt-4 grid gap-4 lg:grid-cols-6">
        <div className="rounded-xl border border-line bg-surface lg:col-span-4">
          <div className="border-b border-line px-4 py-3">
            <div className="h-4 w-40 animate-pulse rounded bg-surface-muted" />
          </div>
          <div className="divide-y divide-line">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="h-4 w-28 animate-pulse rounded bg-surface-muted" />
                  <div className="mt-1.5 h-3 w-48 animate-pulse rounded bg-surface-muted" />
                </div>
                <div className="h-5 w-16 shrink-0 animate-pulse rounded-full bg-surface-muted" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4 lg:col-span-2">
          <div className="h-4 w-24 animate-pulse rounded bg-surface-muted" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="size-1.5 animate-pulse rounded-full bg-surface-muted" />
                  <div className="h-3.5 w-16 animate-pulse rounded bg-surface-muted" />
                </div>
                <div className="h-3.5 w-8 animate-pulse rounded bg-surface-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <CardGridSkeleton cards={3} />
    </div>
  );
}
