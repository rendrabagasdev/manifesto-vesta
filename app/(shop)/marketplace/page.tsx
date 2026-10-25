import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import {
  ArrowRight,
  ChevronRight,
  Flame,
  Leaf,
  Recycle,
  Search,
  Sparkles,
  Store,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import { requireSession } from "@/src/lib/auth/session";
import {
  getFreshListings,
  getRescueDeals,
} from "@/src/lib/marketplace/queries";
import { formatIdr, formatNumber } from "@/src/lib/batches/format";
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
  icon: LucideIcon;
  tone: string;
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
        {
          href: "/marketplace/bulk",
          label: "Grosir",
          icon: Store,
          tone: "bg-brand-soft text-brand-ink",
        },
        {
          href: "/rescue-deals",
          label: "Diskon",
          icon: Flame,
          tone: "bg-stage-rescue/30 text-ink",
        },
        {
          href: "/feed",
          label: "Pakan",
          icon: Wheat,
          tone: "bg-stage-feed/20 text-ink",
        },
        {
          href: "/impact",
          label: "Dampak",
          icon: Leaf,
          tone: "bg-brand-soft text-brand-ink",
        },
      ]
    : [
        {
          href: "/rescue-deals",
          label: "Diskon",
          icon: Flame,
          tone: "bg-stage-rescue/30 text-ink",
        },
        {
          href: "/feed",
          label: "Pakan",
          icon: Wheat,
          tone: "bg-stage-feed/20 text-ink",
        },
        {
          href: "/residue",
          label: "Residu",
          icon: Recycle,
          tone: "bg-stage-residue/20 text-ink",
        },
        {
          href: "/impact",
          label: "Dampak",
          icon: Leaf,
          tone: "bg-brand-soft text-brand-ink",
        },
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
            placeholder="Cari sayur, buah, atau protein"
            className="h-11 w-full rounded-full border border-line bg-surface pl-10 pr-20 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
          <button
            type="submit"
            className="absolute right-1 top-1 inline-flex h-9 items-center justify-center rounded-full bg-brand-strong px-4 text-xs font-semibold text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Cari
          </button>
        </form>
      </header>

      <div className="mt-5 space-y-4">
        <div className="space-y-4">
          <Link
            href={hasDeals ? "/rescue-deals" : "#produk"}
            className="group relative isolate flex min-h-36 overflow-hidden rounded-2xl bg-brand-strong text-on-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:min-h-44"
          >
            <span
              aria-hidden="true"
              className="absolute -right-8 -top-12 size-40 rounded-full bg-on-brand/10"
            />
            <span
              aria-hidden="true"
              className="absolute -bottom-20 right-20 size-48 rounded-full bg-stage-rescue/20"
            />
            <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center p-5 sm:p-6">
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-on-brand/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                <Sparkles className="size-3" aria-hidden="true" />
                {hasDeals ? "Penawaran hari ini" : "Langsung dari petani"}
              </span>
              <p className="mt-2 font-heading text-xl font-extrabold leading-tight tracking-tight sm:text-2xl">
                {hasDeals
                  ? `Hemat sampai ${Math.round(maxDiscount)}%`
                  : "Panen segar, harga jujur"}
              </p>
              <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-on-brand/80 sm:text-sm">
                {hasDeals
                  ? "Bahan segar berkualitas dengan harga lebih murah."
                  : "Belanja sayur, buah, dan protein tanpa tengkulak."}
              </p>
              <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-on-brand px-3 py-1.5 text-[11px] font-bold text-brand-ink sm:text-xs">
                {hasDeals ? "Lihat penawaran" : "Lihat produk"}
                <ArrowRight
                  className="size-3.5 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </div>
            <div className="relative z-10 flex w-24 shrink-0 items-end justify-center sm:w-40">
              <Image
                src="/assets/login-farmer.png"
                alt=""
                width={560}
                height={1004}
                sizes="(min-width: 640px) 160px, 96px"
                preload
                className="h-32 w-auto translate-y-1 drop-shadow-lg sm:h-48 lg:h-52"
              />
            </div>
          </Link>

          <nav
            aria-label="Akses cepat"
            className="grid grid-cols-4 gap-1 rounded-2xl border border-line bg-surface p-2 sm:gap-2 sm:p-3"
          >
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-center transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <span
                    className={`flex size-11 items-center justify-center rounded-full ${action.tone}`}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="text-[11px] font-semibold text-ink sm:text-xs">
                    {action.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <section aria-labelledby="deals-heading" className="mt-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2
              id="deals-heading"
              className="font-heading text-lg font-bold tracking-tight text-ink"
            >
              Penawaran diskon
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Harga turun, kualitas tetap terjaga.
            </p>
          </div>
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
          <ul className="-mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            {topDeals.map((deal) => (
              <li
                key={deal.id}
                className="w-[180px] shrink-0 snap-start sm:w-auto"
              >
                <Link
                  href="/rescue-deals"
                  className="flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-brand/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <div className="relative flex h-24 items-center justify-center overflow-hidden bg-stage-rescue/25">
                    {deal.imageUrl ? (
                      <Image
                        src={deal.imageUrl}
                        alt=""
                        fill
                        sizes="180px"
                        className="object-cover"
                      />
                    ) : (
                      <Flame
                        className="size-7 text-ink/60"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                    )}
                    <span className="absolute left-2 top-2 rounded-full bg-surface/90 px-2 py-0.5 text-[10px] font-semibold text-ink">
                      {deal.discountLabel}
                    </span>
                    {deal.discountPct > 0 ? (
                      <span className="absolute bottom-2 right-2 rounded-full bg-ink/85 px-2 py-0.5 font-heading text-sm font-extrabold tabular-nums text-on-brand">
                        −{formatNumber(deal.discountPct)}%
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col p-3">
                    <p className="truncate text-[13px] font-semibold text-ink">
                      {deal.productName}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-ink-muted">
                      {deal.warehouseName}
                    </p>
                    <p className="mt-1.5 flex items-baseline gap-1.5">
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
                      Selama stok tersedia
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
              {q ? "Hasil pencarian" : "Segar hari ini"}
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              {q
                ? `${filteredListings.length} hasil untuk “${q}”`
                : `${filteredListings.length} batch siap kirim`}
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
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
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
                      ? "inline-flex h-8 shrink-0 items-center rounded-full bg-brand-strong px-3.5 text-xs font-semibold text-on-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                      : "inline-flex h-8 shrink-0 items-center rounded-full border border-line bg-surface px-3.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
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
              description="Coba kata kunci lain atau lihat semua produk segar."
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
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {filteredListings.map((listing) => (
              <li key={listing.batchId} className="h-full">
                <ProductCard listing={listing} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 flex flex-col gap-3 rounded-2xl border border-line bg-brand-soft p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-brand-ink">
            <Leaf className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-brand-ink">
              Dampak belanja Anda
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              Lihat bahan yang tidak terbuang dari setiap pesanan.
            </p>
          </div>
        </div>
        <Link
          href="/impact"
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-lg bg-surface px-4 text-xs font-semibold text-brand-ink transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Lihat dampak
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}
