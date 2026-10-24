import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, PackagePlus } from "lucide-react";
import { BATCH_CREATE_ROLES } from "@/src/lib/auth/roles";
import { requireRole } from "@/src/lib/auth/session";
import { dateInputValue } from "@/src/lib/batches/format";
import {
  getProductsForUser,
  getWarehouses,
} from "@/src/lib/batches/queries";
import { BatchForm } from "./batch-form";

export const instant = false;

export const metadata: Metadata = {
  title: "Batch baru · Vesta",
  description: "Catat pasokan baru dan hitung skor kesegaran otomatis.",
};

export default async function NewBatchPage() {
  const user = await requireRole(BATCH_CREATE_ROLES);
  const [products, warehouses] = await Promise.all([
    getProductsForUser(user),
    getWarehouses(),
  ]);

  return (
    <div>
      <Link
        href="/dashboard/batches"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Batch &amp; pasokan
      </Link>

      <div className="mt-4">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-ink">
          Catat batch baru
        </h1>
        <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-muted">
          Masukkan pasokan yang baru diterima. Skor, tahap cascade, dan harga
          akan dihitung sebelum batch tampil di gudang.
        </p>
      </div>

      {products.length === 0 || warehouses.length === 0 ? (
        <section className="mt-8 rounded-xl border border-dashed border-line p-6">
          <span className="flex size-9 items-center justify-center rounded-lg bg-surface-muted text-ink-muted">
            <PackagePlus className="size-4" aria-hidden="true" />
          </span>
          <h2 className="mt-3 text-base font-semibold text-ink">
            Batch belum bisa dicatat
          </h2>
          <p className="mt-1 max-w-md text-sm leading-relaxed text-ink-muted">
            {products.length === 0
              ? "Belum ada produk yang terhubung ke akun produsen ini."
              : "Belum ada gudang penerima yang tersedia."}
          </p>
        </section>
      ) : (
        <section className="mt-8 rounded-xl border border-line bg-surface p-5 sm:p-6">
          <BatchForm
            products={products}
            warehouses={warehouses}
            today={dateInputValue()}
          />
        </section>
      )}
    </div>
  );
}
