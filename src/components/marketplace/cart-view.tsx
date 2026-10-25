"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, Minus, Plus, Trash2, Truck } from "lucide-react";
import { useCart } from "@/src/components/shop/cart-context";
import { checkoutAction, type PurchaseState } from "@/app/(shop)/actions";
import {
  DELIVERY_CITIES,
  getDeliveryOptions,
  type DeliveryMethodId,
} from "@/src/lib/delivery/shipping";
import { formatIdr, formatKg } from "@/src/lib/batches/format";

const initialState: PurchaseState = { ok: false };

const inputClassName =
  "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/15";

type CartViewProps = {
  defaults?: {
    cityId?: string;
    phone?: string;
    address?: string;
  };
};

export function CartView({ defaults }: CartViewProps) {
  const { items, ready, updateQty, removeItem, clear, subtotal, totalKg } = useCart();
  const [state, formAction, pending] = useActionState(checkoutAction, initialState);
  const [cityId, setCityId] = useState(defaults?.cityId ?? "bandung");
  const [method, setMethod] = useState<DeliveryMethodId>("INSTANT");
  const router = useRouter();

  const warehouseCities = useMemo(
    () => items.map((item) => item.warehouseCity),
    [items],
  );
  const deliveryOptions = useMemo(
    () => getDeliveryOptions(cityId, warehouseCities),
    [cityId, warehouseCities],
  );
  const selectedMethod =
    deliveryOptions.find((option) => option.id === method && option.available)?.id ??
    deliveryOptions.find((option) => option.available)?.id ??
    "REGULAR";
  const selectedOption = deliveryOptions.find((option) => option.id === selectedMethod);

  useEffect(() => {
    if (!state.ok) return;
    clear();
    if (state.paymentUrl) {
      window.location.href = state.paymentUrl;
    } else if (state.code) {
      router.push(`/orders/${state.code}`);
    }
  }, [state, clear, router]);

  if (!ready) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6" aria-busy="true">
        <div className="h-5 w-40 rounded bg-surface-muted" />
        <div className="mt-4 h-16 rounded bg-surface-muted" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
        <p className="text-sm font-semibold text-ink">Keranjang masih kosong</p>
        <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-ink-muted">
          Pilih bahan segar dari marketplace — setiap batch punya skor kesegaran
          dan rincian harga yang transparan.
        </p>
        <Link
          href="/marketplace"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-brand-strong px-5 text-sm font-semibold text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Ke marketplace
        </Link>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="grid gap-4 lg:grid-cols-[1fr_360px] lg:items-start"
    >
      <input
        type="hidden"
        name="cart"
        value={JSON.stringify(
          items.map((item) => ({ batchId: item.batchId, quantityKg: item.qtyKg })),
        )}
      />

      <div className="min-w-0 space-y-4">
        <section
          aria-labelledby="shipping-heading"
          className="rounded-xl border border-line bg-surface p-4"
        >
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-brand-strong" aria-hidden="true" />
            <h2 id="shipping-heading" className="text-sm font-semibold text-ink">
              Lokasi pengiriman
            </h2>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="deliveryCity" className="block text-sm font-medium text-ink">
                Kota / kabupaten
              </label>
              <select
                id="deliveryCity"
                name="deliveryCity"
                required
                value={cityId}
                onChange={(event) => setCityId(event.target.value)}
                className={inputClassName}
              >
                {DELIVERY_CITIES.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="contactPhone" className="block text-sm font-medium text-ink">
                Nomor telepon
              </label>
              <input
                id="contactPhone"
                name="contactPhone"
                type="tel"
                inputMode="tel"
                required
                minLength={8}
                maxLength={20}
                defaultValue={defaults?.phone ?? ""}
                placeholder="0812xxxxxxx"
                className={inputClassName}
              />
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            <label htmlFor="deliveryAddress" className="block text-sm font-medium text-ink">
              Alamat lengkap
            </label>
            <textarea
              id="deliveryAddress"
              name="deliveryAddress"
              rows={2}
              required
              minLength={10}
              maxLength={300}
              defaultValue={defaults?.address ?? ""}
              placeholder="Nama, jalan, nomor rumah, patokan"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </div>
        </section>

        <section aria-labelledby="cart-items-heading" className="rounded-xl border border-line bg-surface">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 id="cart-items-heading" className="text-sm font-semibold text-ink">
              Barang ({items.length})
            </h2>
            <button
              type="button"
              onClick={clear}
              className="text-xs font-semibold text-ink-muted transition-colors hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Kosongkan
            </button>
          </div>

          <ul>
            {items.map((item) => (
              <li key={item.batchId} className="border-b border-line px-4 py-4 last:border-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{item.productName}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {item.batchCode} · {item.warehouseName} · {formatIdr(item.pricePerKg)}/{item.unit}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.batchId)}
                    aria-label={`Hapus ${item.productName} dari keranjang`}
                    className="inline-flex size-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex h-9 items-center rounded-lg border border-line bg-surface">
                    <button
                      type="button"
                      onClick={() => updateQty(item.batchId, item.qtyKg - 0.5)}
                      aria-label={`Kurangi jumlah ${item.productName}`}
                      className="inline-flex size-9 items-center justify-center rounded-l-lg text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                    >
                      <Minus className="size-4" aria-hidden="true" />
                    </button>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0.5}
                      max={item.maxKg}
                      step={0.5}
                      value={item.qtyKg}
                      onChange={(event) =>
                        updateQty(item.batchId, Number(event.target.value) || 0)
                      }
                      aria-label={`Jumlah ${item.productName} dalam ${item.unit}`}
                      className="h-9 w-14 border-x border-line bg-transparent text-center text-sm font-semibold tabular-nums text-ink outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => updateQty(item.batchId, item.qtyKg + 0.5)}
                      aria-label={`Tambah jumlah ${item.productName}`}
                      className="inline-flex size-9 items-center justify-center rounded-r-lg text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                    >
                      <Plus className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-ink">
                    {formatIdr(item.pricePerKg * item.qtyKg)}
                  </p>
                </div>
                {item.qtyKg > item.maxKg ? (
                  <p className="mt-2 text-xs font-medium text-danger">
                    Melebihi stok — maksimal {formatKg(item.maxKg)}.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="rounded-xl border border-line bg-surface">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Ringkasan pesanan</h2>
        </div>

        <div className="space-y-4 px-4 py-4">
          <dl className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">Total berat</dt>
              <dd className="font-semibold tabular-nums text-ink">{formatKg(totalKg)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">Subtotal</dt>
              <dd className="text-base font-semibold tabular-nums text-ink">{formatIdr(subtotal)}</dd>
            </div>
          </dl>

          <fieldset className="space-y-2">
            <legend className="flex items-center gap-1.5 text-sm font-medium text-ink">
              <Truck className="size-4 text-brand-strong" aria-hidden="true" />
              Metode pengiriman
            </legend>
            {deliveryOptions.map((option) => {
              const checked = option.id === selectedMethod;
              return (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                    checked
                      ? "border-brand-strong bg-brand-soft"
                      : "border-line bg-surface hover:bg-surface-muted"
                  } ${option.available ? "" : "cursor-not-allowed opacity-50"}`}
                >
                  <input
                    type="radio"
                    name="deliveryMethod"
                    value={option.id}
                    checked={checked}
                    onChange={() => setMethod(option.id)}
                    disabled={!option.available}
                    className="sr-only"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">{option.label}</span>
                    <span className="block text-xs text-ink-muted">
                      {option.available ? option.etaLabel : "Tidak tersedia"}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`inline-flex size-4 shrink-0 items-center justify-center rounded-full border ${
                      checked ? "border-brand-strong" : "border-line"
                    }`}
                  >
                    {checked ? <span className="size-2 rounded-full bg-brand-strong" /> : null}
                  </span>
                </label>
              );
            })}
          </fieldset>

          {selectedOption ? (
            <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-ink">
              Estimasi tiba{" "}
              <span className="font-semibold">{selectedOption.etaLabel}</span>
            </p>
          ) : null}

          <div className="space-y-1.5">
            <label htmlFor="notes" className="block text-sm font-medium text-ink">
              Catatan <span className="font-normal text-ink-muted">(opsional)</span>
            </label>
            <input
              id="notes"
              name="notes"
              type="text"
              maxLength={300}
              placeholder="Contoh: titip di pos satpam"
              className={inputClassName}
            />
          </div>

          {state.error ? (
            <p role="alert" className="rounded-lg bg-danger-soft px-3.5 py-3 text-sm font-medium text-danger">
              {state.error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-strong text-sm font-semibold text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Memproses pesanan..." : "Checkout & bayar"}
          </button>

          <p className="text-xs leading-relaxed text-ink-muted">
            Pembayaran aman lewat Midtrans.
          </p>
        </div>
      </aside>
    </form>
  );
}
