import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Package, ShoppingBasket } from "lucide-react";
import {
  BATCH_VIEW_ROLES,
  hasRole,
  ROLE_LABELS,
  ROLE_SUMMARIES,
} from "@/src/lib/auth/roles";
import { requireSession } from "@/src/lib/auth/session";
import {
  BATCH_STATUSES,
  STATUS_META,
} from "@/src/lib/batches/freshness";
import {
  formatDateTime,
  formatIdr,
  formatInteger,
  formatKg,
  formatNumber,
} from "@/src/lib/batches/format";
import { summarizeBatches } from "@/src/lib/batches/metrics";
import { getBatchesForUser } from "@/src/lib/batches/queries";
import { getOrdersForUser } from "@/src/lib/marketplace/queries";
import { StatusPill } from "@/src/components/status-pill";

export const instant = false;

export const metadata: Metadata = {
  title: "Dashboard · Vesta",
  description: "Ringkasan operasional Freshness Cascade Vesta.",
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu bayar",
  PAID: "Lunas",
  SHIPPED: "Dikirim",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export default async function DashboardPage() {
  const user = await requireSession();
  const canViewBatches = hasRole(user.role, BATCH_VIEW_ROLES);

  if (!canViewBatches) {
    const orders = await getOrdersForUser(Number(user.id));
    const recentOrders = orders.slice(0, 3);

    const quickLinks = [
      {
        href: "/marketplace",
        title: "Marketplace segar",
        description: "Batch skor ≥ 70 dengan harga normal dan rincian harga transparan.",
      },
      {
        href: "/rescue-deals",
        title: "Rescue deals",
        description: "Selamatkan batch skor turun dengan diskon dinamis sesuai tier.",
      },
      user.role === "BUSINESS"
        ? {
            href: "/marketplace/bulk",
            title: "Pre-order grosir",
            description: "Pesan kebutuhan usaha dalam jumlah besar langsung dari gudang.",
          }
        : {
            href: "/impact",
            title: "Dampak Anda",
            description: "Lihat berapa kg pangan yang terselamatkan lewat pembelian Anda.",
          },
    ];

    return (
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-ink">
          Ringkasan akun
        </h1>
        <p className="mt-1 text-sm font-medium text-ink-muted">
          {ROLE_LABELS[user.role]} · {user.email}
        </p>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-muted">
          {ROLE_SUMMARIES[user.role]}
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex flex-col rounded-xl border border-line bg-surface p-4 transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <span className="flex items-center justify-between gap-2">
                <ShoppingBasket
                  className="size-4 text-ink-muted"
                  aria-hidden="true"
                />
                <ArrowUpRight
                  className="size-4 text-ink-muted transition-colors group-hover:text-brand"
                  aria-hidden="true"
                />
              </span>
              <h2 className="mt-3 text-sm font-semibold text-ink">
                {link.title}
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                {link.description}
              </p>
            </Link>
          ))}
        </div>

        <section
          aria-labelledby="recent-orders-heading"
          className="mt-4 rounded-xl border border-line bg-surface"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2
              id="recent-orders-heading"
              className="text-sm font-semibold text-ink"
            >
              Pesanan terbaru
            </h2>
            <Link
              href="/orders"
              className="text-xs font-semibold text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Lihat semua
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-medium text-ink">
                Belum ada pesanan.
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                Mulai belanja di marketplace — pesanan Anda muncul di sini.
              </p>
              <Link
                href="/marketplace"
                className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-strong px-4 text-sm font-semibold text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                Ke marketplace
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <ul>
              {recentOrders.map((order) => (
                <li
                  key={order.id}
                  className="border-b border-line last:border-0"
                >
                  <Link
                    href={`/orders/${order.code}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {order.code}
                        <span className="ml-2 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                          {ORDER_STATUS_LABELS[order.status] ?? order.status}
                        </span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-ink-muted">
                        {order.items
                          .map((item) => item.productName)
                          .join(", ")}{" "}
                        · {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                      {formatIdr(order.total)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  }

  const batches = await getBatchesForUser(user);
  const summary = summarizeBatches(batches);
  const attention = batches
    .filter(
      (batch) => batch.status !== "FRESH" && batch.status !== "DISPOSED",
    )
    .slice(0, 4);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-ink">
            Ringkasan operasional
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            {ROLE_LABELS[user.role]} · {user.email}
          </p>
          <p className="mt-3 text-sm text-ink">
            {summary.total === 0
              ? "Belum ada batch yang masuk ke operasional."
              : summary.needingAction > 0
                ? `${formatInteger(
                    summary.needingAction,
                  )} batch perlu ditindaklanjuti hari ini.`
                : "Semua batch aktif masih di tahap Fresh."}
          </p>
        </div>

        <Link
          href="/dashboard/batches"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-line px-4 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Kelola batch
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <section className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
        <div className="bg-surface p-4">
          <p className="text-xs text-ink-muted">Total batch</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {formatInteger(summary.total)}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">di ruang kerja ini</p>
        </div>
        <div className="bg-surface p-4">
          <p className="text-xs text-ink-muted">Stok tersedia</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {formatKg(summary.availableKg)}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">setelah reservasi</p>
        </div>
        <div className="bg-surface p-4">
          <p className="text-xs text-ink-muted">Perlu tindakan</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {formatInteger(summary.needingAction)}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">Rescue, pakan, residu</p>
        </div>
        <div className="bg-surface p-4">
          <p className="text-xs text-ink-muted">Rata-rata skor</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {formatNumber(summary.averageScore)}
            <span className="text-sm font-normal text-ink-muted">/100</span>
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">seluruh batch</p>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-6">
        <section className="flex flex-col rounded-xl border border-line bg-surface lg:col-span-4">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">
              Perlu ditindaklanjuti
            </h2>
            <Link
              href="/dashboard/batches"
              className="text-xs font-semibold text-brand-strong hover:underline"
            >
              Lihat semua
            </Link>
          </div>

          {attention.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center">
              <p className="text-sm font-medium text-ink">
                Tidak ada batch yang menunggu tindakan.
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                Batch baru akan muncul di sini saat skornya turun.
              </p>
            </div>
          ) : (
            <ul>
              {attention.map((batch) => {
                const availableKg = Math.max(
                  0,
                  batch.quantityKg - batch.reservedKg,
                );

                return (
                  <li
                    key={batch.id}
                    className="border-b border-line last:border-0"
                  >
                    <Link
                      href={`/dashboard/batches/${batch.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">
                          {batch.code}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-ink-muted">
                          {batch.product.name} · {batch.warehouse.name} ·{" "}
                          {formatKg(availableKg)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-sm font-semibold tabular-nums text-ink">
                          {formatNumber(batch.freshnessScore)}
                          <span className="text-xs font-normal text-ink-muted">
                            /100
                          </span>
                        </span>
                        <StatusPill status={batch.status} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-line bg-surface p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-ink">Sebaran tahap</h2>
          <ul className="mt-3 space-y-1">
            {BATCH_STATUSES.map((status) => {
              const meta = STATUS_META[status];

              return (
                <li
                  key={status}
                  className="flex items-center justify-between gap-3 px-2 py-1.5"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`size-1.5 rounded-full ${meta.dotClassName}`}
                      aria-hidden="true"
                    />
                    <span className="text-sm text-ink">{meta.label}</span>
                  </span>
                  <span className="text-sm tabular-nums text-ink-muted">
                    {formatInteger(summary.statusCounts[status])}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-ink-muted">
            Tahap berubah otomatis saat skor melewati ambang cascade.
          </p>
        </section>
      </div>

    </div>
  );
}
