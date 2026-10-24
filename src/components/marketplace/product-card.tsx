import Link from "next/link";
import { ArrowUpRight, MapPin, Wheat } from "lucide-react";
import type { MarketplaceListing } from "@/src/lib/marketplace/queries";
import { formatIdr, formatDate, formatKg } from "@/src/lib/batches/format";
import { FreshnessMeter } from "@/src/components/marketplace/freshness-meter";
import { AddToCart } from "@/src/components/marketplace/add-to-cart";

const CATEGORY_LABELS: Record<string, string> = {
  VEGETABLE: "Sayur",
  FRUIT: "Buah",
  PROTEIN: "Protein",
  STAPLE: "Pokok",
  HERB: "Rempah",
  OTHER: "Lainnya",
};

export function ProductCard({ listing }: { listing: MarketplaceListing }) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink-muted">
            {CATEGORY_LABELS[listing.category] ?? listing.category}
          </p>
          <h2 className="mt-0.5 truncate text-sm font-semibold text-ink">
            {listing.productName}
          </h2>
        </div>
        <p className="shrink-0 text-right">
          <span className="font-heading text-lg font-bold tabular-nums tracking-tight text-ink">
            {formatIdr(listing.pricePerKg)}
          </span>
          <span className="block text-xs text-ink-muted">per {listing.unit}</span>
        </p>
      </div>

      <p className="mt-1.5 flex items-center gap-1 text-[13px] text-ink-muted">
        <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate">
          {listing.producerFarmName ?? "Produsen mitra"} → {listing.warehouseName}
          {listing.warehouseCity ? `, ${listing.warehouseCity}` : ""}
        </span>
      </p>

      <div className="mt-3">
        <FreshnessMeter score={listing.freshnessScore} size="sm" />
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-[13px] text-ink-muted">
        <Wheat className="size-3.5 shrink-0" aria-hidden="true" />
        {formatKg(listing.availableKg)} tersedia · panen {formatDate(listing.harvestDate)}
      </p>

      <div className="mt-auto pt-3">
        <AddToCart
          product={{
            batchId: listing.batchId,
            batchCode: listing.batchCode,
            productId: listing.productId,
            productName: listing.productName,
            unit: listing.unit,
            pricePerKg: listing.pricePerKg,
            maxKg: listing.availableKg,
            warehouseName: listing.warehouseName,
            warehouseCity: listing.warehouseCity,
          }}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <Link
            href={`/products/${listing.productId}/breakdown`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Lihat rincian harga
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
          <span className="text-[11px] text-ink-muted">{listing.batchCode}</span>
        </div>
      </div>
    </article>
  );
}
