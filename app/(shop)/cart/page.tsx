import type { Metadata } from "next";
import { connection } from "next/server";
import { requireSession } from "@/src/lib/auth/session";
import { CartView } from "@/src/components/marketplace/cart-view";

export const instant = false;

export const metadata: Metadata = {
  title: "Keranjang — Vesta",
  description: "Tinjau pesanan dan checkout dengan Midtrans.",
};

export default async function CartPage() {
  await connection();
  await requireSession();

  return (
    <div>
      <header className="max-w-2xl">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Keranjang
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Periksa pesanan lalu lanjut ke pembayaran.
        </p>
      </header>

      <div className="mt-6">
        <CartView />
      </div>
    </div>
  );
}
