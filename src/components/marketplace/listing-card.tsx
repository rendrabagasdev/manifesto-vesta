import { MapPin } from "lucide-react";
import type { SimpleListing } from "@/src/lib/marketplace/queries";
import { formatIdr, formatKg } from "@/src/lib/batches/format";
import { FreshnessMeter } from "@/src/components/marketplace/freshness-meter";
import { DirectBuyForm } from "@/src/components/marketplace/direct-buy-form";
import type { PurchaseState } from "@/app/(shop)/actions";

/**
 * Card for feed and residue listings — the two downstream marketplaces of the
 * cascade. `source` decides which server action handles the purchase.
 */
export function ListingCard({
  listing,
  source,
  action,
  buyLabel,
}: {
  listing: SimpleListing;
  source: "FEED" | "RESIDUE";
  action: (state: PurchaseState, formData: FormData) => Promise<PurchaseState>;
  buyLabel: string;
}) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {listing.tag ? (
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
              {listing.tag}
            </p>
          ) : null}
          <h3 className="mt-0.5 truncate text-sm font-semibold text-ink">
            {listing.productName}
          </h3>
        </div>
        <p className="shrink-0 text-right">
          <span className="font-heading text-lg font-bold tabular-nums tracking-tight text-ink">
            {formatIdr(listing.pricePerKg)}
          </span>
          <span className="block text-[11px] text-ink-muted">per kg</span>
        </p>
      </div>

      <p className="mt-1.5 flex items-center gap-1 text-xs text-ink-muted">
        <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">
          {listing.warehouseName}
          {listing.warehouseCity ? `, ${listing.warehouseCity}` : ""} · {listing.batchCode}
        </span>
      </p>

      {listing.description ? (
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink-muted">
          {listing.description}
        </p>
      ) : null}

      <div className="mt-3">
        <FreshnessMeter score={listing.freshnessScore} size="sm" />
      </div>

      <p className="mt-2 text-xs text-ink-muted">{formatKg(listing.availableKg)} tersedia</p>

      <div className="mt-auto pt-3">
        <DirectBuyForm
          action={action}
          listingId={listing.id}
          source={source}
          pricePerKg={listing.pricePerKg}
          maxKg={listing.availableKg}
          unit="kg"
          label={buyLabel}
        />
      </div>
    </article>
  );
}
