import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowLeft, SlidersHorizontal } from "lucide-react";
import { requireRole } from "@/src/lib/auth/session";
import { getPlatformConfig } from "@/src/lib/config/platform";
import { formatDateTime } from "@/src/lib/batches/format";
import { ConfigForm } from "./config-form";

export const instant = false;

export const metadata: Metadata = {
  title: "Konfigurasi cascade — Dashboard admin — Vesta",
  description: "Atur ambang cascade, timer tahap, dan biaya default platform.",
};

export default async function AdminConfigPage() {
  await connection();
  await requireRole(["ADMIN"]);
  const config = await getPlatformConfig();

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
            <SlidersHorizontal className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-ink">
              Konfigurasi cascade
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">
              Perubahan berlaku pada tick cascade berikutnya dan pada batch baru
              yang dibuat setelah disimpan.
            </p>
            {config.updatedAt ? (
              <p className="mt-2 text-xs text-ink-muted">
                Terakhir diperbarui {formatDateTime(config.updatedAt)}
              </p>
            ) : (
              <p className="mt-2 text-xs text-ink-muted">
                Masih memakai nilai default platform.
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="mt-6 max-w-4xl">
        <ConfigForm config={config} />
      </div>
    </div>
  );
}
