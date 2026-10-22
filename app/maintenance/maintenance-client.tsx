"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export function MaintenanceClient() {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState({ minutes: 34, seconds: 20 });
  const [bypassInput, setBypassInput] = useState("");
  const [showBypass, setShowBypass] = useState(false);
  const [bypassStatus, setBypassStatus] = useState<"idle" | "error" | "success">("idle");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Timer countdown sederhana
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { minutes: prev.minutes - 1, seconds: 59 };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleBypassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bypassInput.trim() === "vesta2026") {
      setBypassStatus("success");
      // Set cookie bypass langsung via browser document.cookie
      document.cookie = "vesta_maintenance_bypass=true; path=/; max-age=7200; SameSite=Lax";
      setTimeout(() => {
        router.push("/?bypass=vesta2026");
        router.refresh();
      }, 700);
    } else {
      setBypassStatus("error");
      setTimeout(() => setBypassStatus("idle"), 2500);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      window.location.reload();
    }, 600);
  };

  return (
    <div className="space-y-8">
      {/* Estimasi Waktu & Refresh */}
      <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-5 dark:border-stone-800 dark:bg-stone-900/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Estimasi Jendela Pemeliharaan
            </div>
            <div className="mt-1 flex items-baseline gap-2 font-mono text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              <span>{String(timeLeft.minutes).padStart(2, "0")}m</span>
              <span className="text-stone-400">:</span>
              <span>{String(timeLeft.seconds).padStart(2, "0")}s</span>
              <span className="text-xs font-normal text-stone-500">tersisa</span>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 shadow-sm transition-all hover:bg-stone-50 active:scale-95 disabled:opacity-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
          >
            <svg
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-emerald-600" : "text-stone-500"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>{isRefreshing ? "Memeriksa..." : "Periksa Status"}</span>
          </button>
        </div>

        {/* Progress Bar Visualizer */}
        <div className="mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all duration-500 dark:bg-emerald-500"
              style={{ width: "72%" }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-stone-500">
            <span>Fase 2/3: Sinkronisasi Database Batch</span>
            <span>72% Selesai</span>
          </div>
        </div>
      </div>

      {/* Bypass Gate untuk Pengembang / Juri Lomba */}
      <div className="pt-2">
        {!showBypass ? (
          <button
            type="button"
            onClick={() => setShowBypass(true)}
            className="text-xs text-stone-400 underline-offset-4 transition-colors hover:text-stone-700 hover:underline dark:text-stone-500 dark:hover:text-stone-300"
          >
            Akses Masuk Khusus Tim Penguji / Juri &rarr;
          </button>
        ) : (
          <form
            onSubmit={handleBypassSubmit}
            className="rounded-lg border border-dashed border-stone-300 p-4 dark:border-stone-700"
          >
            <label
              htmlFor="bypass-key"
              className="block text-xs font-medium text-stone-700 dark:text-stone-300"
            >
              Kunci Bypass Platform (Default Demo: <code className="font-mono text-emerald-600">vesta2026</code>)
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="bypass-key"
                type="password"
                value={bypassInput}
                onChange={(e) => setBypassInput(e.target.value)}
                placeholder="Masukkan kunci akses..."
                className="flex-1 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-900 placeholder-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
              />
              <button
                type="submit"
                className="rounded-md bg-stone-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
              >
                Bypass & Masuk
              </button>
              <button
                type="button"
                onClick={() => setShowBypass(false)}
                className="rounded-md border border-stone-300 px-2 py-1.5 text-xs text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
              >
                Tutup
              </button>
            </div>

            {bypassStatus === "error" && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                Kunci akses salah. Silakan periksa kembali.
              </p>
            )}
            {bypassStatus === "success" && (
              <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                Akses terverifikasi. Mengalihkan ke marketplace...
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
