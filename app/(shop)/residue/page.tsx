import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { requireSession } from "@/src/lib/auth/session";
import { getResidueListings } from "@/src/lib/marketplace/queries";
import { ListingCard } from "@/src/components/marketplace/listing-card";
import { EmptyState } from "@/src/components/shop/empty-state";
import { buyListingAction } from "@/app/(shop)/actions";

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
          layak jual.
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
              <ListingCard
                listing={listing}
                source="RESIDUE"
                action={buyListingAction}
                buyLabel="Beli residu"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
