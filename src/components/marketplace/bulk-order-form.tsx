"use client";

import { useActionState, useState } from "react";
import { PackagePlus } from "lucide-react";
import { preorderAction, type PurchaseState } from "@/app/(shop)/actions";
import { formatIdr } from "@/src/lib/batches/format";

const initialState: PurchaseState = { ok: false };

const inputClassName =
  "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/15";

export interface BulkBatchOption {
  batchId: number;
  productName: string;
  unit: string;
  pricePerKg: number;
  maxKg: number;
  warehouseName: string;
}

const RECURRENCE_OPTIONS = [
  { value: "NONE", label: "Sekali pesan" },
  { value: "WEEKLY", label: "Setiap minggu" },
  { value: "BIWEEKLY", label: "Setiap 2 minggu" },
  { value: "MONTHLY", label: "Setiap bulan" },
] as const;

export function BulkOrderForm({
  batches,
  today,
}: {
  batches: BulkBatchOption[];
  today: string;
}) {
  const [state, formAction, pending] = useActionState(preorderAction, initialState);
  const [batchId, setBatchId] = useState(batches[0] ? String(batches[0].batchId) : "");
  const [qty, setQty] = useState(batches[0] ? String(Math.min(50, batches[0].maxKg)) : "50");

  const selected = batches.find((batch) => String(batch.batchId) === batchId);
  const qtyNumber = Number(qty) || 0;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="batchId" value={batchId} />

      <div className="space-y-1.5">
        <label htmlFor="bulk-batch" className="block text-sm font-medium text-ink">
          Produk &amp; batch
        </label>
        <select
          id="bulk-batch"
          value={batchId}
          onChange={(event) => {
            setBatchId(event.target.value);
            const next = batches.find(
              (batch) => String(batch.batchId) === event.target.value,
            );
            if (next) setQty(String(Math.min(50, next.maxKg)));
          }}
          required
          className={inputClassName}
        >
          {batches.map((batch) => (
            <option key={batch.batchId} value={batch.batchId}>
              {batch.productName} · {formatIdr(batch.pricePerKg)}/{batch.unit} ·{" "}
              {batch.maxKg} {batch.unit} tersedia
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="bulk-qty" className="block text-sm font-medium text-ink">
            Jumlah ({selected?.unit ?? "kg"})
          </label>
          <input
            id="bulk-qty"
            name="quantityKg"
            type="number"
            inputMode="decimal"
            min={1}
            max={selected?.maxKg ?? undefined}
            step={1}
            value={qty}
            onChange={(event) => setQty(event.target.value)}
            required
            className={inputClassName}
          />
          {selected ? (
            <p className="text-xs text-ink-muted">
              Maksimal {selected.maxKg} {selected.unit} dari batch ini.
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="bulk-date" className="block text-sm font-medium text-ink">
            Tanggal pengiriman
          </label>
          <input
            id="bulk-date"
            name="scheduledFor"
            type="date"
            min={today}
            defaultValue={today}
            required
            className={inputClassName}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="bulk-recurrence" className="block text-sm font-medium text-ink">
          Pesanan berulang
        </label>
        <select id="bulk-recurrence" name="recurrence" defaultValue="NONE" className={inputClassName}>
          {RECURRENCE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="bulk-notes" className="block text-sm font-medium text-ink">
          Catatan <span className="font-normal text-ink-muted">(opsional)</span>
        </label>
        <textarea
          id="bulk-notes"
          name="notes"
          rows={2}
          maxLength={300}
          placeholder="Kebutuhan khusus pengiriman atau kemasan"
          className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/15"
        />
      </div>

      {selected && qtyNumber > 0 ? (
        <p className="rounded-lg bg-surface-muted px-4 py-3 text-sm text-ink">
          Estimasi nilai pesanan:{" "}
          <span className="font-semibold tabular-nums">
            {formatIdr(selected.pricePerKg * qtyNumber)}
          </span>{" "}
          <span className="text-ink-muted">
            ({qtyNumber} {selected.unit} × {formatIdr(selected.pricePerKg)})
          </span>
        </p>
      ) : null}

      {state.error ? (
        <p role="alert" className="rounded-lg bg-danger-soft px-3.5 py-3 text-sm font-medium text-danger">
          {state.error}
        </p>
      ) : null}
      {state.ok && state.message ? (
        <p role="status" className="rounded-lg bg-brand-soft px-3.5 py-3 text-sm font-medium text-brand-strong">
          {state.message}{" "}
          {state.code ? (
            <a href={`/orders/${state.code}`} className="underline">
              Lihat pesanan
            </a>
          ) : null}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || batches.length === 0}
        aria-busy={pending}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-strong text-sm font-semibold text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-6"
      >
        <PackagePlus className="size-4" aria-hidden="true" />
        {pending ? "Mencatat pesanan..." : "Kirim pre-order"}
      </button>
    </form>
  );
}
