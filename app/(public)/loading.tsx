import { PageHeaderSkeleton } from "@/src/components/skeleton";

/** Loading state for public pages (impact report, traceability, price breakdown). */
export default function PublicLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Memuat halaman…</span>
      <PageHeaderSkeleton />
      <div className="mt-6 space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-line bg-surface p-5">
            <div className="h-4 w-40 animate-pulse rounded bg-surface-muted" />
            <div className="mt-4 h-20 w-full animate-pulse rounded-lg bg-surface-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
