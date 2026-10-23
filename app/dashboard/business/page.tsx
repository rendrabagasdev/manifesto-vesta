import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import {
  AlarmClock,
  ArrowRight,
  Building2,
  CalendarClock,
  Download,
  FileBadge,
  ShoppingBag,
} from "lucide-react";
import { requireRole } from "@/src/lib/auth/session";
import {
  getBuyerQuotaStatus,
  getImpactSummaryFor,
  getOrdersForUser,
} from "@/src/lib/marketplace/queries";
import { TIER_BENEFITS, type TierName } from "@/src/lib/loyalty/tiers";
import {
  formatDateTime,
  formatIdr,
  formatInteger,
  formatKg,
  formatNumber,
} from "@/src/lib/batches/format";
import { EmptyState } from "@/src/components/shop/empty-state";

function OrderStatusPill({ status }: { status: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-ink-muted">
      <span className="size-1.5 rounded-full bg-ink-muted/60" aria-hidden="true" />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export const instant = false;
export const metadata: Metadata = {
  title: "Dashboard business — Vesta",
  description: "Pre-order, pesanan grosir, sertifikat dampak, dan akses rescue untuk mitra B2B.",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu bayar",
  PAID: "Lunas",
  SHIPPED: "Dikirim",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export default async function BusinessDashboardPage() {
  await connection();
  const user = await requireRole(["BUSINESS", "ADMIN"]);
  const userId = Number(user.id);

  const [quota, orders, impact] = await Promise.all([
    getBuyerQuotaStatus(userId),
    getOrdersForUser(userId),
    getImpactSummaryFor(undefined, userId),
  ]);

  const tier = quota.tier as TierName;
  const benefits = TIER_BENEFITS[tier];
  const preorders = orders.filter((order) => order.kind === "PREORDER");
  const bulkOrders = orders.filter((order) => order.kind !== "PREORDER");
  const pendingPreorders = preorders.filter(
    (order) => order.status === "PENDING",
  );
  const quotaPct = quota.limit > 0 ? (quota.used / quota.limit) * 100 : 0;

  return (
    <div>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-ink">
            Dashboard business
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            Kelola pre-order harian, pesanan grosir, dan laporan dampak untuk
            kebutuhan ESG {user.name ?? "bisnis Anda"}.
          </p>
        </div>
        <Link
          href="/marketplace/bulk"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand-strong px-4 text-sm font-semibold text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Buat pre-order baru
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </header>

      <section
        aria-label="Ringkasan bisnis"
        className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4"
      >
        <div className="bg-surface p-4">
          <p className="text-xs text-ink-muted">Pre-order aktif</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {formatInteger(pendingPreorders.length)}
          </p>
        </div>
        <div className="bg-surface p-4">
          <p className="text-xs text-ink-muted">Pesanan grosir</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {formatInteger(bulkOrders.length)}
          </p>
        </div>
        <div className="bg-surface p-4">
          <p className="text-xs text-ink-muted">Terselamatkan</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {formatNumber(impact.totalRescuedKg)}
            <span className="text-sm font-normal text-ink-muted"> kg</span>
          </p>
        </div>
        <div className="bg-surface p-4">
          <p className="text-xs text-ink-muted">CO₂e dihindari</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {formatNumber(impact.totalCo2eSavedKg)}
            <span className="text-sm font-normal text-ink-muted"> kg</span>
          </p>
        </div>
      </section>

      <section
        aria-labelledby="rescue-heading"
        className="mt-4 flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <h2 id="rescue-heading" className="flex items-center gap-2 text-sm font-semibold text-ink">
            <AlarmClock className="size-4" aria-hidden="true" />
            Akses Rescue Deals — tier {benefits.label}
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
            <span>
              <span className="font-semibold tabular-nums text-ink">
                {quota.remaining}
              </span>
              /{quota.limit} kuota minggu ini
            </span>
            <span>
              Early access{" "}
              <span className="font-semibold tabular-nums text-ink">
                +{benefits.earlyAccessHours}
              </span>{" "}
              jam
            </span>
          </p>
          <div
            className="mt-2.5 h-1.5 max-w-xs overflow-hidden rounded-full bg-surface-muted"
            role="meter"
            aria-valuenow={quota.used}
            aria-valuemin={0}
            aria-valuemax={quota.limit}
            aria-label={`Kuota rescue terpakai ${quota.used} dari ${quota.limit}`}
          >
            <span
              className="block h-full rounded-full bg-stage-rescue"
              style={{ width: `${Math.max(quota.used > 0 ? 4 : 0, quotaPct)}%` }}
            />
          </div>
        </div>
        <Link
          href="/rescue-deals"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-line px-4 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <ShoppingBag className="size-4" aria-hidden="true" />
          Lihat rescue deals
        </Link>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="preorder-heading" className="rounded-xl border border-line bg-surface">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 id="preorder-heading" className="flex items-center gap-2 text-sm font-semibold text-ink">
              <CalendarClock className="size-4" aria-hidden="true" />
              Pre-order
            </h2>
            <Link
              href="/marketplace/bulk"
              className="text-xs font-semibold text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Buat baru
            </Link>
          </div>
          {preorders.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="Belum ada pre-order"
                description="Pesan jumlah besar dengan jadwal delivery tetap untuk kebutuhan dapur harian Anda."
                action={
                  <Link
                    href="/marketplace/bulk"
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-brand-strong px-4 text-sm font-semibold text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    Buat pre-order
                  </Link>
                }
              />
            </div>
          ) : (
            <ul>
              {preorders.slice(0, 5).map((order) => (
                <li key={order.id} className="border-b border-line px-4 py-3 last:border-0">
                  <Link
                    href={`/orders/${order.code}`}
                    className="flex flex-wrap items-center justify-between gap-2 transition-colors hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{order.code}</p>
                      <p className="mt-0.5 truncate text-xs text-ink-muted">
                        {order.scheduledFor
                          ? `Kirim ${formatDateTime(order.scheduledFor)}`
                          : "Jadwal dikonfirmasi gudang"}{" "}
                        · {STATUS_LABELS[order.status] ?? order.status}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums text-ink">
                        {formatIdr(order.total)}
                      </span>
                      <OrderStatusPill status={order.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="bulk-heading" className="rounded-xl border border-line bg-surface">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 id="bulk-heading" className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Building2 className="size-4" aria-hidden="true" />
              Pesanan grosir
            </h2>
            <Link
              href="/orders"
              className="text-xs font-semibold text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Lihat semua
            </Link>
          </div>
          {bulkOrders.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="Belum ada pesanan"
                description="Belanja langsung di marketplace segar, atau selamatkan batch lewat Rescue Deals."
              />
            </div>
          ) : (
            <ul>
              {bulkOrders.slice(0, 5).map((order) => (
                <li key={order.id} className="border-b border-line px-4 py-3 last:border-0">
                  <Link
                    href={`/orders/${order.code}`}
                    className="flex flex-wrap items-center justify-between gap-2 transition-colors hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{order.code}</p>
                      <p className="mt-0.5 truncate text-xs text-ink-muted">
                        {order.items.map((item) => formatKg(item.quantityKg)).join(" + ")} ·{" "}
                        {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums text-ink">
                        {formatIdr(order.total)}
                      </span>
                      <OrderStatusPill status={order.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section aria-labelledby="certificate-heading" className="mt-4 flex flex-col gap-4 rounded-xl border border-line bg-brand-soft p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <h2 id="certificate-heading" className="flex items-center gap-2 text-sm font-semibold text-brand-strong">
            <FileBadge className="size-4" aria-hidden="true" />
            Sertifikat dampak
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
            Sertifikat personal untuk laporan ESG — dihitung dari impact ledger
            setiap transaksi yang selesai. Bahan terselamatkan{" "}
            <span className="font-semibold tabular-nums text-ink">
              {formatKg(impact.totalRescuedKg)}
            </span>{" "}
            · air dihemat{" "}
            <span className="font-semibold tabular-nums text-ink">
              {formatInteger(impact.totalWaterSavedLiters)} L
            </span>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <a
            href="/api/certificate"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-brand-strong px-4 text-sm font-semibold text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <Download className="size-4" aria-hidden="true" />
            Unduh PDF
          </a>
          <Link
            href="/impact-certificate"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-brand-strong/25 px-4 text-sm font-semibold text-brand-strong transition-colors hover:bg-brand-soft/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Halaman sertifikat
          </Link>
        </div>
      </section>
    </div>
  );
}
