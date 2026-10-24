import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, ScanLine } from "lucide-react";
import { getTraceByBatchIdOrCode } from "@/src/lib/marketplace/queries";
import {
  formatDate,
  formatDateTime,
  formatIdr,
  formatInteger,
  formatKg,
  formatNumber,
} from "@/src/lib/batches/format";
import { isBatchStatus, STATUS_META } from "@/src/lib/batches/freshness";
import { StatusPill } from "@/src/components/status-pill";
import { FreshnessMeter } from "@/src/components/marketplace/freshness-meter";
import { PriceBreakdownBar, type BreakdownPart } from "@/src/components/marketplace/price-breakdown-bar";

export const instant = false;

export const metadata: Metadata = {
  title: "Traceability — Vesta",
  description: "Perjalanan batch: produsen → gudang → pembeli, dengan skor kesegaran dan rincian harga.",
};

export default async function TracePage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  await connection();
  const { batchId } = await params;
  const trace = await getTraceByBatchIdOrCode(batchId);

  if (!trace) notFound();

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  const traceUrl = `${protocol}://${host}/trace/${trace.batch.code}`;

  const priceParts: BreakdownPart[] | null = trace.price
    ? [
        { label: "Harga petani", amountPerKg: trace.price.basePricePerKg, className: "bg-brand" },
        { label: "Biaya gudang", amountPerKg: trace.price.warehouseCostPerKg, className: "bg-stage-rescue" },
        { label: "Logistik", amountPerKg: trace.price.logisticsCostPerKg, className: "bg-stage-feed" },
        { label: "Margin platform", amountPerKg: trace.price.marginPerKg, className: "bg-stage-residue" },
      ]
    : null;

  const NEXT_STAGE: Record<string, { label: string; note: string; dot: string } | null> = {
    FRESH: { label: "Layu", note: "jika skor turun di bawah 70", dot: "bg-stage-rescue" },
    RESCUE: { label: "Pakan", note: "jika skor turun di bawah 30", dot: "bg-stage-feed" },
    FEED: { label: "Residu", note: "jika skor turun di bawah 10", dot: "bg-stage-residue" },
    RESIDUE: { label: "Dibuang", note: "jika skor mencapai 0", dot: "bg-stage-disposed" },
    DISPOSED: null,
  };
  const nextStage = isBatchStatus(trace.batch.status)
    ? NEXT_STAGE[trace.batch.status] ?? null
    : null;

  return (
    <div>
      <Link
        href="/impact"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Kembali ke laporan dampak
      </Link>

      <header className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {trace.product.name}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
            <span className="font-semibold text-ink">{trace.batch.code}</span>
            {isBatchStatus(trace.batch.status) ? <StatusPill status={trace.batch.status} /> : null}
            <span aria-hidden="true">·</span>
            <span>{formatKg(trace.batch.quantityKg)}</span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-4 rounded-xl border border-line bg-surface p-4">
          <QRCodeSVG value={traceUrl} size={96} level="M" aria-label={`QR traceability ${trace.batch.code}`} />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <ScanLine className="size-4" aria-hidden="true" />
              QR batch
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
              Tempel di kemasan — pembeli bisa memverifikasi perjalanan batch ini.
            </p>
          </div>
        </div>
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section
          aria-labelledby="journey-heading"
          className="self-start rounded-xl border border-line bg-surface lg:col-span-2"
        >
          <div className="border-b border-line px-4 py-3">
            <h2 id="journey-heading" className="text-sm font-semibold text-ink">
              Perjalanan batch
            </h2>
          </div>

          <ol className="px-4 py-2">
            {trace.timeline.map((event, index) => (
              <li key={index} className="relative flex gap-3 pb-5 last:pb-2">
                {index < trace.timeline.length - 1 ? (
                  <span
                    className="absolute left-[7px] top-5 h-full w-px bg-line"
                    aria-hidden="true"
                  />
                ) : null}
                <span
                  className={`relative mt-1.5 size-3.5 shrink-0 rounded-full border-2 border-surface ${
                    event.stage === "PENJUALAN"
                      ? "bg-brand"
                      : event.stage === "PENERIMAAN" || event.stage === "PRODUKSI"
                        ? "bg-stage-fresh"
                        : isBatchStatus(event.stage)
                          ? STATUS_META[event.stage].dotClassName
                          : "bg-ink-muted"
                  }`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <p className="text-sm font-semibold text-ink">{event.title}</p>
                    <p className="text-xs tabular-nums text-ink-muted">
                      {typeof event.timestamp === "string" &&
                      /^\d{4}-\d{2}-\d{2}$/.test(event.timestamp)
                        ? formatDate(event.timestamp)
                        : formatDateTime(event.timestamp)}
                    </p>
                  </div>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">
                    {event.description}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">{event.actor}</p>
                  {event.freshnessScore !== null ? (
                    <div className="mt-2 max-w-48">
                      <FreshnessMeter score={event.freshnessScore} size="sm" />
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>

          <div className="border-t border-line px-4 py-3">
            {nextStage ? (
              <p className="flex items-center gap-2 text-sm text-ink-muted">
                <span
                  className={`size-1.5 shrink-0 rounded-full ${nextStage.dot}`}
                  aria-hidden="true"
                />
                Tahap berikutnya:{" "}
                <span className="font-semibold text-ink">{nextStage.label}</span>{" "}
                {nextStage.note}.
              </p>
            ) : (
              <p className="text-sm text-ink-muted">
                Batch ini telah menyelesaikan seluruh tahap cascade.
              </p>
            )}
          </div>
        </section>

        <div className="grid gap-4">
          <section aria-labelledby="score-heading" className="rounded-xl border border-line bg-surface p-4">
            <h2 id="score-heading" className="text-sm font-semibold text-ink">
              Kondisi saat ini
            </h2>
            <div className="mt-3">
              <FreshnessMeter score={trace.batch.freshnessScore} />
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">Suhu simpan</dt>
                <dd className="font-semibold tabular-nums text-ink">
                  {formatNumber(trace.batch.storageTempC)}°C
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">Tanggal panen</dt>
                <dd className="font-semibold tabular-nums text-ink">
                  {formatDate(trace.batch.harvestDate)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">Produsen</dt>
                <dd className="min-w-0 truncate text-right font-semibold text-ink">
                  {trace.producer?.farmName ?? "-"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">Gudang</dt>
                <dd className="min-w-0 truncate text-right font-semibold text-ink">
                  {trace.warehouse.name}
                </dd>
              </div>
            </dl>
            {trace.batch.qualityNote ? (
              <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2 text-xs leading-relaxed text-ink-muted">
                Catatan inspeksi: {trace.batch.qualityNote}
              </p>
            ) : null}
          </section>

          <section aria-labelledby="impact-heading" className="rounded-xl border border-line bg-surface p-4">
            <h2 id="impact-heading" className="text-sm font-semibold text-ink">
              Dampak batch ini
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">Tidak terbuang</dt>
                <dd className="font-semibold tabular-nums text-ink">
                  {formatKg(trace.impact.rescuedKg)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">CO₂e dihindari</dt>
                <dd className="font-semibold tabular-nums text-ink">
                  {formatNumber(trace.impact.co2eSavedKg)} kg
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">Air dihemat</dt>
                <dd className="font-semibold tabular-nums text-ink">
                  {formatInteger(trace.impact.waterSavedLiters)} L
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>

      {priceParts ? (
        <section aria-labelledby="price-heading" className="mt-4 rounded-xl border border-line bg-surface p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="price-heading" className="text-sm font-semibold text-ink">
              Rincian harga per kg
            </h2>
            <p className="text-sm font-semibold tabular-nums text-ink">
              {formatIdr(trace.price!.finalPricePerKg)}
              <span className="text-xs font-normal text-ink-muted"> /kg akhir</span>
            </p>
          </div>
          <PriceBreakdownBar parts={priceParts} className="mt-4" />
          <p className="mt-3 text-xs leading-relaxed text-ink-muted">
            Harga petani adalah bagian terbesar — Vesta tidak memotong margin
            tengkulak, hanya biaya gudang, logistik, dan margin platform yang
            terlihat.
          </p>
        </section>
      ) : null}
    </div>
  );
}
