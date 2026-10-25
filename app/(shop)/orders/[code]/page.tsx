import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, CheckCircle2, Clock, Droplets, Leaf, Recycle } from "lucide-react";
import { requireSession } from "@/src/lib/auth/session";
import { getOrderByCode } from "@/src/lib/marketplace/queries";
import {
  formatDate,
  formatDateTime,
  formatIdr,
  formatKg,
  formatNumber,
} from "@/src/lib/batches/format";
import { isBatchStatus } from "@/src/lib/batches/freshness";
import {
  deliveryCityLabel,
  deliveryMethodLabel,
  formatDeliveryEstimate,
} from "@/src/lib/delivery/shipping";
import { StatusPill } from "@/src/components/status-pill";

export const instant = false;

export const metadata: Metadata = {
  title: "Detail pesanan — Vesta",
  description: "Rincian pesanan dan ringkasan dampaknya.",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu pembayaran",
  PAID: "Lunas",
  SHIPPED: "Dikirim",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  await connection();
  const user = await requireSession();
  const { code } = await params;
  const order = await getOrderByCode(code);

  if (!order || order.buyerId !== Number(user.id)) notFound();

  const impact = order.impactLogs.reduce(
    (acc, log) => ({
      rescuedKg: acc.rescuedKg + log.rescuedKg,
      co2eSavedKg: acc.co2eSavedKg + log.co2eSavedKg,
      waterSavedLiters: acc.waterSavedLiters + log.waterSavedLiters,
    }),
    { rescuedKg: 0, co2eSavedKg: 0, waterSavedLiters: 0 },
  );

  return (
    <div>
      <Link
        href="/orders"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Semua pesanan
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {order.code}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
            {formatDateTime(order.createdAt)}
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1 font-medium text-ink">
              {order.status === "PENDING" ? (
                <Clock className="size-4" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="size-4" aria-hidden="true" />
              )}
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
          </p>
        </div>
        {order.paymentUrl && order.status === "PENDING" ? (
          <a
            href={order.paymentUrl}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-strong px-5 text-sm font-semibold text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Lanjutkan pembayaran
          </a>
        ) : null}
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section aria-labelledby="items-heading" className="rounded-xl border border-line bg-surface lg:col-span-2">
          <div className="border-b border-line px-4 py-3">
            <h2 id="items-heading" className="text-sm font-semibold text-ink">
              Barang
            </h2>
          </div>
          <ul>
            {order.items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{item.batch?.product?.name ?? "Produk"}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <span>{item.batch?.code ?? "-"}</span>
                    {isBatchStatus(item.stage) ? <StatusPill status={item.stage} /> : null}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums text-ink">
                    {formatIdr(item.lineTotal)}
                  </p>
                  <p className="text-xs tabular-nums text-ink-muted">
                    {formatKg(item.quantityKg)} × {formatIdr(item.pricePerKg)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <dl className="space-y-1.5 border-t border-line px-4 py-3.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">Subtotal</dt>
              <dd className="font-semibold tabular-nums text-ink">{formatIdr(order.subtotal)}</dd>
            </div>
            {order.discount > 0 ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">Diskon</dt>
                <dd className="font-semibold tabular-nums text-ink">−{formatIdr(order.discount)}</dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3 border-t border-line pt-1.5">
              <dt className="font-semibold text-ink">Total</dt>
              <dd className="font-heading text-lg font-bold tabular-nums tracking-tight text-ink">
                {formatIdr(order.total)}
              </dd>
            </div>
          </dl>
        </section>

        <div className="grid gap-4">
          <section aria-labelledby="impact-heading" className="rounded-xl border border-line bg-surface p-4">
            <h2 id="impact-heading" className="text-sm font-semibold text-ink">
              Dampak pesanan ini
            </h2>
            <ul className="mt-3 space-y-2.5 text-sm">
              <li className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-ink-muted">
                  <Leaf className="size-4" aria-hidden="true" />
                  Tidak terbuang
                </span>
                <span className="font-semibold tabular-nums text-ink">
                  {formatKg(impact.rescuedKg)}
                </span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-ink-muted">
                  <Recycle className="size-4" aria-hidden="true" />
                  CO₂e dihindari
                </span>
                <span className="font-semibold tabular-nums text-ink">
                  {formatNumber(impact.co2eSavedKg)} kg
                </span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-ink-muted">
                  <Droplets className="size-4" aria-hidden="true" />
                  Air dihemat
                </span>
                <span className="font-semibold tabular-nums text-ink">
                  {formatNumber(impact.waterSavedLiters)} L
                </span>
              </li>
            </ul>
            <Link
              href="/impact"
              className="mt-3 inline-block border-t border-line pt-3 text-xs font-semibold text-brand-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Lihat laporan dampak publik
            </Link>
          </section>

          <section aria-labelledby="delivery-heading" className="rounded-xl border border-line bg-surface p-4">
            <h2 id="delivery-heading" className="text-sm font-semibold text-ink">
              Pengiriman
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              {order.deliveryCity ? (
                <div className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-ink-muted">Tujuan</dt>
                  <dd className="min-w-0 text-right text-xs leading-relaxed text-ink">
                    {deliveryCityLabel(order.deliveryCity)}
                  </dd>
                </div>
              ) : null}
              {order.deliveryAddress ? (
                <div className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-ink-muted">Alamat</dt>
                  <dd className="min-w-0 text-right text-xs leading-relaxed text-ink">
                    {order.deliveryAddress}
                  </dd>
                </div>
              ) : null}
              {order.deliveryMethod ? (
                <div className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-ink-muted">Metode</dt>
                  <dd className="text-right font-semibold text-ink">
                    {deliveryMethodLabel(order.deliveryMethod)}
                  </dd>
                </div>
              ) : null}
              {order.estimatedDeliveryAt ? (
                <div className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-ink-muted">Estimasi tiba</dt>
                  <dd className="text-right font-semibold tabular-nums text-ink">
                    {formatDeliveryEstimate(order.estimatedDeliveryAt)}
                  </dd>
                </div>
              ) : null}
              {order.scheduledFor ? (
                <div className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-ink-muted">Jadwal</dt>
                  <dd className="text-right font-semibold tabular-nums text-ink">
                    {formatDate(order.scheduledFor)}
                  </dd>
                </div>
              ) : null}
              {order.notes ? (
                <div className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-ink-muted">Catatan</dt>
                  <dd className="min-w-0 text-right text-xs leading-relaxed text-ink">{order.notes}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
