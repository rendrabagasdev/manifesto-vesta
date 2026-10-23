"use client";

import { useActionState, useEffect, useRef } from "react";
import { createWarehouseAction, updateWarehouseAction } from "./actions";
import type { WarehouseFormState } from "@/src/lib/warehouses/validation";

type ManagerOption = {
  id: number;
  name: string | null;
  email: string;
};

export type WarehouseValues = {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  capacityKg: number;
  managerId: number | null;
};

const initialState: WarehouseFormState = {};

const inputClassName =
  "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/15";

export function WarehouseForm({
  managers,
  warehouse,
}: {
  managers: ManagerOption[];
  warehouse?: WarehouseValues;
}) {
  const [state, formAction, pending] = useActionState(
    warehouse ? updateWarehouseAction : createWarehouseAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const fieldId = warehouse ? `warehouse-${warehouse.id}` : "warehouse-new";

  useEffect(() => {
    if (warehouse || !state.success) return;
    formRef.current?.reset();
  }, [state, warehouse]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {warehouse ? (
        <input type="hidden" name="warehouseId" value={warehouse.id} />
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

      <div className="space-y-2">
        <label
          htmlFor={`${fieldId}-name`}
          className="block text-sm font-medium text-ink"
        >
          Nama gudang
        </label>
        <input
          id={`${fieldId}-name`}
          name="name"
          type="text"
          maxLength={120}
          defaultValue={warehouse?.name}
          placeholder="Gudang Utama Bandung"
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
            htmlFor={`${fieldId}-city`}
            className="block text-sm font-medium text-ink"
          >
            Kota{" "}
            <span className="font-normal text-ink-muted">(opsional)</span>
          </label>
          <input
            id={`${fieldId}-city`}
            name="city"
            type="text"
            maxLength={80}
            defaultValue={warehouse?.city ?? ""}
            placeholder="Bandung"
            className={inputClassName}
          />
          {state.fieldErrors?.city?.[0] ? (
            <p className="text-sm font-medium text-danger">
              {state.fieldErrors.city[0]}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label
            htmlFor={`${fieldId}-capacityKg`}
            className="block text-sm font-medium text-ink"
          >
            Kapasitas (kg)
          </label>
          <input
            id={`${fieldId}-capacityKg`}
            name="capacityKg"
            type="number"
            inputMode="decimal"
            min="0.1"
            max="1000000"
            step="0.1"
            defaultValue={warehouse?.capacityKg}
            placeholder="5000"
            required
            className={inputClassName}
          />
          {state.fieldErrors?.capacityKg?.[0] ? (
            <p className="text-sm font-medium text-danger">
              {state.fieldErrors.capacityKg[0]}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor={`${fieldId}-address`}
          className="block text-sm font-medium text-ink"
        >
          Alamat{" "}
          <span className="font-normal text-ink-muted">(opsional)</span>
        </label>
        <input
          id={`${fieldId}-address`}
          name="address"
          type="text"
          maxLength={200}
          defaultValue={warehouse?.address ?? ""}
          placeholder="Jl. Soekarno-Hatta No. 120"
          className={inputClassName}
        />
        {state.fieldErrors?.address?.[0] ? (
          <p className="text-sm font-medium text-danger">
            {state.fieldErrors.address[0]}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label
          htmlFor={`${fieldId}-managerId`}
          className="block text-sm font-medium text-ink"
        >
          Manajer gudang{" "}
          <span className="font-normal text-ink-muted">(opsional)</span>
        </label>
        <select
          id={`${fieldId}-managerId`}
          name="managerId"
          defaultValue={warehouse?.managerId ?? ""}
          className={inputClassName}
        >
          <option value="">Tanpa manajer</option>
          {managers.map((manager) => (
            <option key={manager.id} value={manager.id}>
              {manager.name ?? manager.email} · {manager.email}
            </option>
          ))}
        </select>
        {state.fieldErrors?.managerId?.[0] ? (
          <p className="text-sm font-medium text-danger">
            {state.fieldErrors.managerId[0]}
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
          : warehouse
            ? "Simpan perubahan"
            : "Tambah gudang"}
      </button>
    </form>
  );
}
