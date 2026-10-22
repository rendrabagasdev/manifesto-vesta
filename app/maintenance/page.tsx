import type { Metadata } from "next";
import "./style.css";

export const metadata: Metadata = {
  title: "Website Under Maintenance — Vesta",
  description: "Kami sedang melakukan pemeliharaan sistem berkala pada platform Vesta.",
};

export default function MaintenancePage() {
  return (
    <main className="min-h-dvh bg-surface text-ink flex flex-col items-center justify-center p-6 antialiased selection:bg-brand-soft">
      <div className="w-full max-w-3xl flex flex-col items-center text-center space-y-6 sm:space-y-8">
        {/* Maskot Ilustrasi Maintenance (Persis Sesuai Mockup) */}
        <div className="rise-in relative w-full flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/maskot-maintrenace.svg"
            alt="Website Under Maintenance"
            className="mascot-float w-full h-auto object-contain select-none"
            loading="eager"
          />
        </div>

        {/* Teks Judul Utama (Sesuai Persis dengan Gambar Referensi) */}
        <div className="space-y-3">
          <h1 className="rise-in rise-in-1 font-heading font-extrabold text-3xl sm:text-4xl md:text-5xl tracking-tight text-ink uppercase leading-[1.1]">
            Website Under <br />
            Maintenance
          </h1>
          <p className="rise-in rise-in-2 text-lg sm:text-xl text-ink-muted max-w-md mx-auto leading-relaxed">
            Kami sedang melakukan pemeliharaan dan kalibrasi sistem berkala. Layanan marketplace Vesta akan segera kembali aktif.
          </p>
        </div>

        <form action="/" method="get" className="rise-in rise-in-3 pt-2">
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Coba lagi
          </button>
        </form>
      </div>

      {/* Footer Minimalis */}
      <footer className="rise-in rise-in-4 mt-16 text-center text-sm text-ink-muted">
        &copy; 2026 Vesta Platform &middot; UNIC Web Development
      </footer>
    </main>
  );
}
