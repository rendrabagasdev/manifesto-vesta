import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { getProductBreakdown } from "@/src/lib/marketplace/queries";
import { formatIdr, formatKg, formatNumber } from "@/src/lib/batches/format";
import { isBatchStatus } from "@/src/lib/batches/freshness";
import { StatusPill } from "@/src/components/status-pill";
import { FreshnessMeter } from "@/src/components/marketplace/freshness-meter";
import { PriceBreakdownBar, type BreakdownPart } from "@/src/components/marketplace/price-breakdown-bar";

export const instant = false;

export const metadata: Metadata = {
  title: "Rincian harga — Vesta",
  description: "Bukti transparansi harga: berapa untuk petani, berapa untuk platform.",
};

export default async function ProductBreakdownPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId) || productId <= 0) notFound();

  const view = await getProductBreakdown(productId);
  if (!view) notFound();

  const parts: BreakdownPart[] = [
    { label: "Harga petani", amountPerKg: view.breakdown.basePricePerKg, className: "bg-brand" },
    { label: "Biaya gudang", amountPerKg: view.breakdown.warehouseCostPerKg, className: "bg-stage-rescue" },
    { label: "Logistik", amountPerKg: view.breakdown.logisticsCostPerKg, className: "bg-stage-feed" },
    { label: "Margin platform", amountPerKg: view.breakdown.marginPerKg, className: "bg-stage-residue" },
  ];

  const farmerShare = Math.round(
    (view.breakdown.basePricePerKg / view.breakdown.grossPricePerKg) * 100,
  );

  return (
    <div>
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Kembali ke marketplace
      </Link>

      <header className="mt-4 max-w-2xl">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Ke mana uang Anda pergi
        </h1>
        <p className="mt-2 text-base leading-relaxed text-ink-muted">
          Rincian harga {view.product.name} per {view.product.unit} — bukti bahwa
          Vesta bekerja tanpa tengkulak.
        </p>
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section
          aria-labelledby="breakdown-heading"
          className="rounded-xl border border-line bg-surface p-5 lg:col-span-2"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="breakdown-heading" className="text-sm font-semibold text-ink">
              Komposisi harga
            </h2>
            <p className="font-heading text-2xl font-bold tabular-nums tracking-tight text-ink">
              {formatIdr(view.breakdown.grossPricePerKg)}
              <span className="text-sm font-semibold text-ink-muted"> /{view.product.unit}</span>
            </p>
          </div>

          <PriceBreakdownBar parts={parts} className="mt-4" />

          <div className="mt-5 rounded-lg bg-brand-soft px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-brand-strong">
              <ShieldCheck className="size-4" aria-hidden="true" />
              {farmerShare}% dari harga jual sampai ke petani
            </p>
            <p className="mt-1 text-xs leading-relaxed text-brand-strong/80">
              Tengkulak tradisional memotong 25–40% sebelum petani dibayar. Di
              Vesta, harga dasar disepakati produsen dan tercatat di ledger.
            </p>
          </div>
        </section>

        <div className="grid gap-4">
          <section aria-labelledby="origin-heading" className="rounded-xl border border-line bg-surface p-5">
            <h2 id="origin-heading" className="text-sm font-semibold text-ink">
              Asal &amp; penanganan
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="shrink-0 text-ink-muted">Petani</dt>
                <dd className="min-w-0 text-right font-semibold text-ink">
                  {view.producer?.farmName ?? "-"}
                </dd>
              </div>
              {view.producer?.address ? (
                <div className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-ink-muted">Alamat</dt>
                  <dd className="min-w-0 text-right text-xs leading-relaxed text-ink">
                    {view.producer.address}
                  </dd>
                </div>
              ) : null}
              <div className="flex items-start justify-between gap-3">
                <dt className="shrink-0 text-ink-muted">Gudang</dt>
                <dd className="min-w-0 text-right font-semibold text-ink">
                  {view.warehouse ? `${view.warehouse.name}${view.warehouse.city ? ` · ${view.warehouse.city}` : ""}` : "-"}
                </dd>
              </div>
            </dl>
          </section>

          {view.batch ? (
            <section aria-labelledby="batch-heading" className="rounded-xl border border-line bg-surface p-5">
              <h2 id="batch-heading" className="text-sm font-semibold text-ink">
                Batch terbaru
              </h2>
              <div className="mt-3 flex items-center justify-between gap-3">
                <Link
                  href={`/trace/${view.batch.code}`}
                  className="truncate text-sm font-semibold text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  {view.batch.code}
                </Link>
                {isBatchStatus(view.batch.status) ? <StatusPill status={view.batch.status} /> : null}
              </div>
              <div className="mt-3">
                <FreshnessMeter score={view.batch.freshnessScore} size="sm" />
              </div>
              <p className="mt-3 text-xs text-ink-muted">
                {formatKg(view.batch.availableKg)} tersedia dari batch ini.
              </p>
            </section>
          ) : null}
        </div>
      </div>

      {view.product.description ? (
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-muted">
          {view.product.description}
        </p>
      ) : null}

      <p className="mt-2 text-xs text-ink-muted">
        Harga dihitung ulang otomatis saat skor kesegaran berubah — skor saat ini{" "}
        {formatNumber(view.batch?.freshnessScore ?? 0)}/100.
      </p>
    </div>
  );
}
