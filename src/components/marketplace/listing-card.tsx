import Image from "next/image";
import type { SimpleListing } from "@/src/lib/marketplace/queries";
import { formatIdr, formatKg } from "@/src/lib/batches/format";
import { DirectBuyForm } from "@/src/components/marketplace/direct-buy-form";
import type { PurchaseState } from "@/app/(shop)/actions";

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
  const fallbackTag = source === "FEED" ? "Pakan" : "Residu";

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface">
      <div className="relative flex h-28 items-center justify-center overflow-hidden bg-surface-muted sm:h-40">
        {listing.imageUrl ? (
          <Image
            src={listing.imageUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, 50vw"
            className="object-cover"
          />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
          {listing.tag ?? fallbackTag}
        </p>
        <h2 className="mt-1 truncate text-sm font-semibold text-ink">
          {listing.productName}
        </h2>

        <p className="mt-0.5 truncate text-xs text-ink-muted">
          {listing.warehouseName}
          {listing.warehouseCity ? `, ${listing.warehouseCity}` : ""}
        </p>

        {listing.description ? (
          <p className="mt-1 hidden line-clamp-2 text-xs leading-relaxed text-ink-muted sm:block">
            {listing.description}
          </p>
        ) : null}

        <p className="mt-2 flex items-baseline gap-1">
          <span className="font-heading text-base font-bold tabular-nums tracking-tight text-ink">
            {formatIdr(listing.pricePerKg)}
          </span>
          <span className="text-xs text-ink-muted">/kg</span>
        </p>
        <p className="mt-0.5 truncate text-xs text-ink-muted">
          {formatKg(listing.availableKg)} tersedia
        </p>

        <div className="mt-auto pt-3">
          <DirectBuyForm
            action={action}
            listingId={listing.id}
            source={source}
            pricePerKg={listing.pricePerKg}
            maxKg={listing.availableKg}
            label={buyLabel}
          />
        </div>
      </div>
    </article>
  );
}
