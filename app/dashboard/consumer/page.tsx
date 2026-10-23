import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, Droplets, Leaf, Recycle, Trophy } from "lucide-react";
import { requireRole } from "@/src/lib/auth/session";
import {
  getBuyerQuotaStatus,
  getImpactSummaryFor,
  getOrdersForUser,
} from "@/src/lib/marketplace/queries";
import {
  getNextTier,
  progressToNextTier,
  TIER_BENEFITS,
  type TierName,
} from "@/src/lib/loyalty/tiers";
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
  description: "Riwayat pesanan, progres tier, kuota rescue, dan kontribusi dampak.",
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

  const [quota, orders, impact] = await Promise.all([
    getBuyerQuotaStatus(userId),
    getOrdersForUser(userId),
    getImpactSummaryFor(undefined, userId),
  ]);

  const tier = quota.tier as TierName;
  const next = getNextTier(tier);
  const nextTier = next.nextTier;
  const nextThreshold = next.threshold;
  const progress = progressToNextTier(tier, quota.totalSpend30d);
  const quotaPct = quota.limit > 0 ? Math.round((quota.used / quota.limit) * 100) : 0;

  return (
    <div>
      <header className="max-w-2xl">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-ink">
          Dashboard konsumen
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          Belanja, tier loyalitas, dan dampak yang Anda ciptakan — semua dalam
          satu tempat.
        </p>
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section aria-labelledby="tier-progress-heading" className="rounded-xl border border-line bg-surface p-5 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="tier-progress-heading" className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Trophy className="size-4" aria-hidden="true" />
                Tier loyalitas
              </h2>
              <p className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-ink">
                {TIER_BENEFITS[tier].label}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                Belanja harga normal 30 hari terakhir: {formatIdr(quota.totalSpend30d)}
              </p>
            </div>
            <dl className="text-right text-sm">
              <dt className="text-xs text-ink-muted">Poin</dt>
              <dd className="font-heading text-2xl font-bold tabular-nums tracking-tight text-ink">
                {formatInteger(quota.points)}
              </dd>
            </dl>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-ink-muted">{TIER_BENEFITS[tier].label}</span>
              <span className="text-ink-muted">
                {nextTier && nextThreshold !== null
                  ? `${TIER_BENEFITS[nextTier].label} · ${formatIdr(nextThreshold)}`
                  : "Tier tertinggi"}
              </span>
            </div>
            <div
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-muted"
              role="meter"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progres menuju tier berikutnya ${progress}%`}
            >
              <span
                className="block h-full rounded-full bg-brand"
                style={{ width: `${Math.max(progress > 0 ? 3 : 0, progress)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-ink-muted">
              {nextTier && nextThreshold !== null
                ? `${formatIdr(Math.max(0, nextThreshold - quota.totalSpend30d))} lagi untuk ${TIER_BENEFITS[nextTier].label} (${TIER_BENEFITS[nextTier].rescueQuotaPerWeek} kuota, +${TIER_BENEFITS[nextTier].earlyAccessHours} jam early access).`
                : "Anda sudah di tier Platinum — semua benefit aktif."}
            </p>
          </div>

          <div className="mt-4 border-t border-line pt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink">Kuota rescue minggu ini</p>
              <p className="text-sm tabular-nums text-ink">
                <span className="font-semibold">{quota.remaining}</span>
                <span className="text-ink-muted"> / {quota.limit}</span>
              </p>
            </div>
            <div
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-muted"
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
            <p className="mt-1.5 text-xs text-ink-muted">
              {quota.used} terpakai · reset {quota.resetsAt}
            </p>
          </div>
        </section>

        <section aria-labelledby="impact-heading" className="rounded-xl border border-line bg-surface p-5">
          <h2 id="impact-heading" className="text-sm font-semibold text-ink">
            Kontribusi dampak Anda
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-ink-muted">
                <Leaf className="size-4" aria-hidden="true" />
                Terselamatkan
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
      </div>

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
                description="Mulai belanja di marketplace segar atau selamatkan batch lewat Rescue Deals."
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
