"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, TriangleAlert } from "lucide-react";

/**
 * Route-segment error boundary. Keeps the shell intact and offers a retry,
 * so a failed data fetch never blanks the whole app.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-xl border border-line bg-surface px-6 py-12 text-center">
      <span className="inline-flex size-10 items-center justify-center rounded-full bg-danger-soft">
        <TriangleAlert className="size-5 text-danger" aria-hidden="true" />
      </span>
      <h1 className="mt-4 font-heading text-xl font-bold tracking-tight text-ink">
        Ada yang salah di pihak kami
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
        Halaman ini gagal dimuat. Coba muat ulang — jika masih gagal, kembali
        nanti karena data kami sedang disinkronkan.
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-brand-strong px-5 text-sm font-semibold text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Coba lagi
        </button>
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center justify-center rounded-lg border border-line px-5 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Ke dashboard
        </Link>
      </div>
    </div>
  );
}
