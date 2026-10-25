import type { Metadata } from "next";
import Image from "next/image";
import { connection } from "next/server";
import {
  Flame,
  Lock,
} from "lucide-react";
import { requireSession } from "@/src/lib/auth/session";
import {
  getBuyerQuotaStatus,
  getRescueDeals,
  type RescueDealView,
} from "@/src/lib/marketplace/queries";
import { getDealAccess } from "@/src/lib/pricing/rescue";
import { formatIdr, formatNumber } from "@/src/lib/batches/format";
import { FreshnessMeter } from "@/src/components/marketplace/freshness-meter";
import { DirectBuyForm } from "@/src/components/marketplace/direct-buy-form";
import { NotifyMe } from "@/src/components/marketplace/notify-me";
import { buyRescueDealAction } from "@/app/(shop)/actions";

export const instant = false;

export const metadata: Metadata = {
  title: "Penawaran Diskon — Vesta",
  description: "Harga lebih murah untuk batch dengan skor kesegaran menurun.",
};

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
        <div className="flex min-w-0 items-start gap-3">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-stage-rescue/25">
            {deal.imageUrl ? (
              <Image
                src={deal.imageUrl}
                alt=""
                fill
                sizes="56px"
                className="object-cover"
              />
            ) : (
              <Flame
                className="absolute inset-0 m-auto size-5 text-ink/50"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink-muted">
              {deal.discountLabel}
            </p>
            <h2 className="mt-0.5 truncate text-sm font-semibold text-ink">{deal.productName}</h2>
          </div>
        </div>
        {deal.discountPct > 0 ? (
          <p className="shrink-0 rounded-lg bg-stage-rescue/25 px-2 py-1 text-sm font-bold tabular-nums text-ink">
            −{formatNumber(deal.discountPct)}%
          </p>
        ) : null}
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
        {deal.originalPricePerKg > deal.rescuePricePerKg ? (
          <span className="text-xs tabular-nums text-ink-muted line-through">
            {formatIdr(deal.originalPricePerKg)}
          </span>
        ) : null}
      </div>

      <div className="mt-3">
        <FreshnessMeter score={deal.freshnessScore} size="sm" />
      </div>

      <div className="mt-auto pt-3">
        {locked ? (
          <div>
            <div className="flex items-start gap-2 rounded-lg bg-surface-muted px-3 py-2.5">
              <Lock className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink">
                  Penawaran belum terbuka
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Coba lagi nanti atau aktifkan notifikasi.
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
              ? "Penawaran sudah berakhir."
              : "Penawaran belum aktif."}
          </p>
        ) : (
          <DirectBuyForm
            action={buyRescueDealAction}
            batchId={deal.batchId}
            source="RESCUE"
            pricePerKg={deal.rescuePricePerKg}
            maxKg={deal.availableKg}
            unit={deal.unit}
            label="Beli"
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

  return (
    <div>
      <header className="max-w-2xl">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Penawaran diskon
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Harga lebih murah untuk batch dengan skor kesegaran di bawah 70.
        </p>
      </header>

      {deals.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-line bg-surface px-6 py-10 text-center">
          <p className="text-sm font-semibold text-ink">Belum ada penawaran</p>
          <p className="mt-1 text-sm text-ink-muted">Cek lagi nanti, ya.</p>
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
    </div>
  );
}
