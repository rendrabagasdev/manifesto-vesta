import type { Metadata } from "next";
import Image from "next/image";
import { connection } from "next/server";
import { requireSession } from "@/src/lib/auth/session";
import {
  getBuyerQuotaStatus,
  getRescueDeals,
  type RescueDealView,
} from "@/src/lib/marketplace/queries";
import { getDealAccess } from "@/src/lib/pricing/rescue";
import { formatIdr, formatKg, formatNumber } from "@/src/lib/batches/format";
import { DirectBuyForm } from "@/src/components/marketplace/direct-buy-form";
import { NotifyMe } from "@/src/components/marketplace/notify-me";
import { buyRescueDealAction } from "@/app/(shop)/actions";

export const instant = false;

export const metadata: Metadata = {
  title: "Penawaran Diskon — Vesta",
  description: "Harga lebih murah untuk stok yang mendekati akhir masa jual.",
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
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface">
      <div className="relative flex h-28 items-center justify-center overflow-hidden bg-surface-muted sm:h-40">
        {deal.imageUrl ? (
          <Image
            src={deal.imageUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, 50vw"
            className="object-cover"
          />
        ) : null}
        {deal.discountPct > 0 ? (
          <span className="absolute right-2 top-2 rounded-md bg-brand-strong px-2 py-0.5 text-[11px] font-bold tabular-nums text-on-brand">
            -{formatNumber(deal.discountPct)}%
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
          {deal.discountLabel}
        </p>
        <h2 className="mt-1 truncate text-sm font-semibold text-ink">
          {deal.productName}
        </h2>

        <p className="mt-0.5 truncate text-xs text-ink-muted">
          {deal.warehouseName}
          {deal.warehouseCity ? `, ${deal.warehouseCity}` : ""}
        </p>

        <p className="mt-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <span className="font-heading text-base font-bold tabular-nums tracking-tight text-ink">
            {formatIdr(deal.rescuePricePerKg)}
          </span>
          <span className="text-xs text-ink-muted">/{deal.unit}</span>
          {deal.originalPricePerKg > deal.rescuePricePerKg ? (
            <span className="text-[11px] tabular-nums text-ink-muted line-through">
              {formatIdr(deal.originalPricePerKg)}
            </span>
          ) : null}
        </p>

        <p className="mt-0.5 truncate text-xs text-ink-muted">
          {formatKg(deal.availableKg)} tersedia
        </p>

        <div className="mt-auto pt-3">
          {locked ? (
            <div>
              <div className="rounded-lg border border-line bg-surface-muted px-3 py-2.5">
                <p className="text-xs font-semibold text-ink">
                  Belum bisa diakses
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                  Coba lagi nanti atau minta kabar saat tersedia.
                </p>
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
              label="Beli"
            />
          )}
        </div>
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
          Harga lebih murah untuk stok yang mendekati akhir masa jual.
        </p>
      </header>

      {deals.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-line bg-surface px-6 py-10 text-center">
          <p className="text-sm font-semibold text-ink">Belum ada penawaran</p>
          <p className="mt-1 text-sm text-ink-muted">Cek lagi nanti, ya.</p>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
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
