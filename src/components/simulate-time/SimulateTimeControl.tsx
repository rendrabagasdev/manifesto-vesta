"use client";

import { useState } from "react";
import { Clock, Play, RotateCcw, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BATCH_STATUSES,
  STATUS_META,
  type BatchStatusValue,
} from "@/src/lib/batches/freshness";

interface SimulateTickResult {
  success: boolean;
  message: string;
  data?: {
    advancedHours: number;
    processedBatches: number;
    statusTransitions: Array<{
      batchId: number;
      batchCode: string;
      fromStatus: string;
      toStatus: string;
      freshnessScore: number;
    }>;
    updatedPricing: number;
    newRescueDeals: number;
    newFeedListings: number;
    newResidueListings: number;
    disposedBatches: number;
  };
  error?: string;
}

function statusMeta(status: string) {
  return isBatchStatusValue(status) ? STATUS_META[status] : null;
}

function isBatchStatusValue(value: string): value is BatchStatusValue {
  return (BATCH_STATUSES as readonly string[]).includes(value);
}

export function SimulateTimeControl() {
  const [hours, setHours] = useState(24);
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<SimulateTickResult | null>(null);
  const [history, setHistory] = useState<SimulateTickResult[]>([]);

  const handleSimulate = async () => {
    setIsLoading(true);
    setLastResult(null);

    try {
      const response = await fetch("/api/demo/simulate-tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours }),
      });

      const result = await response.json();
      setLastResult(result);

      if (result.success) {
        setHistory((prev) => [result, ...prev.slice(0, 9)]); // Keep last 10
      }
    } catch (error) {
      setLastResult({
        success: false,
        message: "Gagal menjalankan simulasi",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    // This would need a backend endpoint to reset simulation time
    // For now, just clear local state
    setLastResult(null);
    setHistory([]);
  };

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <section className="rounded-xl border border-line bg-surface p-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-ink">Kontrol simulasi waktu</h3>
            <p className="text-sm text-ink-muted mt-0.5">
              Majukan waktu simulasi untuk menguji penurunan Freshness Score dan perubahan harga dinamis
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-brand-soft text-brand-strong text-sm font-medium">
              <Clock className="size-4" aria-hidden="true" />
              Mode demo
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label htmlFor="hours" className="block text-sm font-medium text-ink mb-1.5">
              Jam yang dimajukan
            </label>
            <div className="flex items-center gap-3">
              <input
                id="hours"
                type="number"
                min="1"
                max="168"
                step="1"
                value={hours}
                onChange={(e) => setHours(Math.max(1, Math.min(168, parseInt(e.target.value) || 24)))}
                className="h-10 w-24 rounded-lg border border-line bg-surface px-3 text-center text-lg font-semibold tabular-nums text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                disabled={isLoading}
              />
              <span className="text-sm text-ink-muted">jam (1–168)</span>
              <div className="flex gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setHours(24)}
                  className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  disabled={isLoading}
                >
                  1 hari
                </button>
                <button
                  type="button"
                  onClick={() => setHours(168)}
                  className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  disabled={isLoading}
                >
                  1 minggu
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleSimulate}
              disabled={isLoading}
              aria-busy={isLoading}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand-strong px-5 text-sm font-semibold text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Menjalankan…
                </>
              ) : (
                <>
                  <Play className="size-4" aria-hidden="true" />
                  Jalankan simulasi
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Quick Presets */}
      <section className="rounded-xl border border-line bg-surface p-5">
        <h4 className="text-sm font-semibold text-ink mb-3">Preset cepat</h4>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "+6 jam", hours: 6, desc: "Cek transisi harian" },
            { label: "+24 jam", hours: 24, desc: "Simulasi harian standar" },
            { label: "+72 jam", hours: 72, desc: "Lihat cascade 3 hari" },
            { label: "+168 jam", hours: 168, desc: "Simulasi 1 minggu penuh" },
          ].map((preset) => (
            <button
              key={preset.hours}
              type="button"
              onClick={() => setHours(preset.hours)}
              disabled={isLoading}
              aria-pressed={hours === preset.hours}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                hours === preset.hours
                  ? "border-brand bg-brand-soft text-brand-strong"
                  : "border-line text-ink hover:bg-surface-muted",
              )}
              title={preset.desc}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      {/* Last Result */}
      {lastResult && (
        <section className="rounded-xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between gap-4 mb-3">
            <h3 className="text-sm font-semibold text-ink">Hasil simulasi terakhir</h3>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-sm font-medium",
                lastResult.success
                  ? "bg-brand-soft text-brand-strong"
                  : "bg-danger-soft text-danger",
              )}
            >
              {lastResult.success ? (
                <>
                  <CheckCircle className="size-4" aria-hidden="true" />
                  Berhasil
                </>
              ) : (
                <>
                  <AlertTriangle className="size-4" aria-hidden="true" />
                  Gagal
                </>
              )}
            </span>
          </div>

          {lastResult.success && lastResult.data && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-surface-muted p-4">
                <p className="text-2xl font-semibold tabular-nums tracking-tight text-ink">
                  {lastResult.data.processedBatches}
                </p>
                <p className="text-xs text-ink-muted">Batch diproses</p>
              </div>
              <div className="rounded-lg bg-surface-muted p-4">
                <p className="text-2xl font-semibold tabular-nums tracking-tight text-ink">
                  {lastResult.data.statusTransitions.length}
                </p>
                <p className="text-xs text-ink-muted">Transisi status</p>
              </div>
              <div className="rounded-lg bg-surface-muted p-4">
                <p className="text-2xl font-semibold tabular-nums tracking-tight text-ink">
                  {lastResult.data.newRescueDeals + lastResult.data.newFeedListings + lastResult.data.newResidueListings}
                </p>
                <p className="text-xs text-ink-muted">Listing baru</p>
              </div>
              <div className="rounded-lg bg-surface-muted p-4">
                <p className="text-2xl font-semibold tabular-nums tracking-tight text-ink">
                  {lastResult.data.disposedBatches}
                </p>
                <p className="text-xs text-ink-muted">Dibuang</p>
              </div>
            </div>
          )}

          {lastResult.success && lastResult.data && lastResult.data.statusTransitions.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-ink mb-2">Detail transisi status</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-ink-muted">
                      <th scope="col" className="py-2 px-3 font-medium">Batch</th>
                      <th scope="col" className="py-2 px-3 font-medium">Dari</th>
                      <th scope="col" className="py-2 px-3 font-medium">Ke</th>
                      <th scope="col" className="py-2 px-3 text-right font-medium">Skor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastResult.data.statusTransitions.map((transition) => {
                      const from = statusMeta(transition.fromStatus);
                      const to = statusMeta(transition.toStatus);

                      return (
                        <tr key={transition.batchId} className="border-b border-line/50">
                          <td className="py-2 px-3 font-medium text-ink">{transition.batchCode}</td>
                          <td className="py-2 px-3">
                            {from ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium text-ink">
                                <span className={cn("size-1.5 rounded-full", from.dotClassName)} aria-hidden="true" />
                                {from.label}
                              </span>
                            ) : (
                              <span className="text-xs text-ink-muted">{transition.fromStatus}</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {to ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium text-ink">
                                <span className={cn("size-1.5 rounded-full", to.dotClassName)} aria-hidden="true" />
                                {to.label}
                              </span>
                            ) : (
                              <span className="text-xs text-ink-muted">{transition.toStatus}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold tabular-nums text-ink">
                            {transition.freshnessScore}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!lastResult.success && (
            <div className="mt-3 rounded-lg border border-danger/20 bg-danger-soft p-3">
              <p className="text-sm text-danger">{lastResult.error ?? lastResult.message}</p>
            </div>
          )}
        </section>
      )}

      {/* History */}
      {history.length > 0 && (
        <section className="rounded-xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between gap-4 mb-3">
            <h3 className="text-sm font-semibold text-ink">Riwayat simulasi</h3>
            <button
              type="button"
              onClick={handleReset}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Reset riwayat
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {history.map((item, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors",
                  item.success ? "border-line bg-surface" : "border-danger/20 bg-danger-soft",
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={cn(
                      "inline-flex size-6 shrink-0 items-center justify-center rounded-full",
                      item.success ? "bg-brand-soft text-brand-strong" : "bg-danger-soft text-danger",
                    )}
                  >
                    {item.success ? (
                      <CheckCircle className="size-4" aria-hidden="true" />
                    ) : (
                      <AlertTriangle className="size-4" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">
                      {item.data ? `+${item.data.advancedHours} jam` : "Gagal"}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {item.data
                        ? `${item.data.processedBatches} batch, ${item.data.statusTransitions.length} transisi`
                        : item.error}
                    </p>
                  </div>
                </div>
                {item.data && (
                  <div className="flex items-center gap-4 text-xs tabular-nums text-ink-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-stage-rescue" aria-hidden="true" />
                      {item.data.newRescueDeals} rescue
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-stage-feed" aria-hidden="true" />
                      {item.data.newFeedListings} pakan
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-stage-residue" aria-hidden="true" />
                      {item.data.newResidueListings} residu
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-stage-disposed" aria-hidden="true" />
                      {item.data.disposedBatches} dibuang
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Info Panel */}
      <section className="rounded-xl border border-line bg-surface p-5">
        <h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
          <AlertTriangle className="size-4 text-danger" aria-hidden="true" />
          Catatan penting
        </h3>
        <ul className="space-y-2 text-sm text-ink-muted">
          <li className="flex items-start gap-2">
            <span className="text-brand-strong" aria-hidden="true">•</span>
            Simulasi ini memperbarui database secara permanen — gunakan dengan hati-hati
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-strong" aria-hidden="true">•</span>
            Freshness Score dihitung ulang berdasarkan jam yang dimajukan
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-strong" aria-hidden="true">•</span>
            Batch otomatis berpindah tahap (Fresh → Rescue → Pakan → Residu → Dibuang)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-strong" aria-hidden="true">•</span>
            Rescue deal, listing pakan, dan listing residu dibuat/diperbarui otomatis
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-strong" aria-hidden="true">•</span>
            Harga dinamis dihitung ulang per batch
          </li>
        </ul>
      </section>
    </div>
  );
}
