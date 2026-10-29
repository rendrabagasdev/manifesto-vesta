"use client";

import dynamic from "next/dynamic";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/src/components/shop/cart-context";
import type { DeliveryPoint } from "@/src/components/marketplace/delivery-map";
import {
  checkoutAction,
  estimateDeliveryRouteAction,
  type DeliveryRouteState,
  type PurchaseState,
} from "@/app/(shop)/actions";
import {
  calculateShippingCost,
  DELIVERY_CITIES,
  findDeliveryCityById,
  getDeliveryOptions,
  type DeliveryMethodId,
} from "@/src/lib/delivery/shipping";
import {
  formatIdr,
  formatInteger,
  formatKg,
  formatNumber,
} from "@/src/lib/batches/format";

const DeliveryMap = dynamic(
  () =>
    import("@/src/components/marketplace/delivery-map").then(
      (mod) => mod.DeliveryMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-surface-muted" aria-hidden="true" />
    ),
  },
);

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
  const [cityId, setCityId] = useState(
    () => findDeliveryCityById(defaults?.cityId)?.id ?? DELIVERY_CITIES[0].id,
  );
  const [pin, setPin] = useState<DeliveryPoint>(() => {
    const city = findDeliveryCityById(defaults?.cityId) ?? DELIVERY_CITIES[0];
    return { latitude: city.latitude, longitude: city.longitude };
  });
  const [method, setMethod] = useState<DeliveryMethodId>("INSTANT");
  const [route, setRoute] = useState<DeliveryRouteState | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
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
  const shippingCost =
    route?.ok && route.distanceKm !== undefined
      ? calculateShippingCost(route.distanceKm, selectedMethod)
      : null;
  const estimatedTotal = subtotal + (shippingCost ?? 0);

  const batchIdsKey = useMemo(
    () => items.map((item) => item.batchId).sort((a, b) => a - b).join(","),
    [items],
  );

  useEffect(() => {
    if (!state.ok) return;
    clear();
    if (state.code) {
      router.push(`/orders/${state.code}`);
    }
  }, [state, clear, router]);

  useEffect(() => {
    if (!ready || !batchIdsKey) return;

    const batchIds = batchIdsKey.split(",").map(Number);
    let cancelled = false;

    const timer = window.setTimeout(() => {
      setRouteLoading(true);
      estimateDeliveryRouteAction({
        batchIds,
        latitude: pin.latitude,
        longitude: pin.longitude,
      })
        .then((result) => {
          if (cancelled) return;
          setRoute(result);
          setRouteLoading(false);
        })
        .catch(() => {
          if (cancelled) return;
          setRoute({ ok: false, error: "Rute belum bisa dihitung." });
          setRouteLoading(false);
        });
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [batchIdsKey, pin.latitude, pin.longitude, ready]);

  function handleCityChange(nextCityId: string) {
    const city = findDeliveryCityById(nextCityId);
    setCityId(nextCityId);
    if (city) {
      setPin({ latitude: city.latitude, longitude: city.longitude });
    }
  }

  function handleUseMyLocation() {
    if (!("geolocation" in navigator)) {
      setLocationError("Perangkat ini tidak mendukung lokasi.");
      return;
    }

    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPin({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocating(false);
      },
      () => {
        setLocationError("Izin lokasi tidak tersedia. Geser pin secara manual.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8_000, maximumAge: 60_000 },
    );
  }

  const routeLabel = routeLoading
    ? "Menghitung jarak rute..."
    : route?.ok
      ? `Rute ${formatNumber(route.distanceKm ?? 0)} km · ${formatInteger(
          route.durationMinutes ?? 0,
        )} menit dari ${route.warehouseName ?? "gudang"}${
          route.provider === "ESTIMATE" ? " (perkiraan)" : ""
        }`
      : "Jarak rute akan dihitung saat pesanan dibuat.";

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
          Pilih produk dari katalog, lalu lanjut ke pembayaran.
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
      <input type="hidden" name="deliveryLatitude" value={pin.latitude} />
      <input type="hidden" name="deliveryLongitude" value={pin.longitude} />

      <div className="min-w-0 space-y-4">
        <section
          aria-labelledby="shipping-heading"
          className="rounded-xl border border-line bg-surface p-4"
        >
          <h2 id="shipping-heading" className="text-sm font-semibold text-ink">
            Lokasi pengiriman
          </h2>

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
                onChange={(event) => handleCityChange(event.target.value)}
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

        <section
          aria-labelledby="delivery-map-heading"
          className="rounded-xl border border-line bg-surface p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="delivery-map-heading" className="text-sm font-semibold text-ink">
                Titik pengiriman
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                Geser pin atau ketuk peta untuk menandai lokasi penerima.
              </p>
            </div>
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={locating}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-ink transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
            >
              {locating ? "Mencari lokasi..." : "Gunakan lokasi saya"}
            </button>
          </div>

          <div className="delivery-map mt-3 h-[260px] overflow-hidden rounded-lg border border-line sm:h-[300px]">
            {ready && <DeliveryMap key={`map-${cityId}`} value={pin} onChange={setPin} />}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs tabular-nums text-ink-muted">
              {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}
            </p>
            <p aria-live="polite" className="text-xs font-medium text-ink">
              {routeLabel}
            </p>
          </div>

          {locationError ? (
            <p
              role="alert"
              className="mt-2 rounded-lg bg-danger-soft px-3 py-2 text-xs font-medium text-danger"
            >
              {locationError}
            </p>
          ) : null}
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
                <div className="flex items-start justify-between gap-3">
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
                    className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    Hapus
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
                      &minus;
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
                      +
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
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">Ongkir</dt>
              <dd className="font-semibold tabular-nums text-ink">
                {shippingCost === null ? "Menunggu rute" : formatIdr(shippingCost)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-line pt-1.5">
              <dt className="font-semibold text-ink">Total</dt>
              <dd className="font-heading text-lg font-bold tabular-nums tracking-tight text-ink">
                {formatIdr(estimatedTotal)}
              </dd>
            </div>
          </dl>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-ink">
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

          <fieldset>
            <legend className="text-sm font-medium text-ink">Pembayaran</legend>
            <label className="mt-2 flex items-start gap-3 rounded-lg border border-brand-strong bg-brand-soft px-3 py-2.5">
              <input
                type="radio"
                name="paymentMethod"
                value="COD"
                defaultChecked
                className="sr-only"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">
                  Bayar di tempat (COD)
                </span>
                <span className="mt-0.5 block text-xs text-ink-muted">
                  Bayar tunai saat pesanan tiba.
                </span>
              </span>
              <span
                aria-hidden="true"
                className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-brand-strong"
              >
                <span className="size-2 rounded-full bg-brand-strong" />
              </span>
            </label>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
              Pesanan disimpan dengan status menunggu konfirmasi. Tidak ada
              pembayaran online.
            </p>
          </fieldset>

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
            {pending ? "Membuat pesanan..." : "Buat pesanan COD"}
          </button>

          <p className="text-xs leading-relaxed text-ink-muted">
            Bayar tunai saat pesanan tiba. Gudang akan mengonfirmasi pesanan
            Anda.
          </p>
        </div>
      </aside>
    </form>
  );
}
