import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import {
  CloudSun,
  Droplets,
  Thermometer,
  Warehouse as WarehouseIcon,
} from "lucide-react";
import { requireRole } from "@/src/lib/auth/session";
import { db } from "@/src/prisma/db";
import { getBatchesForUser } from "@/src/lib/batches/queries";
import {
  getWeatherForWarehouse,
  weatherLabel,
} from "@/src/lib/weather/service";
import { summarizeBatches } from "@/src/lib/batches/metrics";
import {
  BATCH_STATUSES,
  STATUS_META,
} from "@/src/lib/batches/freshness";
import {
  formatInteger,
  formatKg,
  formatNumber,
} from "@/src/lib/batches/format";
import { StatusPill } from "@/src/components/status-pill";
import { FreshnessMeter } from "@/src/components/marketplace/freshness-meter";
import { BatchUpdateForm } from "@/app/dashboard/batches/[id]/update-form";
import { EmptyState } from "@/src/components/shop/empty-state";

export const instant = false;

export const metadata: Metadata = {
  title: "Dashboard gudang — Vesta",
  description: "Terima batch, catat suhu, dan pantau cascade.",
};

export default async function WarehouseDashboardPage() {
  await connection();
  const user = await requireRole(["WAREHOUSE", "ADMIN"]);
  const batches = await getBatchesForUser(user);
  const summary = summarizeBatches(batches);

  const warehouseRows = await db.orm.public.Warehouse
    .select("id", "name", "city", "managerId", "latitude", "longitude")
    .all();
  const managedWarehouses = warehouseRows.filter(
    (warehouse) =>
      user.role === "ADMIN" || warehouse.managerId === Number(user.id),
  );
  const warehouseWeather = await Promise.all(
    managedWarehouses.map(async (warehouse) => ({
      warehouse,
      weather: await getWeatherForWarehouse(warehouse),
    })),
  );

  const active = batches.filter((batch) => batch.status !== "DISPOSED");

  return (
    <div>
      <header className="max-w-2xl">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-ink">
          Dashboard gudang
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          Catat suhu penyimpanan dan kondisi fisik tiap batch — skor kesegaran
          dihitung ulang otomatis, dan cascade bergerak saat ambang terlewati.
        </p>
      </header>

      <section
        aria-label="Ringkasan gudang"
        className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4"
      >
        <div className="bg-surface p-4">
          <p className="text-xs text-ink-muted">Batch aktif</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {formatInteger(summary.total)}
          </p>
        </div>
        <div className="bg-surface p-4">
          <p className="text-xs text-ink-muted">Stok tersedia</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {formatKg(summary.availableKg)}
          </p>
        </div>
        <div className="bg-surface p-4">
          <p className="text-xs text-ink-muted">Perlu tindakan</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {formatInteger(summary.needingAction)}
          </p>
        </div>
        <div className="bg-surface p-4">
          <p className="text-xs text-ink-muted">Rata-rata skor</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {formatNumber(summary.averageScore)}
            <span className="text-sm font-normal text-ink-muted">/100</span>
          </p>
        </div>
      </section>

      {managedWarehouses.length > 0 ? (
        <section
          aria-labelledby="warehouse-weather-heading"
          className="mt-4 rounded-xl border border-line bg-surface p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2
              id="warehouse-weather-heading"
              className="flex items-center gap-2 text-sm font-semibold text-ink"
            >
              <CloudSun className="size-4" aria-hidden="true" />
              Cuaca gudang
            </h2>
            <p className="text-xs text-ink-muted">
              Suhu dan kelembapan menjadi faktor tambahan skor kesegaran.
            </p>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {warehouseWeather.map(({ warehouse, weather }) => (
              <li
                key={warehouse.id}
                className="rounded-lg border border-line bg-surface-muted/60 px-3 py-2.5"
              >
                <p className="text-sm font-semibold text-ink">
                  {warehouse.name}
                </p>
                {weather ? (
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                    <span className="inline-flex items-center gap-1 tabular-nums text-ink">
                      <Thermometer className="size-3.5" aria-hidden="true" />
                      {formatNumber(weather.temperatureC)}°C
                    </span>
                    {weather.humidityPct !== null ? (
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Droplets className="size-3.5" aria-hidden="true" />
                        {formatNumber(weather.humidityPct)}%
                      </span>
                    ) : null}
                    <span>{weatherLabel(weather.source)}</span>
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-ink-muted">
                    Cuaca belum tersedia. Skor tetap memakai suhu gudang.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section aria-labelledby="monitor-heading" className="min-w-0 rounded-xl border border-line bg-surface lg:col-span-2">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 id="monitor-heading" className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Thermometer className="size-4" aria-hidden="true" />
              Pemantauan cascade
            </h2>
            <Link
              href="/dashboard/batches"
              className="text-xs font-semibold text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Lihat semua
            </Link>
          </div>

          {active.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-muted">
              Tidak ada batch aktif di gudang Anda saat ini.
            </p>
          ) : (
            <ul>
              {active.slice(0, 6).map((batch) => (
                <li key={batch.id} className="border-b border-line px-4 py-4 last:border-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/batches/${batch.id}`}
                        className="truncate text-sm font-semibold text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                      >
                        {batch.code}
                      </Link>
                      <p className="mt-0.5 truncate text-xs text-ink-muted">
                        {batch.product.name} · {formatKg(Math.max(0, batch.quantityKg - batch.reservedKg))}{" "}
                        tersedia · {formatNumber(batch.storageTempC)}°C
                      </p>
                    </div>
                    <StatusPill status={batch.status} />
                  </div>
                  <div className="mt-2 max-w-xs">
                    <FreshnessMeter score={batch.freshnessScore} size="sm" />
                  </div>
                  <BatchUpdateForm
                    batchId={batch.id}
                    storageTempC={batch.storageTempC}
                    qualityNote={batch.qualityNote}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="stage-heading" className="min-w-0 rounded-xl border border-line bg-surface p-4">
          <h2 id="stage-heading" className="flex items-center gap-2 text-sm font-semibold text-ink">
            <WarehouseIcon className="size-4" aria-hidden="true" />
            Sebaran tahap
          </h2>
          <ul className="mt-3 space-y-1">
            {BATCH_STATUSES.map((status) => {
              const meta = STATUS_META[status];
              return (
                <li key={status} className="flex items-center justify-between gap-3 px-2 py-1.5">
                  <span className="flex items-center gap-2">
                    <span className={`size-1.5 rounded-full ${meta.dotClassName}`} aria-hidden="true" />
                    <span className="text-sm text-ink">{meta.label}</span>
                  </span>
                  <span className="text-sm tabular-nums text-ink-muted">
                    {formatInteger(summary.statusCounts[status])}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-ink-muted">
            Perubahan suhu memicu perhitungan ulang skor; transisi tahap tercatat
            di cascade events dengan nama petugas.
          </p>
          {batches.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                title="Belum ada batch"
                description="Batch akan muncul setelah produsen mencatat panen ke gudang Anda."
              />
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
