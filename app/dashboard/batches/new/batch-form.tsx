"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createBatchAction } from "../actions";
import type { BatchFormState } from "@/src/lib/batches/validation";
import { formatIdr } from "@/src/lib/batches/format";

type ProductOption = {
  id: number;
  name: string;
  category: string;
  unit: string;
  shelfLifeDays: number;
  idealTempC: number;
  basePricePerKg: number;
  producerId: number;
};

type WarehouseOption = {
  id: number;
  name: string;
  city: string | null;
  capacityKg: number;
};

const initialState: BatchFormState = {};

const inputClassName =
  "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/15";

export function BatchForm({
  products,
  warehouses,
  today,
}: {
  products: ProductOption[];
  warehouses: WarehouseOption[];
  today: string;
}) {
  const [state, formAction, pending] = useActionState(
    createBatchAction,
    initialState,
  );
  const [productId, setProductId] = useState(
    products[0] ? String(products[0].id) : "",
  );
  const selectedProduct = products.find(
    (product) => String(product.id) === productId,
  );
  const [storageTempC, setStorageTempC] = useState(
    selectedProduct ? String(selectedProduct.idealTempC) : "10",
  );

  function handleProductChange(value: string) {
    setProductId(value);
    const next = products.find((product) => String(product.id) === value);
    if (next) setStorageTempC(String(next.idealTempC));
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-lg bg-danger-soft px-3.5 py-3 text-sm font-medium text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <label
            htmlFor="productId"
            className="block text-sm font-medium text-ink"
          >
            Produk
          </label>
          <select
            id="productId"
            name="productId"
            value={productId}
            onChange={(event) => handleProductChange(event.target.value)}
            required
            className={inputClassName}
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} · {formatIdr(product.basePricePerKg)}/
                {product.unit} · {product.shelfLifeDays} hari
              </option>
            ))}
          </select>
          {selectedProduct ? (
            <p className="text-xs text-ink-muted">
              Umur simpan {selectedProduct.shelfLifeDays} hari, suhu ideal{" "}
              {selectedProduct.idealTempC}°C.
            </p>
          ) : null}
          {state.fieldErrors?.productId?.[0] ? (
            <p className="text-sm font-medium text-danger">
              {state.fieldErrors.productId[0]}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="warehouseId"
            className="block text-sm font-medium text-ink"
          >
            Gudang penerima
          </label>
          <select
            id="warehouseId"
            name="warehouseId"
            defaultValue={warehouses[0]?.id}
            required
            className={inputClassName}
          >
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
                {warehouse.city ? ` · ${warehouse.city}` : ""}
              </option>
            ))}
          </select>
          {state.fieldErrors?.warehouseId?.[0] ? (
            <p className="text-sm font-medium text-danger">
              {state.fieldErrors.warehouseId[0]}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="harvestDate"
            className="block text-sm font-medium text-ink"
          >
            Tanggal panen
          </label>
          <input
            id="harvestDate"
            name="harvestDate"
            type="date"
            max={today}
            defaultValue={today}
            required
            className={inputClassName}
          />
          {state.fieldErrors?.harvestDate?.[0] ? (
            <p className="text-sm font-medium text-danger">
              {state.fieldErrors.harvestDate[0]}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="quantityKg"
            className="block text-sm font-medium text-ink"
          >
            Jumlah pasokan (kg)
          </label>
          <input
            id="quantityKg"
            name="quantityKg"
            type="number"
            inputMode="decimal"
            min="0.1"
            max="100000"
            step="0.1"
            placeholder="120"
            required
            className={inputClassName}
          />
          {state.fieldErrors?.quantityKg?.[0] ? (
            <p className="text-sm font-medium text-danger">
              {state.fieldErrors.quantityKg[0]}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="storageTempC"
            className="block text-sm font-medium text-ink"
          >
            Suhu penyimpanan (°C)
          </label>
          <input
            id="storageTempC"
            name="storageTempC"
            type="number"
            inputMode="decimal"
            min="-30"
            max="60"
            step="0.1"
            value={storageTempC}
            onChange={(event) => setStorageTempC(event.target.value)}
            required
            className={inputClassName}
          />
          {state.fieldErrors?.storageTempC?.[0] ? (
            <p className="text-sm font-medium text-danger">
              {state.fieldErrors.storageTempC[0]}
            </p>
          ) : null}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label
            htmlFor="qualityNote"
            className="block text-sm font-medium text-ink"
          >
            Catatan kualitas{" "}
            <span className="font-normal text-ink-muted">(opsional)</span>
          </label>
          <textarea
            id="qualityNote"
            name="qualityNote"
            rows={3}
            maxLength={500}
            placeholder="Contoh: warna merata, tidak ada luka, kemasan utuh."
            className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
          {state.fieldErrors?.qualityNote?.[0] ? (
            <p className="text-sm font-medium text-danger">
              {state.fieldErrors.qualityNote[0]}
            </p>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg bg-surface-muted px-4 py-3 text-xs leading-relaxed text-ink-muted">
        Skor kesegaran, tahap cascade, dan harga akhir dihitung otomatis saat
        batch disimpan.
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
        <Link
          href="/dashboard/batches"
          className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Batal
        </Link>
        <button
          type="submit"
          disabled={pending || products.length === 0 || warehouses.length === 0}
          aria-busy={pending}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-strong px-5 text-sm font-semibold text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Menyimpan batch..." : "Simpan batch"}
        </button>
      </div>
    </form>
  );
}
