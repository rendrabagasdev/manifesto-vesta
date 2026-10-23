import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { requireSession } from "@/src/lib/auth/session";
import { getFreshListings } from "@/src/lib/marketplace/queries";
import { ProductCard } from "@/src/components/marketplace/product-card";
import { EmptyState } from "@/src/components/shop/empty-state";

export const instant = false;

export const metadata: Metadata = {
  title: "Marketplace — Vesta",
  description: "Bahan pokok segar dengan harga normal dan skor kesegaran transparan.",
};

export default async function MarketplacePage() {
  await connection();
  await requireSession();
  const listings = await getFreshListings();

  return (
    <div>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Marketplace segar
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Batch dengan skor kesegaran ≥ 70 dijual dengan harga normal. Setiap
            kartu menunjukkan skor, asal petani, dan rincian harga — tanpa
            tengkulak.
          </p>
        </div>
        <Link
          href="/rescue-deals"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Rescue deals
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </header>

      <p className="mt-4 flex items-center gap-2 rounded-lg bg-brand-soft px-4 py-3 text-sm text-brand-strong">
        <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
        Harga yang Anda lihat sudah final — {listings.length} batch segar siap
        kirim hari ini.
      </p>

      {listings.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Belum ada batch segar"
            description="Semua batch sedang berada di tahap lain cascade, atau stok segar sudah habis. Cek Rescue Deals untuk batch dengan skor lebih rendah."
            action={
              <Link
                href="/rescue-deals"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-strong px-5 text-sm font-semibold text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                Lihat rescue deals
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <li key={listing.batchId} className="h-full">
              <ProductCard listing={listing} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
