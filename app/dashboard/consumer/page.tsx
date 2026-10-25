import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, Droplets, Leaf, Recycle } from "lucide-react";
import { requireRole } from "@/src/lib/auth/session";
import {
  getImpactSummaryFor,
  getOrdersForUser,
} from "@/src/lib/marketplace/queries";
import {
  formatDateTime,
  formatIdr,
  formatInteger,
  formatKg,
  formatNumber,
} from "@/src/lib/batches/format";
import { SavedItems } from "@/src/components/marketplace/saved-items";
import { EmptyState } from "@/src/components/shop/empty-state";

export const instant = false;

export const metadata: Metadata = {
  title: "Dashboard konsumen — Vesta",
  description: "Riwayat pesanan dan kontribusi dampak.",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu bayar",
  PAID: "Lunas",
  SHIPPED: "Dikirim",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export default async function ConsumerDashboardPage() {
  await connection();
  const user = await requireRole(["CONSUMER", "BUSINESS", "ADMIN"]);
  const userId = Number(user.id);

  const [orders, impact] = await Promise.all([
    getOrdersForUser(userId),
    getImpactSummaryFor(undefined, userId),
  ]);

  return (
    <div>
      <header className="max-w-2xl">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-ink">
          Dashboard konsumen
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          Belanja dan dampak yang Anda ciptakan — semua dalam satu tempat.
        </p>
      </header>

      <section aria-labelledby="impact-heading" className="mt-6 rounded-xl border border-line bg-surface p-5">
        <h2 id="impact-heading" className="text-sm font-semibold text-ink">
          Kontribusi dampak Anda
        </h2>
        <ul className="mt-4 space-y-3 text-sm">
          <li className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-ink-muted">
              <Leaf className="size-4" aria-hidden="true" />
              Tidak terbuang
            </span>
            <span className="font-semibold tabular-nums text-ink">
              {formatKg(impact.totalRescuedKg)}
            </span>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-ink-muted">
              <Recycle className="size-4" aria-hidden="true" />
              CO₂e dihindari
            </span>
            <span className="font-semibold tabular-nums text-ink">
              {formatNumber(impact.totalCo2eSavedKg)} kg
            </span>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-ink-muted">
              <Droplets className="size-4" aria-hidden="true" />
              Air dihemat
            </span>
            <span className="font-semibold tabular-nums text-ink">
              {formatInteger(impact.totalWaterSavedLiters)} L
            </span>
          </li>
        </ul>
        <Link
          href="/impact"
          className="mt-4 inline-block border-t border-line pt-3 text-xs font-semibold text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Laporan dampak publik
        </Link>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="orders-heading" className="rounded-xl border border-line bg-surface">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 id="orders-heading" className="text-sm font-semibold text-ink">
              Riwayat pesanan
            </h2>
            <Link
              href="/orders"
              className="text-xs font-semibold text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Lihat semua
            </Link>
          </div>
          {orders.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="Belum ada pesanan"
                description="Mulai belanja di marketplace segar atau penawaran diskon."
                action={
                  <Link
                    href="/marketplace"
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-brand-strong px-4 text-sm font-semibold text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    Ke marketplace
                  </Link>
                }
              />
            </div>
          ) : (
            <ul>
              {orders.slice(0, 4).map((order) => (
                <li key={order.id} className="border-b border-line last:border-0">
                  <Link
                    href={`/orders/${order.code}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{order.code}</p>
                      <p className="mt-0.5 truncate text-xs text-ink-muted">
                        {STATUS_LABELS[order.status] ?? order.status} ·{" "}
                        {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums text-ink">
                        {formatIdr(order.total)}
                      </span>
                      <ArrowRight className="size-4 text-ink-muted" aria-hidden="true" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="saved-heading" className="rounded-xl border border-line bg-surface">
          <div className="border-b border-line px-4 py-3">
            <h2 id="saved-heading" className="text-sm font-semibold text-ink">
              Produk simpanan
            </h2>
          </div>
          <SavedItems />
        </section>
      </div>
    </div>
  );
}
