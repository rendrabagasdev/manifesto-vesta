import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { requireSession } from "@/src/lib/auth/session";
import { getResidueListings } from "@/src/lib/marketplace/queries";
import { AddToCart } from "@/src/components/marketplace/add-to-cart";
import { EmptyState } from "@/src/components/shop/empty-state";
import { formatIdr, formatKg } from "@/src/lib/batches/format";

export const instant = false;

export const metadata: Metadata = {
  title: "Residu — Vesta",
  description: "Marketplace residu organik: kompos, biogas, maggot BSF.",
};

export default async function ResiduePage({
  searchParams,
}: {
  searchParams: Promise<{ jenis?: string }>;
}) {
  await connection();
  await requireSession();
  const { jenis } = await searchParams;
  const all = await getResidueListings();

  const processingTypes = Array.from(
    new Set(all.map((listing) => listing.tag).filter((tag): tag is string => Boolean(tag))),
  ).sort();

  const active = jenis && processingTypes.includes(jenis) ? jenis : null;
  const listings = active
    ? all.filter((listing) => listing.tag === active)
    : all;

  return (
    <div>
      <header className="max-w-2xl">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Marketplace residu
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Bahan baku kompos, biogas, dan media maggot dari stok yang tidak lagi
          layak jual. Masukkan ke keranjang lalu checkout dengan COD.
        </p>
      </header>

      {processingTypes.length > 0 ? (
        <nav
          aria-label="Filter jenis pengolahan"
          className="-mx-4 mt-5 flex gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden"
        >
          <Link
            href="/residue"
            aria-current={active === null ? "true" : undefined}
            className={`inline-flex h-8 shrink-0 items-center rounded-md px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              active === null
                ? "bg-brand-strong font-semibold text-on-brand"
                : "border border-line bg-surface text-ink-muted hover:text-ink"
            }`}
          >
            Semua ({all.length})
          </Link>
          {processingTypes.map((type) => (
            <Link
              key={type}
              href={`/residue?jenis=${encodeURIComponent(type)}`}
              aria-current={active === type ? "true" : undefined}
              className={`inline-flex h-8 shrink-0 items-center rounded-md px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                active === type
                  ? "bg-brand-strong font-semibold text-on-brand"
                  : "border border-line bg-surface text-ink-muted hover:text-ink"
              }`}
            >
              {type} ({all.filter((listing) => listing.tag === type).length})
            </Link>
          ))}
        </nav>
      ) : null}

      {listings.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={active ? `Tidak ada listing ${active.toLowerCase()}` : "Belum ada listing residu"}
            description={
              active
                ? "Coba jenis pengolahan lain — setiap batch dialihkan sesuai kondisinya."
                : "Batch akan muncul di sini ketika cascade memindahkannya ke tahap RESIDUE."
            }
            action={
              active ? (
                <Link
                  href="/residue"
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-line px-5 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  Lihat semua residu
                </Link>
              ) : undefined
            }
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
                    {listing.tag ?? "Residu"}
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
