export type DeliveryMethodId = "INSTANT" | "SAME_DAY" | "REGULAR";

export interface DeliveryCity {
  id: string;
  label: string;
  metro: string;
  island: string;
  latitude: number;
  longitude: number;
}

export const DELIVERY_CITIES: readonly DeliveryCity[] = [
  { id: "bandung", label: "Kota Bandung", metro: "bandung", island: "jawa", latitude: -6.9175, longitude: 107.6191 },
  { id: "cimahi", label: "Kota Cimahi", metro: "bandung", island: "jawa", latitude: -6.8722, longitude: 107.5425 },
  { id: "bandung-barat", label: "Kab. Bandung Barat", metro: "bandung", island: "jawa", latitude: -6.8324, longitude: 107.4833 },
  { id: "jakarta", label: "Jakarta", metro: "jabodetabek", island: "jawa", latitude: -6.2088, longitude: 106.8456 },
  { id: "bogor", label: "Kota Bogor", metro: "jabodetabek", island: "jawa", latitude: -6.595, longitude: 106.8166 },
  { id: "depok", label: "Kota Depok", metro: "jabodetabek", island: "jawa", latitude: -6.4025, longitude: 106.7942 },
  { id: "tangerang", label: "Kota Tangerang", metro: "jabodetabek", island: "jawa", latitude: -6.1783, longitude: 106.6319 },
  { id: "bekasi", label: "Kota Bekasi", metro: "jabodetabek", island: "jawa", latitude: -6.2383, longitude: 106.9756 },
  { id: "semarang", label: "Kota Semarang", metro: "semarang", island: "jawa", latitude: -6.9667, longitude: 110.4167 },
  { id: "yogyakarta", label: "Yogyakarta", metro: "yogyakarta", island: "jawa", latitude: -7.7956, longitude: 110.3695 },
  { id: "surabaya", label: "Kota Surabaya", metro: "surabaya", island: "jawa", latitude: -7.2575, longitude: 112.7521 },
  { id: "denpasar", label: "Kota Denpasar", metro: "denpasar", island: "bali", latitude: -8.6705, longitude: 115.2126 },
  { id: "palembang", label: "Kota Palembang", metro: "palembang", island: "sumatera", latitude: -2.9761, longitude: 104.7754 },
  { id: "medan", label: "Kota Medan", metro: "medan", island: "sumatera", latitude: 3.5952, longitude: 98.6722 },
  { id: "makassar", label: "Kota Makassar", metro: "makassar", island: "sulawesi", latitude: -5.1477, longitude: 119.4327 },
];

export function findDeliveryCityById(id: string | null | undefined): DeliveryCity | null {
  if (!id) return null;
  return DELIVERY_CITIES.find((city) => city.id === id) ?? null;
}

export const DELIVERY_METHODS: readonly {
  id: DeliveryMethodId;
  label: string;
  description: string;
}[] = [
  { id: "INSTANT", label: "Instan", description: "Kurir langsung dari gudang" },
  { id: "SAME_DAY", label: "Kilat", description: "Dikirim pada hari yang sama" },
  { id: "REGULAR", label: "Reguler", description: "Pengiriman hemat" },
];

/** Tarif dasar dan per-km per metode; dibulatkan ke atas per Rp 500. */
export const SHIPPING_RATES: Record<
  DeliveryMethodId,
  { base: number; perKm: number }
> = {
  INSTANT: { base: 8_000, perKm: 1_500 },
  SAME_DAY: { base: 6_000, perKm: 1_100 },
  REGULAR: { base: 4_000, perKm: 800 },
};

export function calculateShippingCost(
  distanceKm: number | null | undefined,
  method: string | null | undefined,
): number {
  if (
    typeof distanceKm !== "number" ||
    !Number.isFinite(distanceKm) ||
    distanceKm <= 0 ||
    !method
  ) {
    return 0;
  }

  const rate = SHIPPING_RATES[method as DeliveryMethodId];
  if (!rate) return 0;

  return Math.ceil((rate.base + rate.perKm * distanceKm) / 500) * 500;
}


export interface DeliveryOption {
  id: DeliveryMethodId;
  label: string;
  description: string;
  available: boolean;
  estimateAt: Date | null;
  etaLabel: string | null;
}

export type DeliveryResolution =
  | {
      ok: true;
      city: DeliveryCity;
      method: DeliveryMethodId;
      estimatedDeliveryAt: Date;
    }
  | {
      ok: false;
      code: "INVALID_CITY" | "METHOD_UNAVAILABLE";
      message: string;
    };

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const SAME_DAY_CUTOFF_HOUR = 15;

export function findDeliveryCity(value: string | null | undefined): DeliveryCity | null {
  const needle = value?.trim().toLowerCase();
  if (!needle) return null;

  return (
    DELIVERY_CITIES.find(
      (city) => city.id === needle || city.label.toLowerCase() === needle,
    ) ?? null
  );
}

export function matchDeliveryCity(
  value: string | null | undefined,
): DeliveryCity | null {
  const needle = value?.trim().toLowerCase();
  if (!needle) return null;

  return (
    DELIVERY_CITIES.find(
      (city) =>
        city.id === needle ||
        city.label.toLowerCase() === needle ||
        city.label.toLowerCase().replace(/^(kota|kab\.?)\s+/, "") === needle,
    ) ?? null
  );
}

function wibShift(now: Date): Date {
  return new Date(now.getTime() + WIB_OFFSET_MS);
}

function wibWallClockToUtc(now: Date, dayOffset: number, hour: number): Date {
  const wall = wibShift(now);
  wall.setUTCDate(wall.getUTCDate() + dayOffset);
  wall.setUTCHours(hour, 0, 0, 0);
  return new Date(wall.getTime() - WIB_OFFSET_MS);
}

function wibHour(now: Date): number {
  return wibShift(now).getUTCHours();
}

function metroMatches(city: DeliveryCity, warehouseCity: DeliveryCity | null): boolean {
  return warehouseCity !== null && warehouseCity.metro === city.metro;
}

function islandMatches(city: DeliveryCity, warehouseCity: DeliveryCity | null): boolean {
  return warehouseCity !== null && warehouseCity.island === city.island;
}

function regularDays(city: DeliveryCity, warehouseCity: DeliveryCity | null): number {
  if (warehouseCity === null) return 4;
  if (warehouseCity.metro === city.metro) return 1;
  if (warehouseCity.island === city.island) return 2;
  return 4;
}

function estimateFor(
  method: DeliveryMethodId,
  city: DeliveryCity,
  warehouseCities: readonly (string | null | undefined)[],
  now: Date,
): Date | null {
  const matched = warehouseCities.map(matchDeliveryCity);
  if (matched.length === 0) return null;

  const sameMetro = matched.every((entry) => metroMatches(city, entry));
  const sameIsland = matched.every((entry) => islandMatches(city, entry));

  if (method === "INSTANT") {
    if (!sameMetro) return null;
    return new Date(now.getTime() + 2 * 60 * 60 * 1000);
  }

  if (method === "SAME_DAY") {
    if (!sameIsland || wibHour(now) >= SAME_DAY_CUTOFF_HOUR) return null;
    return wibWallClockToUtc(now, 0, 21);
  }

  const days = Math.max(
    1,
    ...matched.map((entry) => regularDays(city, entry)),
  );
  return wibWallClockToUtc(now, days, 18);
}

export function formatDeliveryEstimate(value: Date | string, now = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const wallNow = wibShift(now);
  const wallDate = wibShift(date);
  const dayStart = (input: Date) =>
    Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate());
  const dayDiff = Math.round(
    (dayStart(wallDate) - dayStart(wallNow)) / (24 * 60 * 60 * 1000),
  );

  const time = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date);

  if (dayDiff === 0) return `Hari ini, ${time}`;
  if (dayDiff === 1) return `Besok, ${time}`;

  const day = new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
  return `${day}, ${time}`;
}

export function getDeliveryOptions(
  cityId: string,
  warehouseCities: readonly (string | null | undefined)[],
  now = new Date(),
): DeliveryOption[] {
  const city = findDeliveryCity(cityId);
  if (!city) return [];

  return DELIVERY_METHODS.map((method) => {
    const estimateAt = estimateFor(method.id, city, warehouseCities, now);
    return {
      ...method,
      available: estimateAt !== null,
      estimateAt,
      etaLabel: estimateAt ? formatDeliveryEstimate(estimateAt, now) : null,
    };
  });
}

export function resolveDeliverySelection(options: {
  cityId: string | null | undefined;
  methodId: string | null | undefined;
  warehouseCities: readonly (string | null | undefined)[];
  now?: Date;
}): DeliveryResolution {
  const city = findDeliveryCity(options.cityId);
  if (!city) {
    return {
      ok: false,
      code: "INVALID_CITY",
      message: "Pilih lokasi pengiriman yang tersedia.",
    };
  }

  const method = DELIVERY_METHODS.find((entry) => entry.id === options.methodId);
  if (!method) {
    return {
      ok: false,
      code: "METHOD_UNAVAILABLE",
      message: "Pilih metode pengiriman.",
    };
  }

  const now = options.now ?? new Date();
  const estimateAt = estimateFor(method.id, city, options.warehouseCities, now);
  if (!estimateAt) {
    return {
      ok: false,
      code: "METHOD_UNAVAILABLE",
      message: `Metode ${method.label} tidak tersedia untuk ${city.label}.`,
    };
  }

  return {
    ok: true,
    city,
    method: method.id,
    estimatedDeliveryAt: estimateAt,
  };
}

export function deliveryMethodLabel(method: string | null | undefined): string {
  return DELIVERY_METHODS.find((entry) => entry.id === method)?.label ?? "-";
}

export function deliveryCityLabel(city: string | null | undefined): string {
  return findDeliveryCity(city)?.label ?? city ?? "-";
}
