"use client";

import { useActionState, useState } from "react";
import type { PurchaseState } from "@/app/(shop)/actions";
import { formatIdr } from "@/src/lib/batches/format";

const initialState: PurchaseState = { ok: false };

/**
 * Direct single-item purchase form for rescue deals, feed and residue
 * listings. `action` is the server action for the listing's marketplace.
 */
export function DirectBuyForm({
  action,
  batchId,
  listingId,
  source,
  pricePerKg,
  maxKg,
  label = "Beli",
  locked = false,
  lockedHint,
}: {
  action: (state: PurchaseState, formData: FormData) => Promise<PurchaseState>;
  batchId?: number;
  listingId?: number;
  source: "RESCUE" | "FEED" | "RESIDUE";
  pricePerKg: number;
  maxKg: number;
  label?: string;
  locked?: boolean;
  lockedHint?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [qty, setQty] = useState(() => Math.min(1, maxKg));

  const step = 0.5;
  const clampedMax = Math.max(0, maxKg);

  function changeQty(next: number) {
    const rounded = Math.round(next * 2) / 2;
    setQty(Math.max(step, Math.min(clampedMax, rounded)));
  }

  if (locked) {
    return (
      <div>
        <button
          type="button"
          disabled
          className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-line bg-surface-muted text-sm font-medium text-ink-muted"
        >
          Belum bisa diakses
        </button>
        {lockedHint ? (
          <p className="mt-1.5 text-xs text-ink-muted">{lockedHint}</p>
        ) : null}
      </div>
    );
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
    <form action={formAction}>
      {batchId ? <input type="hidden" name="batchId" value={batchId} /> : null}
      {listingId ? <input type="hidden" name="listingId" value={listingId} /> : null}
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="quantityKg" value={qty} />

      <div className="space-y-2">
        <div className="inline-flex h-9 w-full items-center justify-between rounded-lg border border-line bg-surface">
          <button
            type="button"
            onClick={() => changeQty(qty - step)}
            aria-label="Kurangi jumlah"
            className="inline-flex size-9 items-center justify-center rounded-l-lg text-sm text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
          >
            &minus;
          </button>
          <span className="text-sm font-semibold tabular-nums text-ink">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => changeQty(qty + step)}
            aria-label="Tambah jumlah"
            className="inline-flex size-9 items-center justify-center rounded-r-lg text-sm text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
          >
            +
          </button>
        </div>

        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-brand-strong px-3 text-sm font-semibold text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Memproses..." : label}
        </button>
      </div>

      <p className="mt-1.5 text-xs text-ink-muted" aria-live="polite">
        {state.error ? (
          <span className="font-medium text-danger">{state.error}</span>
        ) : state.ok && state.message ? (
          <span className="font-medium text-brand-ink">
            {state.message}{" "}
            {state.code ? (
              <a href={`/orders/${state.code}`} className="underline">
                Lihat pesanan {state.code}
              </a>
            ) : null}
          </span>
        ) : (
          <span>Total {formatIdr(pricePerKg * qty)}</span>
        )}
      </p>
    </form>
  );
}
