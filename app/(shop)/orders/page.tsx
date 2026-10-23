import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight } from "lucide-react";
import { requireSession } from "@/src/lib/auth/session";
import { getOrdersForUser } from "@/src/lib/marketplace/queries";
import { formatDateTime, formatIdr, formatKg } from "@/src/lib/batches/format";
import { EmptyState } from "@/src/components/shop/empty-state";

export const instant = false;

export const metadata: Metadata = {
  title: "Pesanan — Vesta",
  description: "Riwayat pesanan dan status pembayaran Anda.",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu bayar",
  PAID: "Lunas",
  SHIPPED: "Dikirim",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export default async function OrdersPage() {
  await connection();
  const user = await requireSession();
  const orders = await getOrdersForUser(Number(user.id));

  return (
    <div>
      <header className="max-w-2xl">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Pesanan
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Semua pembelian Anda — marketplace, rescue deal, pakan, dan residu.
        </p>
      </header>

      {orders.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Belum ada pesanan"
            description="Mulai dari marketplace segar atau selamatkan batch lewat Rescue Deals."
            action={
              <Link
                href="/marketplace"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-strong px-5 text-sm font-semibold text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                Ke marketplace
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.code}`}
                className="group flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-4 transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                    {order.code}
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                    {order.kind === "PREORDER" ? (
                      <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand-strong">
                        Pre-order
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 truncate text-xs text-ink-muted">
                    {order.items.map((item) => item.productName).join(", ")} ·{" "}
                    {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold tabular-nums text-ink">
                    {formatIdr(order.total)}
                  </span>
                  <ArrowRight
                    className="size-4 text-ink-muted transition-colors group-hover:text-brand"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
