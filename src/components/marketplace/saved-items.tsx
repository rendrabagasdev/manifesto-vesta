"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import {
  savedServerSnapshot,
  savedSnapshot,
  subscribeSaved,
  writeSaved,
  type SavedItem,
} from "@/src/lib/marketplace/cart";
import { formatIdr } from "@/src/lib/batches/format";

function parseSaved(snapshot: string): SavedItem[] {
  try {
    const entries = JSON.parse(snapshot) as SavedItem[];
    return Array.isArray(entries) ? entries : [];
  } catch {
    return [];
  }
}

/** Buyer's saved products, persisted in localStorage by the save toggle. */
export function SavedItems() {
  const items = parseSaved(
    useSyncExternalStore(
      subscribeSaved,
      savedSnapshot,
      savedServerSnapshot,
    ),
  );

  function remove(productId: number) {
    writeSaved(items.filter((item) => item.productId !== productId));
  }

  if (items.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-sm text-ink-muted">
          Belum ada produk simpanan. Tekan tombol Simpan di kartu marketplace.
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
              className="text-xs font-semibold text-brand-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
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
