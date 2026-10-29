"use client";

import Link from "next/link";
import { useCart } from "./cart-context";

export function CartBadge() {
  const { count, ready } = useCart();

  return (
    <Link
      href="/cart"
      aria-label={`Keranjang belanja${count > 0 ? `, ${count} jenis barang` : ""}`}
      className="inline-flex h-9 items-center gap-2 rounded-md px-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      Keranjang
      {ready && count > 0 ? (
        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-brand-strong px-1.5 text-[10px] font-bold leading-5 text-on-brand">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
