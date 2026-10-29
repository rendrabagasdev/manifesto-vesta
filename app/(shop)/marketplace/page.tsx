import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { ChevronRight, Search } from "lucide-react";
import { requireSession } from "@/src/lib/auth/session";
import {
  getFreshListings,
  getRescueDeals,
} from "@/src/lib/marketplace/queries";
import { formatIdr, formatKg, formatNumber } from "@/src/lib/batches/format";
import {
  CATEGORY_ORDER,
  categoryLabel,
} from "@/src/lib/marketplace/categories";
import { ProductCard } from "@/src/components/marketplace/product-card";
import { EmptyState } from "@/src/components/shop/empty-state";

export const instant = false;

export const metadata: Metadata = {
  title: "Beranda — Vesta",
  description:
    "Bahan segar langsung dari petani, penawaran diskon, dan grosir untuk usaha.",
};

interface QuickAction {
  href: string;
  label: string;
}

function buildMarketplaceHref({
  q,
  category,
}: {
  q?: string;
  category?: string;
}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  const query = params.toString();
  return query ? `/marketplace?${query}` : "/marketplace";
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await connection();
  const user = await requireSession();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const rawCategory =
    typeof params.category === "string" ? params.category : "";

  const [listings, deals] = await Promise.all([
    getFreshListings(),
    getRescueDeals(),
  ]);

  const availableCategories = CATEGORY_ORDER.filter((category) =>
    listings.some((listing) => listing.category === category),
  );
  const activeCategory =
    rawCategory.length > 0 &&
    availableCategories.some((category) => category === rawCategory)
      ? rawCategory
      : "";

  const normalizedQuery = q.toLowerCase();
  const filteredListings = listings.filter((listing) => {
    if (activeCategory && listing.category !== activeCategory) return false;
    if (!normalizedQuery) return true;
    return [
      listing.productName,
      listing.warehouseName,
      listing.warehouseCity ?? "",
      listing.producerFarmName ?? "",
      categoryLabel(listing.category),
    ].some((value) => value.toLowerCase().includes(normalizedQuery));
  });

  const topDeals = deals.slice(0, 4);
  const maxDiscount = deals.reduce(
    (max, deal) => Math.max(max, deal.discountPct),
    0,
  );
  const hasDeals = deals.length > 0;

  const canBulk = user.role === "BUSINESS" || user.role === "ADMIN";
  const quickActions: QuickAction[] = canBulk
    ? [
        { href: "/marketplace/bulk", label: "Grosir" },
        { href: "/rescue-deals", label: "Diskon" },
        { href: "/feed", label: "Pakan" },
      ]
    : [
        { href: "/rescue-deals", label: "Diskon" },
        { href: "/feed", label: "Pakan" },
        { href: "/residue", label: "Residu" },
      ];

  const firstName = user.name?.trim().split(/\s+/)[0] || "Sahabat";

  return (
    <div>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs text-ink-muted">Selamat datang di Vesta</p>
          <h1 className="mt-0.5 font-heading text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Halo, {firstName}
          </h1>
        </div>

        <form
          action="/marketplace"
          method="get"
          role="search"
          className="relative w-full sm:max-w-md"
        >
          <label htmlFor="home-search" className="sr-only">
            Cari produk
          </label>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          {activeCategory ? (
            <input type="hidden" name="category" value={activeCategory} />
          ) : null}
          <input
            key={q}
            id="home-search"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Cari produk"
            className="h-11 w-full rounded-lg border border-line bg-surface pl-10 pr-20 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
          <button
            type="submit"
            className="absolute right-1 top-1 inline-flex h-9 items-center justify-center rounded-md bg-brand-strong px-4 text-xs font-semibold text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Cari
          </button>
        </form>
      </header>

      <div className="mt-5 space-y-3">
        <section className="rounded-xl border border-line bg-surface px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-ink">
                {hasDeals ? "Penawaran hari ini" : "Katalog produk"}
              </p>
              <h2 className="mt-1.5 font-heading text-xl font-bold tracking-tight text-ink sm:text-2xl">
                {hasDeals
                  ? `Hemat hingga ${Math.round(maxDiscount)}%`
                  : "Belanja langsung dari sumbernya"}
              </h2>
              <p className="mt-1.5 max-w-md text-sm leading-relaxed text-ink-muted">
                {hasDeals
                  ? "Harga khusus untuk stok yang mendekati akhir masa jual."
                  : "Harga jelas, stok terbaru, tanpa perantara."}
              </p>
            </div>
            <Link
              href={hasDeals ? "/rescue-deals" : "#produk"}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-brand-strong px-4 text-sm font-semibold text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {hasDeals ? "Lihat penawaran" : "Lihat produk"}
            </Link>
          </div>
        </section>

        <nav
          aria-label="Akses cepat"
          className="grid grid-cols-3 gap-2 rounded-xl border border-line bg-surface p-2"
        >
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="inline-flex h-10 items-center justify-center rounded-lg text-sm font-semibold text-ink transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {action.label}
            </Link>
          ))}
        </nav>
      </div>

      <section aria-labelledby="deals-heading" className="mt-6">
        <div className="flex items-end justify-between gap-3">
          <h2
            id="deals-heading"
            className="font-heading text-lg font-bold tracking-tight text-ink"
          >
            Penawaran diskon
          </h2>
          <Link
            href="/rescue-deals"
            className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-brand-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Lihat semua
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>

        {!hasDeals ? (
          <p className="mt-3 rounded-xl border border-dashed border-line bg-surface px-4 py-6 text-center text-sm text-ink-muted">
            Belum ada penawaran diskon hari ini.
          </p>
        ) : (
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {topDeals.map((deal) => (
              <li key={deal.id} className="h-full">
                <Link
                  href="/rescue-deals"
                  className="flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-brand/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <div className="relative flex h-28 items-center justify-center overflow-hidden bg-surface-muted sm:h-36">
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
                    <p className="mt-1 truncate text-sm font-semibold text-ink">
                      {deal.productName}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-ink-muted">
                      {deal.warehouseName}
                    </p>
                    <p className="mt-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                      <span className="font-heading text-base font-bold tabular-nums tracking-tight text-ink">
                        {formatIdr(deal.rescuePricePerKg)}
                      </span>
                      {deal.originalPricePerKg > deal.rescuePricePerKg ? (
                        <span className="text-[11px] tabular-nums text-ink-muted line-through">
                          {formatIdr(deal.originalPricePerKg)}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-auto pt-1.5 text-[11px] text-ink-muted">
                      {formatKg(deal.availableKg)} tersedia
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        id="produk"
        aria-labelledby="products-heading"
        className="mt-6 scroll-mt-20"
      >
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2
              id="products-heading"
              className="font-heading text-lg font-bold tracking-tight text-ink"
            >
              {q ? "Hasil pencarian" : "Katalog produk"}
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              {q
                ? `${filteredListings.length} hasil untuk “${q}”`
                : `${filteredListings.length} produk tersedia`}
            </p>
          </div>
          {q || activeCategory ? (
            <Link
              href="/marketplace"
              className="inline-flex h-8 shrink-0 items-center rounded-full border border-line bg-surface px-3 text-xs font-semibold text-ink transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Reset
            </Link>
          ) : null}
        </div>

        {availableCategories.length > 1 ? (
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden">
            {[
              { value: "", label: "Semua" },
              ...availableCategories.map((value) => ({
                value,
                label: categoryLabel(value),
              })),
            ].map((option) => {
              const active = activeCategory === option.value;
              return (
                <Link
                  key={option.value || "all"}
                  href={buildMarketplaceHref({ q, category: option.value })}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "inline-flex h-8 shrink-0 items-center rounded-md bg-brand-strong px-3 text-xs font-semibold text-on-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                      : "inline-flex h-8 shrink-0 items-center rounded-md border border-line bg-surface px-3 text-xs font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  }
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
        ) : null}

        {filteredListings.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Produk tidak ditemukan"
              description="Coba kata kunci lain atau lihat semua produk."
              action={
                <Link
                  href="/marketplace"
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-strong px-5 text-sm font-semibold text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  Lihat semua produk
                </Link>
              }
            />
          </div>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {filteredListings.map((listing) => (
              <li key={listing.batchId} className="h-full">
                <ProductCard listing={listing} />
              </li>
            ))}
          </ul>
        )}
      </section>

    </div>
  );
}
