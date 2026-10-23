import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AlarmClock, Info, Lock, ShoppingBasket, Timer } from "lucide-react";
import { requireSession } from "@/src/lib/auth/session";
import {
  getBuyerQuotaStatus,
  getRescueDeals,
  type RescueDealView,
} from "@/src/lib/marketplace/queries";
import { getDealAccess } from "@/src/lib/pricing/rescue";
import { TIER_BENEFITS, type TierName } from "@/src/lib/loyalty/tiers";
import { formatDateTime, formatIdr, formatKg, formatNumber } from "@/src/lib/batches/format";
import { FreshnessMeter } from "@/src/components/marketplace/freshness-meter";
import { Countdown } from "@/src/components/marketplace/countdown";
import { DirectBuyForm } from "@/src/components/marketplace/direct-buy-form";
import { NotifyMe } from "@/src/components/marketplace/notify-me";
import { buyRescueDealAction } from "@/app/(shop)/actions";

export const instant = false;

export const metadata: Metadata = {
  title: "Rescue Deals — Vesta",
  description: "Selamatkan batch dengan skor turun sebelum jatuh ke tahap berikutnya.",
};

const TIER_ORDER: TierName[] = ["STARTER", "SILVER", "GOLD", "PLATINUM"];

function DealCard({ deal, earlyAccessHours }: { deal: RescueDealView; earlyAccessHours: number }) {
  const access = getDealAccess(
    {
      startsAt: deal.startsAt,
      endsAt: deal.endsAt,
      earlyAccessHours: deal.dealEarlyAccessHours,
    },
    earlyAccessHours,
  );

  const locked = !access.accessible && access.reason === "EARLY_ACCESS_LOCKED";

  return (
    <article className="flex h-full flex-col rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink-muted">
            {deal.discountLabel}
          </p>
          <h2 className="mt-0.5 truncate text-sm font-semibold text-ink">{deal.productName}</h2>
        </div>
        <p className="shrink-0 rounded-lg bg-stage-rescue/25 px-2 py-1 text-sm font-bold tabular-nums text-ink">
          −{formatNumber(deal.discountPct)}%
        </p>
      </div>

      <p className="mt-1.5 truncate text-[13px] text-ink-muted">
        {deal.warehouseName}
        {deal.warehouseCity ? `, ${deal.warehouseCity}` : ""} · {deal.batchCode}
      </p>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-heading text-lg font-bold tabular-nums tracking-tight text-ink">
          {formatIdr(deal.rescuePricePerKg)}
        </span>
        <span className="text-sm text-ink-muted">/ {deal.unit}</span>
        <span className="text-xs tabular-nums text-ink-muted line-through">
          {formatIdr(deal.originalPricePerKg)}
        </span>
      </div>

      <div className="mt-3">
        <FreshnessMeter score={deal.freshnessScore} size="sm" />
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
        <Timer className="size-3.5 shrink-0" aria-hidden="true" />
        Berakhir <Countdown targetIso={deal.endsAt} prefix="dalam" expiredLabel="sudah lewat" />
      </p>

      <div className="mt-auto pt-3">
        {locked ? (
          <div>
            <div className="flex items-start gap-2 rounded-lg bg-surface-muted px-3 py-2.5">
              <Lock className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink">
                  Early access tier Anda belum terbuka
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  <Countdown
                    targetIso={access.accessStartsAt}
                    prefix="Buka dalam"
                    expiredLabel="Sudah bisa diakses"
                  />
                  . Akses publik {formatDateTime(deal.startsAt)}.
                </p>
              </div>
            </div>
            <div className="mt-2">
              <NotifyMe dealId={deal.id} />
            </div>
          </div>
        ) : !access.accessible ? (
          <p className="rounded-lg bg-surface-muted px-3 py-2.5 text-xs text-ink-muted">
            {access.reason === "EXPIRED"
              ? "Deal sudah berakhir."
              : "Deal belum aktif."}
          </p>
        ) : (
          <DirectBuyForm
            action={buyRescueDealAction}
            batchId={deal.batchId}
            source="RESCUE"
            pricePerKg={deal.rescuePricePerKg}
            maxKg={deal.availableKg}
            unit={deal.unit}
            label="Selamatkan"
          />
        )}
      </div>
    </article>
  );
}

export default async function RescueDealsPage() {
  await connection();
  const user = await requireSession();
  const [deals, quota] = await Promise.all([
    getRescueDeals(),
    getBuyerQuotaStatus(Number(user.id)),
  ]);

  const currentTierIndex = TIER_ORDER.indexOf(quota.tier as TierName);
  const nextTier = TIER_ORDER[currentTierIndex + 1] ?? null;
  const quotaPct = quota.limit > 0 ? Math.round((quota.used / quota.limit) * 100) : 0;

  return (
    <div>
      <header className="max-w-2xl">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Rescue deals
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Batch dengan skor 30–69 diselamatkan lewat diskon dinamis — makin rendah
          skor, makin besar diskon. Akses lebih awal adalah benefit tier Anda.
        </p>
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section
          aria-labelledby="quota-heading"
          className="rounded-xl border border-line bg-surface p-4 lg:col-span-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="quota-heading" className="flex items-center gap-2 text-sm font-semibold text-ink">
              <ShoppingBasket className="size-4" aria-hidden="true" />
              Kuota rescue minggu ini
            </h2>
            <p className="text-xs text-ink-muted">
              Reset <Countdown targetIso={`${quota.resetsAt}T00:00:00.000Z`} prefix="" expiredLabel="segera" />
            </p>
          </div>

          <p className="mt-3 font-heading text-3xl font-extrabold tabular-nums tracking-tight text-ink">
            {quota.remaining}
            <span className="text-base font-semibold text-ink-muted"> / {quota.limit} item</span>
          </p>

          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted"
            role="meter"
            aria-valuenow={quota.used}
            aria-valuemin={0}
            aria-valuemax={quota.limit}
            aria-label={`Kuota terpakai ${quota.used} dari ${quota.limit}`}
          >
            <span
              className="block h-full rounded-full bg-stage-rescue"
              style={{ width: `${Math.max(quota.used > 0 ? 4 : 0, quotaPct)}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-ink-muted">
            {quota.used} terpakai minggu ini · tier {quota.tierLabel} · kuota tidak
            bisa ditumpuk antar minggu.
          </p>

          <ul
            className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4"
            aria-label="Kuota rescue per tier"
          >
            {TIER_ORDER.map((tier) => {
              const benefit = TIER_BENEFITS[tier];
              const current = tier === quota.tier;

              return (
                <li
                  key={tier}
                  className={current ? "bg-brand-soft p-2.5" : "bg-surface p-2.5"}
                >
                  <p
                    className={
                      current
                        ? "text-xs font-semibold text-brand-strong"
                        : "text-xs font-medium text-ink-muted"
                    }
                  >
                    {benefit.label}
                    {current ? " · Anda" : ""}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums text-ink">
                    {benefit.rescueQuotaPerWeek}
                    <span className="text-xs font-normal text-ink-muted">
                      {" "}
                      /minggu
                    </span>
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="tier-heading" className="rounded-xl border border-line bg-surface p-4">
          <h2 id="tier-heading" className="flex items-center gap-2 text-sm font-semibold text-ink">
            <AlarmClock className="size-4" aria-hidden="true" />
            Early access Anda
          </h2>
          <p className="mt-3 font-heading text-3xl font-extrabold tabular-nums tracking-tight text-ink">
            {quota.earlyAccessHours > 0 ? `+${quota.earlyAccessHours}` : "0"}
            <span className="text-base font-semibold text-ink-muted"> jam</span>
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
            Sebelum deal dibuka publik, tier {quota.tierLabel} sudah bisa membeli{" "}
            {quota.earlyAccessHours > 0 ? `${quota.earlyAccessHours} jam lebih awal` : "bersama semua tier"}.
          </p>
          {nextTier ? (
            <p className="mt-3 border-t border-line pt-3 text-xs text-ink-muted">
              Naik ke {TIER_BENEFITS[nextTier].label} untuk{" "}
              {TIER_BENEFITS[nextTier].earlyAccessHours} jam early access dan{" "}
              {TIER_BENEFITS[nextTier].rescueQuotaPerWeek} kuota/minggu — via
              belanja harga normal.
            </p>
          ) : null}
        </section>
      </div>

      {deals.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-line bg-surface px-6 py-10 text-center">
          <p className="text-sm font-semibold text-ink">Tidak ada rescue deal aktif</p>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-ink-muted">
            Saat skor sebuah batch turun di bawah 70, deal muncul otomatis di
            halaman ini. Gunakan kontrol simulasi waktu di dashboard admin untuk
            mempercepat demo.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {deals.map((deal) => (
            <li key={deal.id} className="h-full">
              <DealCard deal={deal} earlyAccessHours={quota.earlyAccessHours} />
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-ink-muted">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Poin loyalitas hanya dihitung dari pembelian harga normal — membeli rescue
        tidak menaikkan tier, dan kuota rescue tidak bisa ditumpuk antar minggu.
      </p>
    </div>
  );
}
