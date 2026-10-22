import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  BATCH_DELETE_ROLES,
  BATCH_UPDATE_ROLES,
  BATCH_VIEW_ROLES,
  hasRole,
} from "@/src/lib/auth/roles";
import { requireRole } from "@/src/lib/auth/session";
import {
  BATCH_STATUSES,
  STATUS_META,
  type BatchStatusValue,
} from "@/src/lib/batches/freshness";
import {
  formatDate,
  formatDateTime,
  formatIdr,
  formatKg,
  formatNumber,
} from "@/src/lib/batches/format";
import {
  batchHasRefs,
  canAccessBatch,
  getBatchById,
  getProducerById,
  getProducerForUser,
} from "@/src/lib/batches/queries";
import { StatusPill } from "@/src/components/status-pill";
import { BatchUpdateForm } from "./update-form";
import { DeleteBatchButton } from "./delete-button";

export const instant = false;

export const metadata: Metadata = {
  title: "Detail batch · Vesta",
  description: "Freshness score, harga, dan jejak cascade satu batch.",
};

const CATEGORY_LABELS: Record<string, string> = {
  VEGETABLE: "Sayur",
  FRUIT: "Buah",
  PROTEIN: "Protein",
  STAPLE: "Bahan pokok",
  HERB: "Herba",
  OTHER: "Lainnya",
};

const THRESHOLD_LABELS: Record<BatchStatusValue, string> = {
  FRESH: "≥ 70",
  RESCUE: "30–69",
  FEED: "10–29",
  RESIDUE: "1–9",
  DISPOSED: "0",
};

type BatchDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BatchDetailPage({
  params,
}: BatchDetailPageProps) {
  const user = await requireRole(BATCH_VIEW_ROLES);
  const { id } = await params;
  const batchId = Number(id);

  if (!Number.isInteger(batchId) || batchId <= 0) notFound();

  const batch = await getBatchById(batchId);
  if (!batch || !batchHasRefs(batch)) notFound();

  const userProducer =
    user.role === "PRODUCER" ? await getProducerForUser(user.id) : null;
  if (!canAccessBatch(user, batch, userProducer?.id ?? null)) notFound();

  const producer = await getProducerById(batch.product.producerId);
  const canUpdate = hasRole(user.role, BATCH_UPDATE_ROLES);
  const canDelete = hasRole(user.role, BATCH_DELETE_ROLES);
  const availableKg = Math.max(0, batch.quantityKg - batch.reservedKg);
  const price = batch.priceBreakdown;
  const latestEvent = batch.cascadeEvents[0];

  const priceRows = price
    ? [
        { label: "Harga dasar", value: formatIdr(price.basePricePerKg) },
        {
          label: "Biaya gudang",
          value: formatIdr(price.warehouseCostPerKg),
        },
        {
          label: "Logistik",
          value: formatIdr(price.logisticsCostPerKg),
        },
        { label: "Margin", value: formatIdr(price.marginPerKg) },
        {
          label: "Diskon",
          value: `${formatNumber(price.rescueDiscountPct)}%`,
        },
      ]
    : [];

  return (
    <div>
      <Link
        href="/dashboard/batches"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Batch &amp; pasokan
      </Link>

      <section className="mt-4 rounded-xl border border-line bg-surface p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-start gap-3.5">
            <span className="flex h-[62px] w-[50px] shrink-0 items-center justify-center rounded-lg bg-surface-muted text-sm font-bold text-ink-muted">
              {batch.product.name.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight text-ink">
                  {batch.code}
                </h1>
                <StatusPill status={batch.status} />
              </div>
              <p className="mt-1 text-sm text-ink">
                {batch.product.name}
                <span className="text-ink-muted">
                  {" "}
                  · {producer?.farmName ?? "Produsen mitra"}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {batch.warehouse.name} · Panen{" "}
                {formatDate(batch.harvestDate)} · Diperbarui{" "}
                {formatDateTime(batch.updatedAt)}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
            <Link
              href="/dashboard/batches"
              className="inline-flex h-9 items-center rounded-lg border border-line px-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Kembali
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
        <div className="bg-surface p-4">
          <p className="text-xs text-ink-muted">Skor kesegaran</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {formatNumber(batch.freshnessScore)}
            <span className="text-sm font-normal text-ink-muted">/100</span>
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {STATUS_META[batch.status].label}
          </p>
        </div>
        <div className="bg-surface p-4">
          <p className="text-xs text-ink-muted">Sisa stok</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {formatKg(availableKg)}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            dari {formatKg(batch.quantityKg)}
          </p>
        </div>
        <div className="bg-surface p-4">
          <p className="text-xs text-ink-muted">Harga akhir</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {price ? formatIdr(price.finalPricePerKg) : "-"}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">per kg</p>
        </div>
        <div className="bg-surface p-4">
          <p className="text-xs text-ink-muted">Umur simpan</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {batch.product.shelfLifeDays} hari
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            Suhu ideal {batch.product.idealTempC}°C
          </p>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-6">
        <section className="flex h-full flex-col rounded-xl border border-line bg-surface p-4 lg:col-span-4 lg:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink">Rincian harga</h2>
            <p className="text-xs text-ink-muted">per kg</p>
          </div>

          {price ? (
            <>
              <dl className="mt-3">
                {priceRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-4 border-b border-line py-2 last:border-0"
                  >
                    <dt className="text-sm text-ink-muted">{row.label}</dt>
                    <dd className="text-sm tabular-nums text-ink">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-2 flex items-center justify-between gap-4 rounded-lg bg-surface-muted px-3 py-2.5">
                <span className="text-sm font-medium text-ink">
                  Harga jual akhir
                </span>
                <span className="text-base font-semibold tabular-nums text-ink">
                  {formatIdr(price.finalPricePerKg)}
                </span>
              </div>
              <p className="mt-auto border-t border-line pt-3 text-xs leading-relaxed text-ink-muted">
                Diskon {formatNumber(price.rescueDiscountPct)}% mengikuti tahap{" "}
                {STATUS_META[batch.status].label}. Harga sudah termasuk biaya
                gudang, logistik, dan margin.
              </p>
            </>
          ) : (
            <p className="mt-4 rounded-lg border border-dashed border-line px-3 py-6 text-center text-sm text-ink-muted">
              Rincian harga belum tersedia.
            </p>
          )}
        </section>

        <section className="flex h-full flex-col rounded-xl border border-line bg-surface p-4 lg:col-span-2 lg:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink">Jejak cascade</h2>
            <span className="text-xs text-ink-muted">Skor</span>
          </div>

          <ol className="mt-3 space-y-1">
            {BATCH_STATUSES.map((status) => {
              const current = batch.status === status;
              const meta = STATUS_META[status];

              return (
                <li
                  key={status}
                  className={
                    current
                      ? "flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-2.5 py-1.5"
                      : "flex items-center justify-between gap-3 px-2.5 py-1.5"
                  }
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`size-1.5 rounded-full ${meta.dotClassName}`}
                      aria-hidden="true"
                    />
                    <span
                      className={
                        current
                          ? "text-sm font-semibold text-ink"
                          : "text-sm text-ink-muted"
                      }
                    >
                      {meta.label}
                    </span>
                  </span>
                  <span className="text-xs tabular-nums text-ink-muted">
                    {THRESHOLD_LABELS[status]}
                  </span>
                </li>
              );
            })}
          </ol>

          <p className="mt-auto border-t border-line pt-3 text-xs leading-relaxed text-ink-muted">
            {latestEvent
              ? `${latestEvent.reason ?? "Status diperbarui."} · ${formatDateTime(
                  latestEvent.createdAt,
                )}`
              : "Belum ada perubahan tahap."}
          </p>
        </section>

        <section className="flex h-full flex-col rounded-xl border border-line bg-surface p-4 lg:col-span-3 lg:p-5">
          <h2 className="text-sm font-semibold text-ink">Informasi batch</h2>
          <dl className="mt-3 space-y-2.5 text-sm">
            <div className="flex items-start justify-between gap-4">
              <dt className="text-ink-muted">Produk</dt>
              <dd className="text-right font-medium text-ink">
                {batch.product.name}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-ink-muted">Kategori</dt>
              <dd className="text-right text-ink">
                {CATEGORY_LABELS[batch.product.category] ??
                  batch.product.category}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-ink-muted">Gudang</dt>
              <dd className="text-right text-ink">
                {batch.warehouse.name}
                {batch.warehouse.city ? `, ${batch.warehouse.city}` : ""}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-ink-muted">Diterima</dt>
              <dd className="text-right text-ink">
                {formatDateTime(batch.receivedAt)}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-ink-muted">Direservasi</dt>
              <dd className="text-right tabular-nums text-ink">
                {formatKg(batch.reservedKg)}
              </dd>
            </div>
          </dl>
          <p className="mt-auto border-t border-line pt-3 text-xs text-ink-muted">
            Batch dibuat {formatDateTime(batch.createdAt)}.
          </p>
        </section>

        <section className="flex h-full flex-col rounded-xl border border-line bg-surface p-4 lg:col-span-3 lg:p-5">
          <h2 className="text-sm font-semibold text-ink">Kualitas &amp; asal</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink">
            {batch.qualityNote ?? "-"}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {batch.isManuallyAdjusted
              ? "Skor pernah disesuaikan manual."
              : "Skor dihitung dari umur simpan dan suhu penyimpanan."}
          </p>

          <dl className="mt-4 grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-ink-muted">Produsen</dt>
              <dd className="mt-0.5 font-medium text-ink">
                {producer?.farmName ?? "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Telepon</dt>
              <dd className="mt-0.5 tabular-nums text-ink">
                {producer?.phone ?? "-"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-ink-muted">Alamat</dt>
              <dd className="mt-0.5 leading-relaxed text-ink">
                {producer?.address ?? "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Suhu tercatat</dt>
              <dd className="mt-0.5 tabular-nums text-ink">
                {formatNumber(batch.storageTempC)}°C
                <span className="text-ink-muted">
                  {" "}
                  (ideal {batch.product.idealTempC}°C)
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Umur simpan</dt>
              <dd className="mt-0.5 tabular-nums text-ink">
                {batch.product.shelfLifeDays} hari
              </dd>
            </div>
          </dl>
        </section>

        {canUpdate ? (
          <section className="rounded-xl border border-line bg-surface p-4 lg:col-span-6 lg:p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
              <h2 className="text-sm font-semibold text-ink">
                Perbarui kondisi
              </h2>
              <p className="text-xs leading-relaxed text-ink-muted">
                Suhu baru langsung menghitung ulang skor, tahap, dan harga.
              </p>
            </div>
            <BatchUpdateForm
              batchId={batch.id}
              storageTempC={batch.storageTempC}
              qualityNote={batch.qualityNote}
            />
          </section>
        ) : null}
      </div>

      {canDelete ? (
        <section className="mt-4 rounded-xl border border-line bg-surface p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink">Hapus batch</h2>
              <p className="mt-1 max-w-lg text-xs leading-relaxed text-ink-muted">
                Hanya batch tanpa pesanan dan catatan dampak yang dapat
                dihapus. Batch beserta jejak cascade-nya akan dihapus permanen.
              </p>
            </div>
            <DeleteBatchButton batchId={batch.id} code={batch.code} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
