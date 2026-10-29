import type { Metadata } from "next";
import { connection } from "next/server";
import { requireSession } from "@/src/lib/auth/session";
import { getImpactSummaryFor } from "@/src/lib/marketplace/queries";
import {
  formatInteger,
  formatNumber,
} from "@/src/lib/batches/format";
import { ShareLink } from "@/src/components/shop/share-link";
import { EmptyState } from "@/src/components/shop/empty-state";

export const instant = false;

export const metadata: Metadata = {
  title: "Sertifikat dampak — Vesta",
  description: "Metrik dampak personal Anda, siap diunduh sebagai PDF dan dibagikan.",
};

export default async function ImpactCertificatePage() {
  await connection();
  const user = await requireSession();
  const impact = await getImpactSummaryFor(undefined, Number(user.id));

  const hasActivity = impact.totalTransactions > 0;
  const displayName = user.name ?? user.email;

  return (
    <div>
      <header className="max-w-2xl">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Sertifikat dampak
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Ringkasan kontribusi {displayName} di Vesta — dihitung dari impact
          ledger untuk setiap transaksi yang selesai.
        </p>
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-3 lg:items-start">
        <section
          aria-labelledby="impact-heading"
          className="rounded-xl border border-line bg-surface p-5 lg:col-span-2"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="impact-heading" className="text-sm font-semibold text-ink">
                Kontribusi pembelian Anda
              </h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                {formatInteger(impact.totalTransactions)} transaksi tercatat
              </p>
            </div>
            <a
              href="/api/certificate"
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-brand-strong px-4 text-sm font-semibold text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Unduh PDF
            </a>
          </div>

          <ul className="mt-4 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
            <li className="bg-surface p-4">
              <p className="text-xs text-ink-muted">
                Bahan tidak terbuang
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">
                {formatNumber(impact.totalRescuedKg)}
                <span className="text-sm font-normal text-ink-muted"> kg</span>
              </p>
            </li>
            <li className="bg-surface p-4">
              <p className="text-xs text-ink-muted">
                CO₂e dihindari
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">
                {formatNumber(impact.totalCo2eSavedKg)}
                <span className="text-sm font-normal text-ink-muted"> kg</span>
              </p>
            </li>
            <li className="bg-surface p-4">
              <p className="text-xs text-ink-muted">
                Air dihemat
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">
                {formatInteger(impact.totalWaterSavedLiters)}
                <span className="text-sm font-normal text-ink-muted"> L</span>
              </p>
            </li>
          </ul>

          <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">Waste Diversion Rate platform</dt>
              <dd className="font-semibold tabular-nums text-ink">
                {formatNumber(impact.wasteDiversionRate)}%
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">Total batch diproses</dt>
              <dd className="font-semibold tabular-nums text-ink">
                {formatInteger(impact.totalBatchesProcessed)}
              </dd>
            </div>
          </dl>
        </section>

        <div className="grid gap-4">
          <section aria-labelledby="share-heading" className="rounded-xl border border-line bg-surface p-5">
            <h2 id="share-heading" className="text-sm font-semibold text-ink">
              Bagikan dampak Anda
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
              Salin tautan halaman ini untuk laporan internal atau daur ulang
              publik — angka terupdate otomatis dari impact ledger.
            </p>
            <div className="mt-3">
              <ShareLink label="Tautan sertifikat" />
            </div>
            <p className="mt-3 text-xs text-ink-muted">
              Untuk laporan ESG formal, gunakan unduhan PDF — dokumennya
              ditandatangani secara digital oleh sistem.
            </p>
          </section>

          <section className="rounded-xl border border-line bg-surface p-5">
            <p className="text-xs font-semibold text-ink">Cara angka dihitung</p>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
              Setiap transaksi mencatat berat batch per tahap cascade ke impact
              ledger. Faktor emisi publik per kategori komoditas mengonversi
              berat menjadi CO₂e dan air. Angka bersifat estimasi — verifikasi
              pihak ketiga masuk fase berikutnya.
            </p>
          </section>
        </div>
      </div>

      {!hasActivity ? (
        <div className="mt-6">
          <EmptyState
            title="Belum ada dampak yang tercatat"
            description="Sertifikat akan terisi otomatis setelah transaksi pertama Anda selesai — mulai dari katalog produk atau penawaran diskon."
          />
        </div>
      ) : null}
    </div>
  );
}
