import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import {
  BATCH_CREATE_ROLES,
  BATCH_VIEW_ROLES,
  hasRole,
} from "@/src/lib/auth/roles";
import { requireRole } from "@/src/lib/auth/session";
import {
  BATCH_STATUSES,
  isBatchStatus,
  STATUS_META,
} from "@/src/lib/batches/freshness";
import {
  formatDate,
  formatIdr,
  formatInteger,
  formatKg,
  formatNumber,
} from "@/src/lib/batches/format";
import { summarizeBatches } from "@/src/lib/batches/metrics";
import { getBatchesForUser } from "@/src/lib/batches/queries";
import { StatusPill } from "@/src/components/status-pill";
import { cn } from "@/lib/utils";

export const instant = false;

export const metadata: Metadata = {
  title: "Batch & pasokan · Vesta",
  description: "Pantau stok, freshness score, dan tahap cascade setiap batch.",
};

type BatchesPageProps = {
  searchParams: Promise<{
    status?: string | string[];
    dihapus?: string | string[];
  }>;
};

export default async function BatchesPage({
  searchParams,
}: BatchesPageProps) {
  const user = await requireRole(BATCH_VIEW_ROLES);
  const params = await searchParams;
  const rawStatus =
    typeof params.status === "string" ? params.status : undefined;
  const activeStatus = rawStatus && isBatchStatus(rawStatus) ? rawStatus : null;
  const deleted = params.dihapus === "1";
  const canCreate = hasRole(user.role, BATCH_CREATE_ROLES);

  const allBatches = await getBatchesForUser(user);
  const summary = summarizeBatches(allBatches);
  const batches = activeStatus
    ? allBatches.filter((batch) => batch.status === activeStatus)
    : allBatches;

  return (
    <div>
      {deleted ? (
        <p
          role="status"
          className="mb-4 rounded-lg bg-brand-soft px-3.5 py-2.5 text-sm font-medium text-brand-strong"
        >
          Batch berhasil dihapus.
        </p>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-ink">
            Batch &amp; pasokan
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            {summary.total === 0
              ? "Belum ada batch yang tercatat."
              : `${formatInteger(summary.total)} batch · ${formatKg(
                  summary.availableKg,
                )} stok tersedia`}
            {summary.needingAction > 0
              ? ` · ${formatInteger(summary.needingAction)} perlu ditindaklanjuti`
              : ""}
          </p>
        </div>

        {canCreate ? (
          <Link
            href="/dashboard/batches/new"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand-strong px-4 text-sm font-semibold text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <Plus className="size-4" aria-hidden="true" />
            Catat batch
          </Link>
        ) : null}
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1 lg:grid lg:grid-cols-5 lg:overflow-visible lg:pb-0">
        {BATCH_STATUSES.map((status) => {
          const meta = STATUS_META[status];
          const active = activeStatus === status;

          return (
            <Link
              key={status}
              href={active ? "/dashboard/batches" : `/dashboard/batches?status=${status}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "min-w-[144px] flex-1 rounded-lg border px-3 py-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand lg:min-w-0",
                active
                  ? "border-brand bg-brand-soft/60"
                  : "border-line bg-surface hover:bg-surface-muted/70",
              )}
            >
              <span className="block text-xs font-medium text-ink-muted">
                {meta.label}
              </span>
              <span className="mt-0.5 block text-base font-semibold tabular-nums text-ink">
                {formatInteger(summary.statusCounts[status])}
              </span>
            </Link>
          );
        })}
      </div>

      {activeStatus ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-ink-muted">
            Menampilkan tahap {STATUS_META[activeStatus].label}.
          </p>
          <Link
            href="/dashboard/batches"
            className="text-xs font-semibold text-brand-strong hover:underline"
          >
            Tampilkan semua
          </Link>
        </div>
      ) : null}

      <section className="mt-5 overflow-hidden rounded-xl border border-line bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Daftar batch</h2>
          <p className="text-xs tabular-nums text-ink-muted">
            {formatInteger(batches.length)} batch
          </p>
        </div>

        {batches.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium text-ink">
              {activeStatus
                ? `Tidak ada batch di tahap ${STATUS_META[activeStatus].label}.`
                : "Belum ada batch yang tercatat."}
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              {activeStatus
                ? "Pilih tahap lain atau tampilkan semua batch."
                : canCreate
                  ? "Mulai dengan mencatat pasokan pertama."
                  : "Batch akan muncul setelah produsen mencatat pasokan."}
            </p>
            {activeStatus ? (
              <Link
                href="/dashboard/batches"
                className="mt-4 inline-flex h-9 items-center rounded-lg border border-line px-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted"
              >
                Tampilkan semua
              </Link>
            ) : canCreate ? (
              <Link
                href="/dashboard/batches/new"
                className="mt-4 inline-flex h-9 items-center rounded-lg bg-brand-strong px-3 text-sm font-semibold text-on-brand transition-colors hover:bg-brand"
              >
                Catat batch
              </Link>
            ) : null}
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs text-ink-muted">
                    <th className="py-2.5 pl-4 pr-3 font-medium">Batch</th>
                    <th className="px-3 py-2.5 font-medium">Gudang</th>
                    <th className="px-3 py-2.5 font-medium">Panen</th>
                    <th className="px-3 py-2.5 text-right font-medium">Stok</th>
                    <th className="px-3 py-2.5 text-right font-medium">Skor</th>
                    <th className="px-3 py-2.5 text-right font-medium">
                      Harga/kg
                    </th>
                    <th className="px-3 py-2.5 font-medium">Tahap</th>
                    <th className="py-2.5 pl-3 pr-4">
                      <span className="sr-only">Aksi</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => {
                    const availableKg = Math.max(
                      0,
                      batch.quantityKg - batch.reservedKg,
                    );

                    return (
                      <tr
                        key={batch.id}
                        className="border-b border-line last:border-0 hover:bg-surface-muted/50"
                      >
                        <td className="py-3 pl-4 pr-3">
                          <Link
                            href={`/dashboard/batches/${batch.id}`}
                            className="font-semibold text-ink hover:underline"
                          >
                            {batch.code}
                          </Link>
                          <span className="mt-0.5 block text-xs text-ink-muted">
                            {batch.product.name}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-ink-muted">
                          <span className="block text-ink">
                            {batch.warehouse.name}
                          </span>
                          <span className="text-xs">
                            {batch.warehouse.city ?? "-"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-ink-muted">
                          {formatDate(batch.harvestDate)}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-ink">
                          {formatKg(availableKg)}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-ink">
                          {formatNumber(batch.freshnessScore)}
                          <span className="text-xs text-ink-muted">/100</span>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-ink">
                          {batch.priceBreakdown
                            ? formatIdr(batch.priceBreakdown.finalPricePerKg)
                            : "-"}
                        </td>
                        <td className="px-3 py-3">
                          <StatusPill status={batch.status} />
                        </td>
                        <td className="py-3 pl-3 pr-4 text-right">
                          <Link
                            href={`/dashboard/batches/${batch.id}`}
                            className="text-sm font-semibold text-brand-strong hover:underline"
                          >
                            Lihat
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden">
              {batches.map((batch) => {
                const availableKg = Math.max(
                  0,
                  batch.quantityKg - batch.reservedKg,
                );

                return (
                  <Link
                    key={batch.id}
                    href={`/dashboard/batches/${batch.id}`}
                    className="block border-b border-line px-4 py-3 last:border-0 hover:bg-surface-muted/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">
                          {batch.code}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-ink-muted">
                          {batch.product.name} · {batch.warehouse.name}
                        </p>
                        <p className="mt-1 text-xs text-ink-muted">
                          Panen {formatDate(batch.harvestDate)} ·{" "}
                          {formatKg(availableKg)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <StatusPill status={batch.status} />
                        <p className="text-sm font-semibold tabular-nums text-ink">
                          {batch.priceBreakdown
                            ? formatIdr(batch.priceBreakdown.finalPricePerKg)
                            : "-"}
                        </p>
                        <p className="text-xs tabular-nums text-ink-muted">
                          Skor {formatNumber(batch.freshnessScore)}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
