import Image from "next/image";
import Link from "next/link";
import {
  Apple,
  Carrot,
  Drumstick,
  Leaf,
  Package,
  Sprout,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import type { MarketplaceListing } from "@/src/lib/marketplace/queries";
import { formatIdr, formatKg } from "@/src/lib/batches/format";
import {
  freshnessTone,
} from "@/src/components/marketplace/freshness-meter";
import { AddToCart } from "@/src/components/marketplace/add-to-cart";
import { categoryLabel } from "@/src/lib/marketplace/categories";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  VEGETABLE: Carrot,
  FRUIT: Apple,
  PROTEIN: Drumstick,
  STAPLE: Wheat,
  HERB: Sprout,
  OTHER: Package,
};

export function ProductCard({ listing }: { listing: MarketplaceListing }) {
  const Icon = CATEGORY_ICONS[listing.category] ?? Leaf;
  const tone = freshnessTone(listing.freshnessScore);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-shadow hover:shadow-sm">
      <Link
        href={`/products/${listing.productId}/breakdown`}
        aria-label={`Lihat rincian harga ${listing.productName}`}
        className="relative flex h-24 items-center justify-center overflow-hidden bg-brand-soft/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand sm:h-28"
      >
        {listing.imageUrl ? (
          <Image
            src={listing.imageUrl}
            alt=""
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, 50vw"
            className="object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <>
            <span
              aria-hidden="true"
              className="absolute -right-6 -top-8 size-24 rounded-full bg-surface/50"
            />
            <Icon
              className="relative size-9 text-brand-strong/70 transition-transform duration-200 group-hover:scale-110 sm:size-10"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-surface/90 px-2 py-0.5 text-[10px] font-semibold text-ink-muted">
          {categoryLabel(listing.category)}
        </span>
        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-surface/90 px-2 py-0.5 text-[10px] font-semibold text-ink">
          <span
            className={`size-1.5 rounded-full ${tone.barClassName}`}
            aria-hidden="true"
          />
          {tone.label} {Math.round(listing.freshnessScore)}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-3">
        <h2 className="truncate text-[13px] font-semibold text-ink sm:text-sm">
          <Link
            href={`/products/${listing.productId}/breakdown`}
            className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {listing.productName}
          </Link>
        </h2>
        <p className="mt-0.5 truncate text-[11px] text-ink-muted">
          {listing.warehouseName}
          {listing.warehouseCity ? `, ${listing.warehouseCity}` : ""}
        </p>

        <p className="mt-1.5 flex items-baseline gap-1">
          <span className="font-heading text-base font-bold tabular-nums tracking-tight text-ink">
            {formatIdr(listing.pricePerKg)}
          </span>
          <span className="text-[11px] text-ink-muted">/{listing.unit}</span>
        </p>
        <p className="mt-0.5 text-[11px] text-ink-muted">
          {formatKg(listing.availableKg)} tersedia
        </p>

        <div className="mt-auto pt-2.5">
          <AddToCart
            compact
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
