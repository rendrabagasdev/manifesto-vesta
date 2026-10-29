import type { Metadata } from "next";
import Image from "next/image";
import { connection } from "next/server";
import { requireSession } from "@/src/lib/auth/session";
import { getFeedListings } from "@/src/lib/marketplace/queries";
import { AddToCart } from "@/src/components/marketplace/add-to-cart";
import { EmptyState } from "@/src/components/shop/empty-state";
import { formatIdr, formatKg } from "@/src/lib/batches/format";

export const instant = false;

export const metadata: Metadata = {
  title: "Pakan — Vesta",
  description: "Marketplace pakan ternak dari batch yang tidak lagi layak konsumsi manusia.",
};

export default async function FeedPage() {
  await connection();
  await requireSession();
  const listings = await getFeedListings();

  return (
    <div>
      <header className="max-w-2xl">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Marketplace pakan
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Stok pakan ternak dengan harga di bawah pasar, langsung dari gudang. Masukkan ke keranjang lalu checkout dengan COD.
        </p>
      </header>

      {listings.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Belum ada listing pakan"
            description="Stok pakan akan muncul di sini saat tersedia. Gunakan simulasi waktu di dashboard admin untuk demo."
          />
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {listings.map((listing) => (
            <li key={listing.id} className="h-full">
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
                    {listing.tag ?? "Pakan"}
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
