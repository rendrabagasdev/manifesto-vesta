import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import {
  ArrowLeft,
  MapPin,
  UserRound,
  Warehouse as WarehouseIcon,
} from "lucide-react";
import { db } from "@/src/prisma/db";
import { requireRole } from "@/src/lib/auth/session";
import { formatInteger, formatKg } from "@/src/lib/batches/format";
import { DeleteWarehouseButton } from "./delete-warehouse-button";
import { WarehouseForm } from "./warehouse-form";

export const instant = false;

export const metadata: Metadata = {
  title: "Kelola gudang — Dashboard admin — Vesta",
  description: "Tambah, ubah, dan hapus gudang penerima beserta manajernya.",
};

export default async function AdminWarehousesPage() {
  await connection();
  await requireRole(["ADMIN"]);

  const [warehouses, managers] = await Promise.all([
    db.orm.public.Warehouse
      .include("manager", (manager) =>
        manager.select("id", "name", "email"),
      )
      .include("batches", (batches) => batches.select("id"))
      .orderBy((warehouse) => warehouse.name.asc())
      .all(),
    db.orm.public.User.where({ role: "WAREHOUSE" })
      .select("id", "name", "email")
      .orderBy((user) => user.name.asc())
      .all(),
  ]);

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
            <WarehouseIcon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-ink">
              Gudang &amp; kapasitas
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">
              Tambah gudang penerima, atur kapasitas, dan tunjuk akun berperan
              Gudang sebagai manajer.
            </p>
          </div>
        </div>
      </header>

      <div className="mt-6 grid items-start gap-4 lg:grid-cols-[360px_1fr]">
        <section
          aria-labelledby="create-warehouse-heading"
          className="rounded-xl border border-line bg-surface p-5"
        >
          <h2
            id="create-warehouse-heading"
            className="text-sm font-semibold text-ink"
          >
            Gudang baru
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            Nama dan kapasitas wajib diisi. Manajer dapat ditetapkan kemudian.
          </p>
          <div className="mt-4">
            <WarehouseForm managers={managers} />
          </div>
        </section>

        <section
          aria-labelledby="warehouse-list-heading"
          className="rounded-xl border border-line bg-surface"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2
              id="warehouse-list-heading"
              className="text-sm font-semibold text-ink"
            >
              Daftar gudang
            </h2>
            <p className="text-xs text-ink-muted">
              {formatInteger(warehouses.length)} gudang
            </p>
          </div>

          {warehouses.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-ink-muted">
              Belum ada gudang. Tambahkan gudang pertama lewat formulir di
              samping.
            </p>
          ) : (
            <ul>
              {warehouses.map((warehouse) => (
                <li
                  key={warehouse.id}
                  className="border-b border-line px-4 py-4 last:border-0"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">
                        {warehouse.name}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                        <MapPin
                          className="size-3.5 shrink-0"
                          aria-hidden="true"
                        />
                        {[warehouse.city, warehouse.address]
                          .filter(Boolean)
                          .join(" · ") || "Lokasi belum diisi"}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                        <UserRound
                          className="size-3.5 shrink-0"
                          aria-hidden="true"
                        />
                        {warehouse.manager
                          ? `${warehouse.manager.name ?? warehouse.manager.email} · ${warehouse.manager.email}`
                          : "Belum ada manajer"}
                      </p>
                      <p className="mt-1 text-xs text-ink-muted">
                        Kapasitas {formatKg(warehouse.capacityKg)} ·{" "}
                        {formatInteger(warehouse.batches.length)} batch
                        tersimpan
                      </p>
                    </div>
                    <DeleteWarehouseButton
                      warehouseId={warehouse.id}
                      name={warehouse.name}
                    />
                  </div>

                  <details className="mt-3">
                    <summary className="inline-flex cursor-pointer items-center text-xs font-semibold text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                      Ubah data gudang
                    </summary>
                    <div className="mt-3 rounded-lg bg-surface-muted p-4">
                      <WarehouseForm
                        managers={managers}
                        warehouse={{
                          id: warehouse.id,
                          name: warehouse.name,
                          address: warehouse.address,
                          city: warehouse.city,
                          capacityKg: warehouse.capacityKg,
                          managerId: warehouse.managerId,
                        }}
                      />
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
