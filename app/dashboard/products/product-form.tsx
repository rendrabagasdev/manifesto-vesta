"use client";

import { useActionState, useEffect, useRef } from "react";
import { createProductAction, updateProductAction } from "./actions";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  type ProductFormState,
} from "@/src/lib/products/validation";

type ProducerOption = {
  id: number;
  farmName: string;
};

export type ProductValues = {
  id: number;
  producerId: number;
  name: string;
  category: string;
  unit: string;
  shelfLifeDays: number;
  idealTempC: number;
  basePricePerKg: number;
  description: string | null;
};

const initialState: ProductFormState = {};

const inputClassName =
  "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/15";

const textareaClassName =
  "min-h-20 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/15";

export function ProductForm({
  producers,
  product,
}: {
  producers?: ProducerOption[];
  product?: ProductValues;
}) {
  const [state, formAction, pending] = useActionState(
    product ? updateProductAction : createProductAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const fieldId = product ? `product-${product.id}` : "product-new";
  const showProducerSelect = !product && producers !== undefined;

  useEffect(() => {
    if (product || !state.success) return;
    formRef.current?.reset();
  }, [state, product]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {product ? (
        <input type="hidden" name="productId" value={product.id} />
      ) : null}

      {state.error ? (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-lg bg-danger-soft px-3.5 py-3 text-sm font-medium text-danger"
        >
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p
          role="status"
          aria-live="polite"
          className="rounded-lg bg-brand-soft px-3.5 py-3 text-sm font-medium text-brand-strong"
        >
          {state.success}
        </p>
      ) : null}

      {showProducerSelect ? (
        <div className="space-y-2">
          <label
            htmlFor={`${fieldId}-producerId`}
            className="block text-sm font-medium text-ink"
          >
            Produsen
          </label>
          <select
            id={`${fieldId}-producerId`}
            name="producerId"
            defaultValue=""
            required
            className={inputClassName}
          >
            <option value="" disabled>
              Pilih produsen
            </option>
            {producers.map((producer) => (
              <option key={producer.id} value={producer.id}>
                {producer.farmName}
              </option>
            ))}
          </select>
          {state.fieldErrors?.producerId?.[0] ? (
            <p className="text-sm font-medium text-danger">
              {state.fieldErrors.producerId[0]}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <label
          htmlFor={`${fieldId}-name`}
          className="block text-sm font-medium text-ink"
        >
          Nama produk
        </label>
        <input
          id={`${fieldId}-name`}
          name="name"
          type="text"
          maxLength={80}
          defaultValue={product?.name}
          placeholder="Tomat Servo"
          required
          className={inputClassName}
        />
        {state.fieldErrors?.name?.[0] ? (
          <p className="text-sm font-medium text-danger">
            {state.fieldErrors.name[0]}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor={`${fieldId}-category`}
            className="block text-sm font-medium text-ink"
          >
            Kategori
          </label>
          <select
            id={`${fieldId}-category`}
            name="category"
            defaultValue={product?.category ?? "VEGETABLE"}
            required
            className={inputClassName}
          >
            {PRODUCT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {PRODUCT_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
          {state.fieldErrors?.category?.[0] ? (
            <p className="text-sm font-medium text-danger">
              {state.fieldErrors.category[0]}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label
            htmlFor={`${fieldId}-unit`}
            className="block text-sm font-medium text-ink"
          >
            Satuan
          </label>
          <input
            id={`${fieldId}-unit`}
            name="unit"
            type="text"
            maxLength={16}
            defaultValue={product?.unit ?? "kg"}
            placeholder="kg"
            required
            className={inputClassName}
          />
          {state.fieldErrors?.unit?.[0] ? (
            <p className="text-sm font-medium text-danger">
              {state.fieldErrors.unit[0]}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor={`${fieldId}-shelfLifeDays`}
            className="block text-sm font-medium text-ink"
          >
            Masa simpan (hari)
          </label>
          <input
            id={`${fieldId}-shelfLifeDays`}
            name="shelfLifeDays"
            type="number"
            inputMode="numeric"
            min="1"
            max="3650"
            step="1"
            defaultValue={product?.shelfLifeDays}
            placeholder="7"
            required
            className={inputClassName}
          />
          {state.fieldErrors?.shelfLifeDays?.[0] ? (
            <p className="text-sm font-medium text-danger">
              {state.fieldErrors.shelfLifeDays[0]}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label
            htmlFor={`${fieldId}-idealTempC`}
            className="block text-sm font-medium text-ink"
          >
            Suhu ideal (°C)
          </label>
          <input
            id={`${fieldId}-idealTempC`}
            name="idealTempC"
            type="number"
            inputMode="decimal"
            min="-30"
            max="60"
            step="0.1"
            defaultValue={product?.idealTempC}
            placeholder="10"
            required
            className={inputClassName}
          />
          {state.fieldErrors?.idealTempC?.[0] ? (
            <p className="text-sm font-medium text-danger">
              {state.fieldErrors.idealTempC[0]}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor={`${fieldId}-basePricePerKg`}
          className="block text-sm font-medium text-ink"
        >
          Harga dasar per kg (Rp)
        </label>
        <input
          id={`${fieldId}-basePricePerKg`}
          name="basePricePerKg"
          type="number"
          inputMode="numeric"
          min="1"
          max="10000000"
          step="1"
          defaultValue={product?.basePricePerKg}
          placeholder="15000"
          required
          className={inputClassName}
        />
        {state.fieldErrors?.basePricePerKg?.[0] ? (
          <p className="text-sm font-medium text-danger">
            {state.fieldErrors.basePricePerKg[0]}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label
          htmlFor={`${fieldId}-description`}
          className="block text-sm font-medium text-ink"
        >
          Deskripsi{" "}
          <span className="font-normal text-ink-muted">(opsional)</span>
        </label>
        <textarea
          id={`${fieldId}-description`}
          name="description"
          maxLength={500}
          defaultValue={product?.description ?? ""}
          placeholder="Tomat segar panen Lembang."
          className={textareaClassName}
        />
        {state.fieldErrors?.description?.[0] ? (
          <p className="text-sm font-medium text-danger">
            {state.fieldErrors.description[0]}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-brand-strong px-5 text-sm font-semibold text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending
          ? "Menyimpan..."
          : product
            ? "Simpan perubahan"
            : "Tambah produk"}
      </button>
    </form>
  );
}
