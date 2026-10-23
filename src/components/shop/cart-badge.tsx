"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "./cart-context";

export function CartBadge() {
  const { count, ready } = useCart();

  return (
    <Link
      href="/cart"
      aria-label={`Keranjang belanja${count > 0 ? `, ${count} jenis barang` : ""}`}
      className="relative inline-flex size-10 items-center justify-center rounded-lg text-ink transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <ShoppingCart className="size-[18px]" aria-hidden="true" />
      {ready && count > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-brand-strong px-1 text-[10px] font-bold leading-4 text-on-brand">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
