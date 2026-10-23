"use client";

import { useState } from "react";
import { Clock, Play, RotateCcw, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "FRESH": return "bg-green-100 text-green-800";
      case "RESCUE": return "bg-yellow-100 text-yellow-800";
      case "FEED": return "bg-orange-100 text-orange-800";
      case "RESIDUE": return "bg-red-100 text-red-800";
      case "DISPOSED": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "FRESH": return "🟢";
      case "RESCUE": return "🟡";
      case "FEED": return "🟠";
      case "RESIDUE": return "🔴";
      case "DISPOSED": return "⚫";
      default: return "⚪";
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <section className="rounded-xl border border-line bg-surface p-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Kontrol Simulasi Waktu</h2>
            <p className="text-sm text-ink-muted mt-0.5">
              Majukan waktu simulasi untuk menguji penurunan Freshness Score dan perubahan harga dinamis
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-brand-soft text-brand-strong text-sm font-medium">
              <Clock className="size-4" />
              Demo Mode
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
                className="w-24 h-10 rounded-lg border border-line bg-surface px-3 text-center text-lg font-mono text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                disabled={isLoading}
              />
              <span className="text-sm text-ink-muted">jam (1-168)</span>
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => setHours(24)}
                  className="px-3 py-1.5 rounded-lg border border-line text-sm font-medium text-ink hover:bg-surface-muted transition-colors"
                  disabled={isLoading}
                >
                  1 Hari
                </button>
                <button
                  onClick={() => setHours(168)}
                  className="px-3 py-1.5 rounded-lg border border-line text-sm font-medium text-ink hover:bg-surface-muted transition-colors"
                  disabled={isLoading}
                >
                  1 Minggu
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSimulate}
              disabled={isLoading}
              className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-strong px-5 text-sm font-semibold text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Menjalankan...
                </>
              ) : (
                <>
                  <Play className="size-4" />
                  Jalankan Simulasi
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Quick Presets */}
      <section className="rounded-xl border border-line bg-surface p-5">
        <h3 className="text-sm font-semibold text-ink mb-3">Preset Cepat</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "+6 Jam", hours: 6, desc: "Cek transisi harian" },
            { label: "+24 Jam", hours: 24, desc: "Simulasi harian standar" },
            { label: "+72 Jam", hours: 72, desc: "Lihat cascade 3 hari" },
            { label: "+168 Jam", hours: 168, desc: "Simulasi 1 minggu penuh" },
          ].map((preset) => (
            <button
              key={preset.hours}
              onClick={() => setHours(preset.hours)}
              disabled={isLoading}
              className={cn(
                "px-3 py-2 rounded-lg border text-sm transition-colors",
                hours === preset.hours
                  ? "border-brand bg-brand-soft text-brand-strong"
                  : "border-line text-ink hover:bg-surface-muted"
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
            <h3 className="text-lg font-semibold text-ink">Hasil Simulasi Terakhir</h3>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-medium",
                lastResult.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              )}
            >
              {lastResult.success ? (
                <>
                  <CheckCircle className="size-4" />
                  Berhasil
                </>
              ) : (
                <>
                  <AlertTriangle className="size-4" />
                  Gagal
                </>
              )}
            </span>
          </div>

          {lastResult.success && lastResult.data && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-surface-muted p-4">
                <p className="text-3xl font-bold text-ink">{lastResult.data.processedBatches}</p>
                <p className="text-xs text-ink-muted">Batch Diproses</p>
              </div>
              <div className="rounded-lg bg-surface-muted p-4">
                <p className="text-3xl font-bold text-ink">{lastResult.data.statusTransitions.length}</p>
                <p className="text-xs text-ink-muted">Transisi Status</p>
              </div>
              <div className="rounded-lg bg-surface-muted p-4">
                <p className="text-3xl font-bold text-ink">{lastResult.data.newRescueDeals + lastResult.data.newFeedListings + lastResult.data.newResidueListings}</p>
                <p className="text-xs text-ink-muted">Listing Baru</p>
              </div>
              <div className="rounded-lg bg-surface-muted p-4">
                <p className="text-3xl font-bold text-ink">{lastResult.data.disposedBatches}</p>
                <p className="text-xs text-ink-muted">Dibuang</p>
              </div>
            </div>
          )}

          {lastResult.success && lastResult.data && lastResult.data.statusTransitions.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-ink mb-2">Detail Transisi Status</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-ink-muted">
                      <th className="py-2 px-3 font-medium">Batch</th>
                      <th className="py-2 px-3 font-medium">Dari</th>
                      <th className="py-2 px-3 font-medium">Ke</th>
                      <th className="py-2 px-3 font-medium">Skor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastResult.data.statusTransitions.map((transition) => (
                      <tr key={transition.batchId} className="border-b border-line/50">
                        <td className="py-2 px-3 font-mono text-ink">{transition.batchCode}</td>
                        <td className="py-2 px-3">
                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium", getStatusColor(transition.fromStatus))}>
                            {getStatusIcon(transition.fromStatus)} {transition.fromStatus}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium", getStatusColor(transition.toStatus))}>
                            {getStatusIcon(transition.toStatus)} {transition.toStatus}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-ink">{transition.freshnessScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!lastResult.success && (
            <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-800">{lastResult.error ?? lastResult.message}</p>
            </div>
          )}
        </section>
      )}

      {/* History */}
      {history.length > 0 && (
        <section className="rounded-xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between gap-4 mb-3">
            <h3 className="text-lg font-semibold text-ink">Riwayat Simulasi</h3>
            <button
              onClick={handleReset}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg border border-line text-sm font-medium text-ink hover:bg-surface-muted transition-colors"
            >
              <RotateCcw className="size-4 inline mr-1" />
              Reset Riwayat
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {history.map((item, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center justify-between gap-3 p-3 rounded-lg border transition-colors",
                  item.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={cn("px-2 py-1 rounded text-xs font-mono font-medium", item.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")}>
                    {item.success ? "✓" : "✗"}
                  </span>
                  <div>
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
                  <div className="flex items-center gap-4 text-xs text-ink-muted">
                    <span>🟢 {item.data.newRescueDeals} Rescue</span>
                    <span>🟠 {item.data.newFeedListings} Feed</span>
                    <span>🔴 {item.data.newResidueListings} Residue</span>
                    <span>⚫ {item.data.disposedBatches} Disposed</span>
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
          <AlertTriangle className="size-4 text-amber-600" />
          Catatan Penting
        </h3>
        <ul className="space-y-2 text-sm text-ink-muted">
          <li className="flex items-start gap-2">
            <span className="text-brand-strong">•</span>
            Simulasi ini memperbarui database secara permanen — gunakan dengan hati-hati
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-strong">•</span>
            Freshness Score dihitung ulang berdasarkan jam yang dimajukan
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-strong">•</span>
            Batch otomatis berpindah tahap (FRESH → RESCUE → FEED → RESIDUE → DISPOSED)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-strong">•</span>
            Rescue Deal, Feed Listing, dan Residue Listing dibuat/diperbarui otomatis
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-strong">•</span>
            Harga dinamis (Dynamic Rescue Pricing) dihitung ulang per batch
          </li>
        </ul>
      </section>
    </div>
  );
}