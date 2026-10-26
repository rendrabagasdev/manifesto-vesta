import type { Metadata } from "next";
import { connection } from "next/server";
import { requireRole } from "@/src/lib/auth/session";
import { getFreshListings, getImpactSummaryFor } from "@/src/lib/marketplace/queries";
import { dateInputValue, formatInteger, formatNumber } from "@/src/lib/batches/format";
import { BulkOrderForm } from "@/src/components/marketplace/bulk-order-form";
import { EmptyState } from "@/src/components/shop/empty-state";

export const instant = false;

export const metadata: Metadata = {
  title: "Pesanan grosir — Vesta",
  description: "Pre-order jumlah besar, pesanan berulang, dan sertifikat dampak untuk mitra B2B.",
};

const BULK_FLOW = [
  "Pilih produk, jumlah, dan jadwal pengiriman pertama.",
  "Gudang mengonfirmasi ketersediaan sebelum invoice terbit.",
  "Pesanan berulang disimpan sebagai catatan — gudang menyiapkan stok sesuai frekuensi yang dipilih.",
] as const;

export default async function BulkMarketplacePage() {
  await connection();
  await requireRole(["BUSINESS", "ADMIN"]);
  const [listings, impact] = await Promise.all([
    getFreshListings(),
    getImpactSummaryFor(),
  ]);

  const batches = listings.map((listing) => ({
    batchId: listing.batchId,
    productName: listing.productName,
    unit: listing.unit,
    pricePerKg: listing.pricePerKg,
    maxKg: listing.availableKg,
    warehouseName: listing.warehouseName,
  }));

  return (
    <div>
      <header className="max-w-2xl">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Pesanan grosir &amp; pre-order
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Pesan dalam jumlah besar dengan jadwal pengiriman tetap. Pre-order
          dikonfirmasi gudang sebelum pembayaran — cocok untuk kebutuhan dapur
          harian.
        </p>
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px] lg:items-start">
        <section aria-labelledby="bulk-form-heading" className="rounded-xl border border-line bg-surface p-5">
          <h2 id="bulk-form-heading" className="text-sm font-semibold text-ink">
            Buat pre-order
          </h2>
          <div className="mt-4">
            {batches.length === 0 ? (
              <EmptyState
                title="Belum ada produk untuk dipesan"
                description="Pre-order membutuhkan stok aktif. Cek kembali setelah pasokan baru masuk."
              />
            ) : (
              <BulkOrderForm batches={batches} today={dateInputValue()} />
            )}
          </div>
        </section>

        <div className="grid gap-4">
          <section aria-labelledby="certificate-heading" className="rounded-xl border border-line bg-surface p-5">
            <h2 id="certificate-heading" className="text-sm font-semibold text-ink">
              Sertifikat dampak
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              Ringkasan kontribusi platform untuk laporan ESG mitra B2B —
              dihasilkan dari impact ledger saat ini.
            </p>
            <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">Tidak terbuang</dt>
                <dd className="font-semibold tabular-nums text-ink">
                  {formatNumber(impact.totalRescuedKg)} kg
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">CO₂e dihindari</dt>
                <dd className="font-semibold tabular-nums text-ink">
                  {formatNumber(impact.totalCo2eSavedKg)} kg
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">Transaksi</dt>
                <dd className="font-semibold tabular-nums text-ink">
                  {formatInteger(impact.totalTransactions)}
                </dd>
              </div>
            </dl>
            <a
              href="/api/certificate"
              className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg border border-line px-4 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Unduh PDF sertifikat
            </a>
          </section>

          <section aria-labelledby="how-heading" className="rounded-xl border border-line bg-surface p-5">
            <h2 id="how-heading" className="text-sm font-semibold text-ink">
              Cara kerja pre-order
            </h2>
            <ul className="mt-3 space-y-3">
              {BULK_FLOW.map((step) => (
                <li key={step} className="flex items-start gap-2.5">
                  <span
                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-soft ring-1 ring-brand/30"
                    aria-hidden="true"
                  />
                  <span className="text-sm leading-relaxed text-ink-muted">
                    {step}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
