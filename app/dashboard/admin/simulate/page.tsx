import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowLeft, Clock } from "lucide-react";
import { requireRole } from "@/src/lib/auth/session";
import { SimulateTimeSection } from "@/src/components/simulate-time/SimulateTimeSection";

export const instant = false;

export const metadata: Metadata = {
  title: "Simulasi waktu — Dashboard admin — Vesta",
  description: "Percepat waktu demo untuk menguji perubahan skor kesegaran dan cascade.",
};

export default async function AdminSimulationPage() {
  await connection();
  await requireRole(["ADMIN"]);

  return (
    <div>
      <header className="max-w-3xl">
        <Link
          href="/dashboard/admin"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Kembali ke dashboard admin
        </Link>
        <div className="mt-6 flex items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
            <Clock className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-ink">
              Simulasi waktu
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">
              Halaman khusus demo untuk menguji penurunan skor kesegaran,
              transisi cascade, dan harga dinamis tanpa mengganggu ringkasan
              monitoring admin.
            </p>
          </div>
        </div>
      </header>

      <div className="mt-6">
        <SimulateTimeSection />
      </div>
    </div>
  );
}
