import type { Metadata } from "next";
import { connection } from "next/server";
import { requireSession } from "@/src/lib/auth/session";
import { getFeedListings } from "@/src/lib/marketplace/queries";
import { ListingCard } from "@/src/components/marketplace/listing-card";
import { EmptyState } from "@/src/components/shop/empty-state";
import { buyListingAction } from "@/app/(shop)/actions";

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
          Batch dengan skor 10–29 tidak layak untuk manusia, tapi masih bernilai
          sebagai pakan ternak — harga per kg yang jauh lebih rendah dari harga
          segar.
        </p>
      </header>

      {listings.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Belum ada listing pakan"
            description="Batch akan muncul di sini ketika cascade memindahkannya ke tahap FEED. Gunakan simulasi waktu di dashboard admin untuk demo."
          />
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <li key={listing.id} className="h-full">
              <ListingCard
                listing={listing}
                source="FEED"
                action={buyListingAction}
                buyLabel="Beli pakan"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
