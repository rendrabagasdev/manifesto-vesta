import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { connection } from "next/server";
import { QRCodeSVG } from "qrcode.react";
import { ArrowRight, Droplets, Leaf, Recycle, ScanLine } from "lucide-react";
import {
  getImpactSummaryFor,
  getRecentTraceableBatches,
} from "@/src/lib/marketplace/queries";
import { formatInteger, formatNumber } from "@/src/lib/batches/format";
import { StatusPill } from "@/src/components/status-pill";
import { STATUS_META, isBatchStatus } from "@/src/lib/batches/freshness";

export const instant = false;

export const metadata: Metadata = {
  title: "Dampak — Vesta",
  description:
    "Laporan dampak publik Vesta: bahan tidak terbuang, CO₂e dihindari, air dihemat, dan Waste Diversion Rate.",
};

const COUNTERS = [
  {
    key: "kg",
    label: "Bahan tidak terbuang",
    unit: "kg",
    icon: Leaf,
  },
  {
    key: "co2e",
    label: "Emisi CO₂e dihindari",
    unit: "kg CO₂e",
    icon: Recycle,
  },
  {
    key: "water",
    label: "Air dihemat",
    unit: "liter",
    icon: Droplets,
  },
] as const;

export default async function ImpactPage() {
  await connection();
  const [summary, batches] = await Promise.all([
    getImpactSummaryFor(),
    getRecentTraceableBatches(6),
  ]);

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  const impactUrl = `${protocol}://${host}/impact`;

  return (
    <div>
      <header className="max-w-2xl">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Dampak yang bisa dihitung.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-muted">
          Bahan yang tidak terbuang dari setiap transaksi, dihitung otomatis dan
          bisa dicek lewat QR tiap batch.
        </p>
      </header>

      <section
        aria-label="Counter dampak"
        className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3"
      >
        {COUNTERS.map((counter) => {
          const value =
            counter.key === "kg"
              ? summary.totalRescuedKg
              : counter.key === "co2e"
                ? summary.totalCo2eSavedKg
                : summary.totalWaterSavedLiters;

          return (
            <div key={counter.key} className="bg-surface p-6">
              <p className="flex items-center gap-2 text-sm font-medium text-ink-muted">
                <counter.icon className="size-4" aria-hidden="true" />
                {counter.label}
              </p>
              <p className="mt-2 font-heading text-4xl font-extrabold tabular-nums tracking-tight text-ink">
                {counter.key === "water" ? formatInteger(value) : formatNumber(value)}
                <span className="ml-1.5 text-base font-semibold text-ink-muted">
                  {counter.unit}
                </span>
              </p>
            </div>
          );
        })}
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section
          aria-labelledby="wdr-heading"
          className="rounded-xl border border-line bg-surface p-6 lg:col-span-2"
        >
          <h2 id="wdr-heading" className="text-sm font-semibold text-ink">
            Waste Diversion Rate
          </h2>
          <p className="mt-2 font-heading text-4xl font-extrabold tabular-nums tracking-tight text-ink">
            {formatNumber(summary.wasteDiversionRate)}
            <span className="text-lg font-semibold text-ink-muted">%</span>
          </p>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-muted">
            Dari {formatInteger(summary.totalBatchesProcessed)} batch yang masuk
            sistem, sebanyak ini tidak berakhir dibuang.
          </p>

          <ul className="mt-5 space-y-2" aria-label="Sebaran tahap cascade">
            {(["FRESH", "RESCUE", "FEED", "RESIDUE", "DISPOSED"] as const).map(
              (status) => {
                const count = summary.statusCounts[status] ?? 0;
                const share =
                  summary.totalBatchesProcessed > 0
                    ? (count / summary.totalBatchesProcessed) * 100
                    : 0;

                return (
                  <li key={status} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-xs font-medium text-ink-muted">
                      {STATUS_META[status].label}
                    </span>
                    <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-muted">
                      <span
                        className={`block h-full rounded-full ${
                          status === "FRESH"
                            ? "bg-stage-fresh"
                            : status === "RESCUE"
                              ? "bg-stage-rescue"
                              : status === "FEED"
                                ? "bg-stage-feed"
                                : status === "RESIDUE"
                                  ? "bg-stage-residue"
                                  : "bg-stage-disposed"
                        }`}
                        style={{ width: `${Math.max(count > 0 ? 2 : 0, share)}%` }}
                      />
                    </span>
                    <span className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums text-ink">
                      {formatInteger(count)}
                    </span>
                  </li>
                );
              },
            )}
          </ul>

          <p className="mt-4 text-xs text-ink-muted">
            Faktor emisi memakai estimasi publik per kategori komoditas —
            verifikasi pihak ketiga masuk fase berikutnya.
          </p>
        </section>

        <section
          aria-labelledby="qr-heading"
          className="rounded-xl border border-line bg-surface p-6"
        >
          <h2 id="qr-heading" className="flex items-center gap-2 text-sm font-semibold text-ink">
            <ScanLine className="size-4" aria-hidden="true" />
            Bagikan lewat QR
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Tempel QR ini di papan informasi gudang atau kemasan — siapa pun bisa
            membuka laporan dampak tanpa login.
          </p>
          <div className="mt-4 flex justify-center rounded-lg bg-surface-muted p-4">
            <QRCodeSVG value={impactUrl} size={148} level="M" aria-label={`QR menuju ${impactUrl}`} />
          </div>
          <p className="mt-3 break-all text-center text-xs text-ink-muted">{impactUrl}</p>
        </section>
      </div>

      <section aria-labelledby="trace-heading" className="mt-8">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="trace-heading" className="font-heading text-xl font-bold tracking-tight text-ink">
              Lacak perjalanan batch
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Setiap batch punya QR sendiri: produsen → gudang → pembeli, lengkap
              dengan skor kesegaran dan rincian harga.
            </p>
          </div>
        </div>

        {batches.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-line bg-surface px-6 py-8 text-center text-sm text-ink-muted">
            Belum ada batch yang bisa dilacak.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {batches.map((batch) => (
              <li key={batch.code}>
                <Link
                  href={`/trace/${batch.code}`}
                  className="group flex h-full flex-col rounded-xl border border-line bg-surface p-4 transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-ink">{batch.code}</p>
                    {isBatchStatus(batch.status) ? <StatusPill status={batch.status} /> : null}
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">{batch.productName}</p>
                  <p className="mt-3 flex items-center justify-between gap-2 text-xs text-ink-muted">
                    <span>
                      Skor {formatNumber(batch.freshnessScore)}/100 ·{" "}
                      {formatNumber(batch.quantityKg)} kg
                    </span>
                    <ArrowRight
                      className="size-4 shrink-0 text-ink-muted transition-colors group-hover:text-brand"
                      aria-hidden="true"
                    />
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
