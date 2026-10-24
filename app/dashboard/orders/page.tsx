import type { Metadata } from "next";
import { connection } from "next/server";
import { Truck } from "lucide-react";
import { ORDER_FULFILL_ROLES } from "@/src/lib/auth/roles";
import { requireRole } from "@/src/lib/auth/session";
import { getFulfillmentOrders } from "@/src/lib/orders/fulfillment";
import { formatDateTime, formatIdr, formatKg } from "@/src/lib/batches/format";
import { EmptyState } from "@/src/components/shop/empty-state";
import { FulfillmentButton } from "./fulfillment-button";

export const instant = false;

export const metadata: Metadata = {
  title: "Pemenuhan pesanan — Vesta",
  description: "Kirim pesanan yang sudah dibayar dan selesaikan pengiriman.",
};

const STATUS_LABELS: Record<"PAID" | "SHIPPED", string> = {
  PAID: "Siap dikirim",
  SHIPPED: "Menunggu selesai",
};

const STAGE_LABELS: Record<string, string> = {
  FRESH: "Segar",
  RESCUE: "Layu",
  FEED: "Pakan",
  RESIDUE: "Residu",
  DISPOSED: "Dibuang",
};

export default async function FulfillmentOrdersPage() {
  await connection();
  const user = await requireRole(ORDER_FULFILL_ROLES);
  const orders = await getFulfillmentOrders(user);

  const toShip = orders.filter((order) => order.status === "PAID").length;
  const toComplete = orders.length - toShip;

  return (
    <div>
      <header className="max-w-2xl">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-ink">
          Pemenuhan pesanan
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          Kirim pesanan yang sudah lunas — stok dan reservasi dilepas otomatis
          dari batch terkait — lalu tandai selesai setelah diterima pembeli.
        </p>
      </header>

      <section
        aria-label="Ringkasan pemenuhan"
        className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:max-w-md"
      >
        <div className="bg-surface p-4">
          <p className="text-xs text-ink-muted">Siap dikirim</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {toShip}
          </p>
        </div>
        <div className="bg-surface p-4">
          <p className="text-xs text-ink-muted">Menunggu selesai</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {toComplete}
          </p>
        </div>
      </section>

      {orders.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="Tidak ada pesanan yang perlu diproses"
            description="Pesanan akan muncul di sini setelah pembeli menyelesaikan pembayaran."
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {orders.map((order) => (
            <li
              key={order.id}
              className="rounded-xl border border-line bg-surface p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                    {order.code}
                    <span
                      className={
                        order.status === "PAID"
                          ? "rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand-strong"
                          : "rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-ink-muted"
                      }
                    >
                      {STATUS_LABELS[order.status]}
                    </span>
                    {order.kind === "PREORDER" ? (
                      <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                        Pre-order
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {order.buyerName ?? order.buyerEmail ?? "Pembeli"} ·{" "}
                    {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <FulfillmentButton orderId={order.id} status={order.status} />
              </div>

              <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
                {order.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ink">
                        {item.productName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-ink-muted">
                        {item.batchCode} · {item.warehouseName} ·{" "}
                        {STAGE_LABELS[item.stage] ?? item.stage}
                      </p>
                    </div>
                    <p className="text-sm tabular-nums text-ink">
                      {formatKg(item.quantityKg)}{" "}
                      <span className="text-ink-muted">
                        × {formatIdr(item.pricePerKg)}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
                <p className="min-w-0 truncate">
                  {order.deliveryAddress ?? "Diambil langsung di gudang"}
                  {order.contactPhone ? ` · ${order.contactPhone}` : ""}
                </p>
                <p className="text-sm font-semibold tabular-nums text-ink">
                  {formatIdr(order.total)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 flex items-center gap-2 text-xs text-ink-muted">
        <Truck className="size-4" aria-hidden="true" />
        {user.role === "ADMIN"
          ? "Sebagai admin Anda dapat memproses pesanan dari semua gudang."
          : "Anda hanya melihat pesanan yang seluruh batch-nya berada di gudang yang Anda kelola."}
      </p>
    </div>
  );
}
