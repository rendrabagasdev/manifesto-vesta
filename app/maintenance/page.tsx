import { Metadata } from "next";
import "./style.css";

export const metadata: Metadata = {
  title: "Website Under Maintenance — Vesta",
  description: "Kami sedang melakukan pemeliharaan sistem berkala pada platform Vesta.",
};

export default function MaintenancePage() {
  return (
    <main className="min-h-dvh bg-white text-zinc-900 flex flex-col items-center justify-center p-6 antialiased selection:bg-zinc-200">
      <div className="w-full max-w-3xl flex flex-col items-center text-center space-y-6 sm:space-y-8">
        {/* Maskot Ilustrasi Maintenance (Persis Sesuai Mockup) */}
        <div className="relative w-full flex items-center justify-center">
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
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl md:text-4xl tracking-tight text-zinc-900 uppercase leading-[1.15]">
            WEBSITE UNDER <br />
            MAINTENANCE
          </h1>
          <p className="text-base sm:text-lg text-zinc-700 max-w-md mx-auto leading-relaxed">
            Kami sedang melakukan pemeliharaan dan kalibrasi sistem berkala. Layanan marketplace Vesta akan segera kembali aktif.
          </p>
        </div>
      </div>

      {/* Footer Minimalis */}
      <footer className="mt-16 text-center text-xs text-zinc-500">
        &copy; 2026 Vesta Platform &middot; UNIC Web Development
      </footer>
    </main>
  );
}
