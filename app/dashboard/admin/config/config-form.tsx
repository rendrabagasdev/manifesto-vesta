"use client";

import { useActionState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { PlatformConfigView } from "@/src/lib/config/platform";
import { saveConfigAction, type ConfigFormState } from "./actions";

const INPUT_CLASS =
  "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm tabular-nums text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15";

function NumberField({
  name,
  label,
  hint,
  defaultValue,
  min,
  max,
  suffix,
  error,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultValue: number;
  min: number;
  max: number;
  suffix: string;
  error?: string[];
}) {
  const id = `config-${name}`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          name={name}
          type="number"
          inputMode="numeric"
          required
          min={min}
          max={max}
          step={1}
          defaultValue={defaultValue}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={`${INPUT_CLASS} pr-14`}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-ink-muted">
          {suffix}
        </span>
      </div>
      {error ? (
        <p id={errorId} className="mt-1 text-xs text-danger">
          {error[0]}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1 text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function ConfigForm({ config }: { config: PlatformConfigView }) {
  const [state, formAction, pending] = useActionState<ConfigFormState, FormData>(
    saveConfigAction,
    {},
  );
  const errors = state.fieldErrors ?? {};
  const timers = config.stageTimersHours;

  return (
    <form
      key={config.updatedAt ?? "defaults"}
      action={formAction}
      className="space-y-4"
    >
      {state.error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {state.error}
        </div>
      ) : null}
      {state.success ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-brand/20 bg-brand-soft px-4 py-3 text-sm text-brand-strong"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {state.success}
        </div>
      ) : null}

      <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-ink">Ambang cascade</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          Skor kesegaran dipetakan ke tahap berdasarkan ambang ini. Nilai harus
          memenuhi segar &gt; layu &gt; pakan ≥ residu.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField
            name="thresholdFresh"
            label="Segar minimal"
            defaultValue={config.thresholds.fresh}
            min={0}
            max={100}
            suffix="skor"
            error={errors.thresholdFresh}
          />
          <NumberField
            name="thresholdRescue"
            label="Layu minimal"
            defaultValue={config.thresholds.rescue}
            min={0}
            max={100}
            suffix="skor"
            error={errors.thresholdRescue}
          />
          <NumberField
            name="thresholdFeed"
            label="Pakan minimal"
            defaultValue={config.thresholds.feed}
            min={0}
            max={100}
            suffix="skor"
            error={errors.thresholdFeed}
          />
          <NumberField
            name="thresholdResidue"
            label="Residu minimal"
            defaultValue={config.thresholds.residue}
            min={0}
            max={100}
            suffix="skor"
            hint="Skor di atas nilai ini masuk residu."
            error={errors.thresholdResidue}
          />
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-ink">Batas waktu tahap</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          Batch dipaksa turun ke tahap berikutnya setelah melewati batas jam ini.
          Tahap segar dan dibuang tidak memakai timer.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <NumberField
            name="rescueTimerHours"
            label="Timer layu"
            defaultValue={timers.RESCUE ?? 48}
            min={0}
            max={8760}
            suffix="jam"
            error={errors.rescueTimerHours}
          />
          <NumberField
            name="feedTimerHours"
            label="Timer pakan"
            defaultValue={timers.FEED ?? 72}
            min={0}
            max={8760}
            suffix="jam"
            error={errors.feedTimerHours}
          />
          <NumberField
            name="residueTimerHours"
            label="Timer residu"
            defaultValue={timers.RESIDUE ?? 72}
            min={0}
            max={8760}
            suffix="jam"
            error={errors.residueTimerHours}
          />
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-ink">Biaya default per kg</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          Dipakai saat batch baru dibuat atau belum memiliki rincian harga
          sendiri.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <NumberField
            name="warehouseCostPerKg"
            label="Biaya gudang"
            defaultValue={config.pricing.warehouseCostPerKg}
            min={0}
            max={10_000_000}
            suffix="Rp/kg"
            error={errors.warehouseCostPerKg}
          />
          <NumberField
            name="logisticsCostPerKg"
            label="Biaya logistik"
            defaultValue={config.pricing.logisticsCostPerKg}
            min={0}
            max={10_000_000}
            suffix="Rp/kg"
            error={errors.logisticsCostPerKg}
          />
          <NumberField
            name="marginPerKg"
            label="Margin platform"
            defaultValue={config.pricing.marginPerKg}
            min={0}
            max={10_000_000}
            suffix="Rp/kg"
            error={errors.marginPerKg}
          />
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-ink">Layu & akses awal</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          Durasi penawaran layu dan jendela akses awal untuk tier Gold/Platinum
          saat batch masuk tahap layu.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <NumberField
            name="rescueDealDurationHours"
            label="Durasi penawaran layu"
            defaultValue={config.rescueDealDurationHours}
            min={1}
            max={720}
            suffix="jam"
            error={errors.rescueDealDurationHours}
          />
          <NumberField
            name="earlyAccessWindowHours"
            label="Jendela akses awal"
            defaultValue={config.earlyAccessWindowHours}
            min={0}
            max={168}
            suffix="jam"
            error={errors.earlyAccessWindowHours}
          />
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-strong px-5 text-sm font-semibold text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Menyimpan..." : "Simpan konfigurasi"}
        </button>
      </div>
    </form>
  );
}
