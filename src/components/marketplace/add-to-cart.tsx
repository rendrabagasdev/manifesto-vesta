"use client";

import { useState, useSyncExternalStore } from "react";
import { useCart } from "@/src/components/shop/cart-context";
import {
  isSavedInSnapshot,
  readSaved,
  savedServerSnapshot,
  savedSnapshot,
  subscribeSaved,
  writeSaved,
} from "@/src/lib/marketplace/cart";
import { formatIdr } from "@/src/lib/batches/format";

export interface AddToCartProduct {
  batchId: number;
  batchCode: string;
  productId: number;
  productName: string;
  unit: string;
  pricePerKg: number;
  maxKg: number;
  warehouseName: string;
  warehouseCity: string | null;
}

export function AddToCart({ product }: { product: AddToCartProduct }) {
  const { addItem } = useCart();
  const [qty, setQty] = useState<number>(Math.min(1, product.maxKg));
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const savedState = useSyncExternalStore(
    subscribeSaved,
    savedSnapshot,
    savedServerSnapshot,
  );
  const saved = isSavedInSnapshot(savedState, product.productId);

  function toggleSaved() {
    const current = readSaved();
    if (current.some((entry) => entry.productId === product.productId)) {
      writeSaved(current.filter((entry) => entry.productId !== product.productId));
    } else {
      writeSaved([
        ...current,
        {
          productId: product.productId,
          productName: product.productName,
          unit: product.unit,
          pricePerKg: product.pricePerKg,
        },
      ]);
    }
  }

  const step = 0.5;
  const clampedMax = Math.max(0, product.maxKg);

  function changeQty(next: number) {
    const rounded = Math.round(next * 2) / 2;
    setQty(Math.max(step, Math.min(clampedMax, rounded)));
    setFeedback(null);
  }

  function handleAdd() {
    const result = addItem({
      batchId: product.batchId,
      batchCode: product.batchCode,
      productName: product.productName,
      unit: product.unit,
      pricePerKg: product.pricePerKg,
      qtyKg: qty,
      maxKg: clampedMax,
      stage: "FRESH",
      warehouseName: product.warehouseName,
      warehouseCity: product.warehouseCity,
    });
    setFeedback(result);
    if (result.ok) {
      window.setTimeout(() => setFeedback(null), 2500);
    }
  }

  if (clampedMax <= 0) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-line bg-surface-muted text-sm font-medium text-ink-muted"
      >
        Stok habis
      </button>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <div className="inline-flex h-8 min-w-0 flex-1 items-center justify-between rounded-md border border-line bg-surface">
          <button
            type="button"
            onClick={() => changeQty(qty - step)}
            aria-label={`Kurangi jumlah ${product.productName}`}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-l-md text-sm text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
          >
            &minus;
          </button>
          <span className="min-w-0 truncate text-center text-xs font-semibold tabular-nums text-ink">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => changeQty(qty + step)}
            aria-label={`Tambah jumlah ${product.productName}`}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-r-md text-sm text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          aria-label={`Masukkan ${product.productName} ke keranjang`}
          className="inline-flex h-8 shrink-0 items-center justify-center rounded-md bg-brand-strong px-3 text-xs font-semibold text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Tambah
        </button>
      </div>

      <div className="mt-1 flex items-center justify-between gap-2">
        <p
          className="min-w-0 truncate text-[10px] text-ink-muted"
          aria-live="polite"
        >
          {feedback ? (
            <span
              className={
                feedback.ok
                  ? "font-medium text-brand-ink"
                  : "font-medium text-danger"
              }
            >
              {feedback.message}
            </span>
          ) : (
            `${formatIdr(product.pricePerKg * qty)} · ${qty} ${product.unit}`
          )}
        </p>
        <button
          type="button"
          onClick={toggleSaved}
          aria-pressed={saved}
          aria-label={
            saved
              ? `Hapus ${product.productName} dari daftar simpanan`
              : `Simpan ${product.productName}`
          }
          className={
            saved
              ? "shrink-0 text-[10px] font-semibold text-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              : "shrink-0 text-[10px] font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          }
        >
          {saved ? "Tersimpan" : "Simpan"}
        </button>
      </div>
    </div>
  );
}
