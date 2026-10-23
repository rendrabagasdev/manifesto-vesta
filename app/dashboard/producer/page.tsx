import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { ArrowUpRight, Banknote, Sprout } from "lucide-react";
import { requireRole } from "@/src/lib/auth/session";
import {
  getBatchesForUser,
  getProducerForUser,
  getProductsForUser,
  getWarehouses,
} from "@/src/lib/batches/queries";
import { summarizeBatches } from "@/src/lib/batches/metrics";
import {
  dateInputValue,
  formatDateTime,
  formatIdr,
  formatInteger,
  formatKg,
  formatNumber,
} from "@/src/lib/batches/format";
import { getSalesForProducer } from "@/src/lib/marketplace/queries";
import { StatusPill } from "@/src/components/status-pill";
import { FreshnessMeter } from "@/src/components/marketplace/freshness-meter";
import { BatchForm } from "@/app/dashboard/batches/new/batch-form";
import { EmptyState } from "@/src/components/shop/empty-state";

export const instant = false;

export const metadata: Metadata = {
  title: "Dashboard produsen — Vesta",
  description: "Input panen, pantau status batch dan pembayaran.",
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu bayar",
  PAID: "Lunas",
  SHIPPED: "Dikirim",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

const PRODUCER_ONBOARDING = [
  "Mencatat panen baru — skor kesegaran dan harga dihitung otomatis.",
  "Memantau batch Anda melewati tahap cascade secara real-time.",
  "Melacak pembayaran dari setiap penjualan batch.",
] as const;

export default async function ProducerDashboardPage() {
  await connection();
  const user = await requireRole(["PRODUCER", "ADMIN"]);

  const producer = await getProducerForUser(user.id);
  if (!producer) {
    return (
      <div>
        <header className="max-w-xl">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-ink">
            Dashboard produsen
          </h1>
          <p className="mt-1 text-sm text-ink-muted">{user.email}</p>
        </header>
        <div className="mt-6 max-w-xl">
          <EmptyState
            title="Profil produsen belum dibuat"
            description="Hubungi admin untuk mengaitkan akun Anda dengan profil kebun."
          />
          <section
            aria-labelledby="producer-onboarding-heading"
            className="mt-4 rounded-xl border border-line bg-surface p-5"
          >
            <h2
              id="producer-onboarding-heading"
              className="text-sm font-semibold text-ink"
            >
              Setelah akun terkait, Anda bisa
            </h2>
            <ul className="mt-3 space-y-3">
              {PRODUCER_ONBOARDING.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span
                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-soft ring-1 ring-brand/30"
                    aria-hidden="true"
                  />
                  <span className="text-sm leading-relaxed text-ink-muted">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    );
  }

  const [batches, products, warehouses, sales] = await Promise.all([
    getBatchesForUser(user),
    getProductsForUser(user),
    getWarehouses(),
    getSalesForProducer(producer.id),
  ]);

  const summary = summarizeBatches(batches);
  const unpaid = sales.filter((sale) => sale.orderStatus === "PENDING");
  const paidTotal = sales
    .filter((sale) => sale.orderStatus !== "PENDING" && sale.orderStatus !== "CANCELLED")
    .reduce((sum, sale) => sum + sale.producerTotal, 0);

  return (
    <div>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-ink">
            Dashboard produsen
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {producer.farmName} · {user.email}
          </p>
        </div>
        <Link
          href="/dashboard/batches"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-line px-4 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Kelola batch
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </header>

      <section
        aria-label="Ringkasan batch"
        className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4"
      >
        <div className="bg-surface p-4">
          <p className="text-xs text-ink-muted">Total batch</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {formatInteger(summary.total)}
          </p>
        </div>
        <div className="bg-surface p-4">
          <p className="text-xs text-ink-muted">Stok tersedia</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {formatKg(summary.availableKg)}
          </p>
        </div>
        <div className="bg-surface p-4">
          <p className="text-xs text-ink-muted">Perlu tindakan</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {formatInteger(summary.needingAction)}
          </p>
        </div>
        <div className="bg-surface p-4">
          <p className="text-xs text-ink-muted">Rata-rata skor</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {formatNumber(summary.averageScore)}
            <span className="text-sm font-normal text-ink-muted">/100</span>
          </p>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="harvest-heading" className="rounded-xl border border-line bg-surface p-5">
          <h2 id="harvest-heading" className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Sprout className="size-4" aria-hidden="true" />
            Catat panen baru
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            Skor kesegaran, tahap cascade, dan harga dihitung otomatis dari
            tanggal panen, suhu, dan umur simpan komoditas.
          </p>
          <div className="mt-4">
            {products.length === 0 || warehouses.length === 0 ? (
              <EmptyState
                title="Data belum lengkap"
                description="Tambahkan produk dan pastikan ada gudang terdaftar sebelum mencatat panen."
              />
            ) : (
              <BatchForm products={products} warehouses={warehouses} today={dateInputValue()} />
            )}
          </div>
        </section>

        <div className="grid gap-4">
          <section aria-labelledby="payment-heading" className="rounded-xl border border-line bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <h2 id="payment-heading" className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Banknote className="size-4" aria-hidden="true" />
                Pembayaran
              </h2>
              <p className="text-xs text-ink-muted">
                {unpaid.length > 0
                  ? `${formatInteger(unpaid.length)} pesanan menunggu bayar`
                  : "Semua lunas"}
              </p>
            </div>
            {sales.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-ink-muted">
                Belum ada penjualan dari batch Anda.
              </p>
            ) : (
              <ul>
                {sales.slice(0, 4).map((sale) => (
                  <li key={sale.orderCode} className="border-b border-line px-4 py-3 last:border-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink">{sale.orderCode}</p>
                      <span className="text-sm font-semibold tabular-nums text-ink">
                        {formatIdr(sale.producerTotal)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {sale.lines.map((line) => `${line.productName} ${formatKg(line.quantityKg)}`).join(", ")}
                      {" · "}
                      {ORDER_STATUS_LABELS[sale.orderStatus] ?? sale.orderStatus}
                      {sale.paidAt ? ` · ${formatDateTime(sale.paidAt)}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="trend-heading" className="rounded-xl border border-line bg-surface p-4">
            <h2 id="trend-heading" className="text-sm font-semibold text-ink">
              Skor kesegaran batch
            </h2>
            {batches.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">
                Belum ada batch — catat panen pertama Anda di panel sebelah kiri.
              </p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {batches.slice(0, 5).map((batch) => (
                  <li key={batch.id} className="flex items-center gap-3">
                    <Link
                      href={`/dashboard/batches/${batch.id}`}
                      className="w-28 shrink-0 truncate text-xs font-semibold text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    >
                      {batch.code}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <FreshnessMeter score={batch.freshnessScore} size="sm" />
                    </div>
                    <StatusPill status={batch.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
