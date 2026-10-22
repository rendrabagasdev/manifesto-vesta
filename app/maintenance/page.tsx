import { Metadata } from "next";
import { MaintenanceClient } from "./maintenance-client";

export const metadata: Metadata = {
  title: "Pemeliharaan Sistem — Vesta Freshness Cascade",
  description: "Platform Vesta sedang dalam pemeliharaan terjadwal untuk kalibrasi algoritma kesegaran pangan.",
};

const subsystems = [
  {
    name: "Basis Data PostgreSQL (appdb)",
    status: "Operational",
    indicator: "bg-emerald-500",
    note: "15+ tabel terintegrasi aman",
  },
  {
    name: "Mesin Freshness Cascade",
    status: "Recalibrating",
    indicator: "bg-amber-400 animate-pulse",
    note: "Kalibrasi koefisien pembusukan (k_suhu)",
  },
  {
    name: "Notifikasi WhatsApp (Fonnte)",
    status: "Standby",
    indicator: "bg-emerald-500",
    note: "Antrean deal di-pause sementara",
  },
  {
    name: "Payment Gateway (Midtrans)",
    status: "Standby",
    indicator: "bg-emerald-500",
    note: "Mode sandbox tidak terganggu",
  },
];

const cascadeSteps = [
  {
    id: "01",
    tag: "FRESH",
    score: "Skor ≥ 70",
    desc: "Marketplace Konsumen & Mitra B2B",
    active: true,
  },
  {
    id: "02",
    tag: "RESCUE",
    score: "Skor < 70",
    desc: "Dynamic Discount & Loyalty Gate",
    active: true,
  },
  {
    id: "03",
    tag: "FEED",
    score: "Skor < 30",
    desc: "Penyelamatan Pakan Ternak",
    active: false,
  },
  {
    id: "04",
    tag: "RESIDUE",
    score: "Skor < 10",
    desc: "Bio-kompos & Energi Biogas",
    active: false,
  },
  {
    id: "05",
    tag: "DISPOSED",
    score: "Skor 0",
    desc: "Waste Diversion Target (Minim Terbuang)",
    active: false,
  },
];

export default function MaintenancePage() {
  return (
    <main className="min-h-screen bg-[#fafaf8] text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <div className="flex min-h-screen flex-col lg:flex-row">
        {/* ============================================================== */}
        {/* SISI KIRI: SPLIT STAGE (STICKY HERO & CASCADE MACHINE DIAGRAM) */}
        {/* ============================================================== */}
        <div className="relative flex flex-col justify-between border-b border-stone-200 bg-[#081a13] p-8 text-stone-100 lg:sticky lg:top-0 lg:h-screen lg:w-[45%] lg:border-b-0 lg:border-r lg:border-emerald-900/40 lg:p-14">
          {/* Subtle noise / ambient ring */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] opacity-[0.07] [background-size:24px_24px]" />

          {/* Top Identifier */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <span className="flex h-2.5 w-2.5 items-center justify-center">
                <span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative h-2 w-2 rounded-full bg-amber-400" />
              </span>
              <span className="font-mono text-xs font-semibold tracking-wider text-emerald-400">
                VESTA SYSTEM // SYSTEM STATUS
              </span>
            </div>

            <h1 className="mt-6 font-serif text-3xl font-medium tracking-tight text-white sm:text-4xl lg:text-5xl lg:leading-[1.15]">
              Menyelamatkan Pangan Sebelum Terlambat.
            </h1>

            <p className="mt-4 max-w-md text-sm leading-relaxed text-emerald-200/80">
              Platform marketplace bahan pokok segar langsung dari produsen ke konsumen tanpa tengkulak, dengan mekanisme harga dinamis 5 tahap cascade.
            </p>
          </div>

          {/* Middle: Schematic Cascade Machine */}
          <div className="relative z-10 my-10 space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500/80">
              Alur Cascade Engine (Sedang Sinkronisasi)
            </div>

            <div className="space-y-2">
              {cascadeSteps.map((step) => (
                <div
                  key={step.id}
                  className="flex items-center justify-between rounded-lg border border-emerald-900/50 bg-emerald-950/40 px-3.5 py-2.5 text-xs transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-emerald-400/60">
                      {step.id}
                    </span>
                    <span className="font-semibold tracking-wide text-white">
                      {step.tag}
                    </span>
                    <span className="hidden text-[11px] text-emerald-300/70 sm:inline">
                      ({step.score})
                    </span>
                  </div>
                  <div className="text-right text-[11px] text-emerald-200/60">
                    {step.desc}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-md bg-emerald-950/60 p-3 text-[11px] font-mono text-emerald-300/70">
              F = 100 × max(0, 1 - (t_simpan · k_suhu + t_kirim) / S_komoditas)
            </div>
          </div>

          {/* Bottom Footnote */}
          <div className="relative z-10 flex items-center justify-between border-t border-emerald-900/40 pt-4 text-xs text-emerald-300/60">
            <span>UNIC Web Development 2026</span>
            <span>Food Waste Ecosystem</span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SISI KANAN: READING & ACTION COLUMN (INFORMATIVE & ACCESSIBLE) */}
        {/* ============================================================== */}
        <div className="flex flex-1 flex-col justify-between p-8 sm:p-12 lg:w-[55%] lg:p-16">
          <div className="max-w-xl space-y-10">
            {/* Maintenance Header */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/80 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-800/80 dark:bg-amber-950/50 dark:text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                PEMELIHARAAN SISTEM TERJADWAL
              </div>

              <h2 className="mt-4 font-serif text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50 sm:text-3xl">
                Kami Sedang Mengkalibrasi Ledger & Algoritma Kesegaran
              </h2>

              <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300 sm:text-base">
                Platform Vesta sedang melakukan sinkronisasi data batch masuk dari gudang mitra dan pembaruan mesin harga dinamis. Stok yang sedang dalam penyimpanan aman berpendingin dan transaksi yang telah dibuat tidak akan terpengaruh.
              </p>
            </div>

            {/* Interactive Countdown & Bypass Component */}
            <MaintenanceClient />

            {/* Subsystems Health Checklist */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Status Subsistem Platform
              </h3>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {subsystems.map((sub, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col justify-between rounded-lg border border-stone-200 bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] dark:border-stone-800 dark:bg-stone-900"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-stone-900 dark:text-stone-100">
                        {sub.name}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${sub.indicator}`} />
                        <span className="font-mono text-[11px] text-stone-600 dark:text-stone-400">
                          {sub.status}
                        </span>
                      </span>
                    </div>
                    <span className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
                      {sub.note}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Operational Contact */}
            <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Kontak Darurat Operasional Gudang & Petani
              </h3>
              <p className="mt-1.5 text-xs text-stone-600 dark:text-stone-300">
                Untuk koordinasi darurat penerimaan muatan panen atau perpanjangan pre-order, hubungi tim piket teknis:
              </p>

              <div className="mt-3 flex flex-wrap gap-4 text-xs font-mono">
                <a
                  href="mailto:ops@vesta.id"
                  className="inline-flex items-center gap-1 text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  <span>✉</span> ops@vesta.id
                </a>
                <span className="text-stone-300 dark:text-stone-700">|</span>
                <span className="text-stone-700 dark:text-stone-300">
                  WA Hotline: +62 812-VESTA-OPS
                </span>
              </div>
            </div>
          </div>

          {/* Footer copyright */}
          <div className="mt-12 border-t border-stone-200 pt-6 text-xs text-stone-400 dark:border-stone-800">
            &copy; {new Date().getFullYear()} Vesta Platform. Didesain untuk Lomba Web Development UNIC 2026.
          </div>
        </div>
      </div>
    </main>
  );
}
