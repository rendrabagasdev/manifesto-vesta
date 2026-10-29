import Image from "next/image";
import Link from "next/link";
import type { MarketplaceListing } from "@/src/lib/marketplace/queries";
import { formatIdr, formatKg } from "@/src/lib/batches/format";
import { AddToCart } from "@/src/components/marketplace/add-to-cart";
import { categoryLabel } from "@/src/lib/marketplace/categories";

export function ProductCard({ listing }: { listing: MarketplaceListing }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-brand/50">
      <Link
        href={`/products/${listing.productId}/breakdown`}
        aria-label={`Lihat rincian harga ${listing.productName}`}
        className="relative flex h-28 items-center justify-center overflow-hidden bg-surface-muted sm:h-40"
      >
        {listing.imageUrl ? (
          <Image
            src={listing.imageUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, 50vw"
            className="object-cover"
          />
        ) : (
          <span className="text-xs text-ink-muted">Foto belum tersedia</span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
          {categoryLabel(listing.category)}
        </p>
        <h2 className="mt-1 truncate text-sm font-semibold text-ink">
          <Link
            href={`/products/${listing.productId}/breakdown`}
            className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {listing.productName}
          </Link>
        </h2>
        <p className="mt-0.5 truncate text-xs text-ink-muted">
          {listing.warehouseName}
          {listing.warehouseCity ? `, ${listing.warehouseCity}` : ""}
        </p>

        <p className="mt-2 flex items-baseline gap-1">
          <span className="font-heading text-lg font-bold tabular-nums tracking-tight text-ink">
            {formatIdr(listing.pricePerKg)}
          </span>
          <span className="text-xs text-ink-muted">/{listing.unit}</span>
        </p>
        <p className="mt-0.5 text-xs text-ink-muted">
          {formatKg(listing.availableKg)} tersedia
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
        </div>
      </div>
    </article>
  );
}
