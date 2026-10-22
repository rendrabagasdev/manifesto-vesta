"use client";

import { useActionState } from "react";
import { updateBatchAction } from "../actions";
import type { BatchFormState } from "@/src/lib/batches/validation";

const initialState: BatchFormState = {};

export function BatchUpdateForm({
  batchId,
  storageTempC,
  qualityNote,
}: {
  batchId: number;
  storageTempC: number;
  qualityNote: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateBatchAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="mt-4 grid gap-3 sm:grid-cols-[150px_1fr_auto] sm:items-end"
    >
      <input type="hidden" name="batchId" value={batchId} />

      <div className="space-y-1.5">
        <label
          htmlFor="update-storageTempC"
          className="block text-xs font-medium text-ink-muted"
        >
          Suhu penyimpanan (°C)
        </label>
        <input
          id="update-storageTempC"
          name="storageTempC"
          type="number"
          inputMode="decimal"
          min="-30"
          max="60"
          step="0.1"
          defaultValue={storageTempC}
          required
          className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15"
        />
        {state.fieldErrors?.storageTempC?.[0] ? (
          <p className="text-xs font-medium text-danger">
            {state.fieldErrors.storageTempC[0]}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="update-qualityNote"
          className="block text-xs font-medium text-ink-muted"
        >
          Catatan kualitas
        </label>
        <textarea
          id="update-qualityNote"
          name="qualityNote"
          rows={2}
          maxLength={500}
          defaultValue={qualityNote ?? ""}
          placeholder="Kondisi terbaru setelah pemeriksaan."
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/15"
        />
        {state.fieldErrors?.qualityNote?.[0] ? (
          <p className="text-xs font-medium text-danger">
            {state.fieldErrors.qualityNote[0]}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="inline-flex h-9 items-center justify-center rounded-lg bg-brand-strong px-4 text-sm font-semibold text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Menghitung ulang..." : "Simpan kondisi"}
      </button>

      {state.error ? (
        <p
          role="alert"
          className="text-xs font-medium text-danger sm:col-span-3"
        >
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p
          role="status"
          className="rounded-lg bg-brand-soft px-3 py-2 text-xs font-medium text-brand-strong sm:col-span-3"
        >
          {state.success}
        </p>
      ) : null}
    </form>
  );
}
