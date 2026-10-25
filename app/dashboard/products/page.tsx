import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowLeft, Sprout } from "lucide-react";
import { db } from "@/src/prisma/db";
import { PRODUCT_MANAGE_ROLES } from "@/src/lib/auth/roles";
import { requireRole } from "@/src/lib/auth/session";
import { getProducerForUser } from "@/src/lib/batches/queries";
import { formatIdr, formatNumber } from "@/src/lib/batches/format";
import { PRODUCT_CATEGORY_LABELS } from "@/src/lib/products/validation";
import { DeleteProductButton } from "./delete-product-button";
import { ProductForm, type ProductValues } from "./product-form";

export const instant = false;

export const metadata: Metadata = {
  title: "Produk & harga dasar — Vesta",
  description:
    "Kelola katalog produk produsen beserta harga dasar dan masa simpannya.",
};

export default async function ProductsPage() {
  await connection();
  const user = await requireRole(PRODUCT_MANAGE_ROLES);

  const producer =
    user.role === "PRODUCER" ? await getProducerForUser(user.id) : null;
  const isAdmin = user.role === "ADMIN";

  if (!isAdmin && !producer) {
    return (
      <div>
        <header className="max-w-2xl">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-ink">
            Produk &amp; harga dasar
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            Akun produsen ini belum terhubung ke data kebun. Hubungi admin untuk
            menautkan akun Anda ke produsen.
          </p>
        </header>
      </div>
    );
  }

  const products = await db.orm.public.Product
    .include("producer", (row) => row.select("id", "farmName"))
    .include("batches", (batches) => batches.select("id"))
    .orderBy((product) => product.name.asc())
    .all();

  const visibleProducts =
    isAdmin || !producer
      ? products
      : products.filter((product) => product.producerId === producer.id);

  const producers = isAdmin
    ? await db.orm.public.Producer
        .select("id", "farmName")
        .orderBy((row) => row.farmName.asc())
        .all()
    : [];

  return (
    <div>
      <header className="max-w-3xl">
        <Link
          href={isAdmin ? "/dashboard/admin" : "/dashboard/producer"}
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Kembali ke {isAdmin ? "dashboard admin" : "dashboard produsen"}
        </Link>
        <div className="mt-6 flex items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
            <Sprout className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-ink">
              Produk &amp; harga dasar
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">
              Harga dasar menjadi titik awal perhitungan biaya gudang, logistik,
              margin, dan diskon layu untuk setiap batch.
            </p>
          </div>
        </div>
      </header>

      <div className="mt-6 grid items-start gap-4 lg:grid-cols-[360px_1fr]">
        <section
          aria-labelledby="create-product-heading"
          className="rounded-xl border border-line bg-surface p-5"
        >
          <h2
            id="create-product-heading"
            className="text-sm font-semibold text-ink"
          >
            Produk baru
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            {isAdmin
              ? "Admin dapat menambah produk untuk produsen mana pun."
              : "Produk baru otomatis tercatat atas nama kebun Anda."}
          </p>
          <div className="mt-4">
            {isAdmin && producers.length === 0 ? (
              <p className="rounded-lg bg-surface-muted px-3.5 py-3 text-sm text-ink-muted">
                Belum ada produsen. Tambahkan akun produsen terlebih dahulu.
              </p>
            ) : (
              <ProductForm
                producers={
                  isAdmin
                    ? producers.map((row) => ({
                        id: row.id,
                        farmName: row.farmName,
                      }))
                    : undefined
                }
              />
            )}
          </div>
        </section>

        <section
          aria-labelledby="product-list-heading"
          className="rounded-xl border border-line bg-surface"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 id="product-list-heading" className="text-sm font-semibold text-ink">
              Katalog produk
            </h2>
            <p className="text-xs text-ink-muted">
              {formatNumber(visibleProducts.length)} produk
            </p>
          </div>

          {visibleProducts.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-ink-muted">
              Belum ada produk. Tambahkan produk pertama lewat formulir di
              samping.
            </p>
          ) : (
            <ul>
              {visibleProducts.map((product) => {
                const values: ProductValues = {
                  id: product.id,
                  producerId: product.producerId,
                  name: product.name,
                  category: product.category,
                  unit: product.unit,
                  shelfLifeDays: product.shelfLifeDays,
                  idealTempC: product.idealTempC,
                  basePricePerKg: product.basePricePerKg,
                  description: product.description,
                  imageUrl: product.imageUrl,
                };

                return (
                  <li
                    key={product.id}
                    className="border-b border-line px-4 py-4 last:border-0"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-line bg-brand-soft/60">
                          {product.imageUrl ? (
                            <Image
                              src={product.imageUrl}
                              alt={`Foto ${product.name}`}
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          ) : (
                            <Sprout
                              className="absolute inset-0 m-auto size-5 text-brand-strong/70"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink">
                            {product.name}
                          </p>
                          <p className="mt-1 text-xs text-ink-muted">
                            {PRODUCT_CATEGORY_LABELS[product.category] ??
                              product.category}{" "}
                            · {product.producer?.farmName ?? "Produsen tidak dikenal"} ·{" "}
                            {formatIdr(product.basePricePerKg)}/{product.unit}
                          </p>
                          <p className="mt-1 text-xs text-ink-muted">
                            Masa simpan {product.shelfLifeDays} hari · suhu ideal{" "}
                            {formatNumber(product.idealTempC)}°C ·{" "}
                            {product.batches.length} batch tercatat
                          </p>
                          {product.description ? (
                            <p className="mt-1 max-w-prose text-xs leading-relaxed text-ink-muted">
                              {product.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <DeleteProductButton
                        productId={product.id}
                        name={product.name}
                      />
                    </div>

                    <details className="mt-3">
                      <summary className="inline-flex cursor-pointer items-center text-xs font-semibold text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                        Ubah produk
                      </summary>
                      <div className="mt-3 rounded-lg bg-surface-muted p-4">
                        <ProductForm product={values} />
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
