"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { readSaved, writeSaved, type SavedItem } from "@/src/lib/marketplace/cart";
import { formatIdr } from "@/src/lib/batches/format";

/** Buyer's saved products, persisted in localStorage by the bookmark toggle. */
export function SavedItems() {
  const [items, setItems] = useState<SavedItem[] | null>(null);

  useEffect(() => {
    setItems(readSaved());
  }, []);

  function remove(productId: number) {
    const next = (items ?? []).filter((item) => item.productId !== productId);
    writeSaved(next);
    setItems(next);
  }

  if (items === null) {
    return (
      <p className="px-4 py-6 text-sm text-ink-muted" aria-busy="true">
        Memuat simpanan...
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <Bookmark className="mx-auto size-4 text-ink-muted" aria-hidden="true" />
        <p className="mt-2 text-sm text-ink-muted">
          Belum ada produk simpanan. Tekan ikon penanda di kartu marketplace untuk
          menyimpan.
        </p>
      </div>
    );
  }

  return (
    <ul>
      {items.map((item) => (
        <li
          key={item.productId}
          className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 last:border-0"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{item.productName}</p>
            <p className="text-xs tabular-nums text-ink-muted">
              {formatIdr(item.pricePerKg)}/{item.unit}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/marketplace"
              className="text-xs font-semibold text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Cari batch
            </Link>
            <button
              type="button"
              onClick={() => remove(item.productId)}
              className="text-xs font-medium text-ink-muted transition-colors hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Hapus
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
