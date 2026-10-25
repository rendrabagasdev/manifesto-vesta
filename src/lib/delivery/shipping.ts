export type DeliveryMethodId = "INSTANT" | "SAME_DAY" | "REGULAR";

export interface DeliveryCity {
  id: string;
  label: string;
  metro: string;
  island: string;
}

export const DELIVERY_CITIES: readonly DeliveryCity[] = [
  { id: "bandung", label: "Kota Bandung", metro: "bandung", island: "jawa" },
  { id: "cimahi", label: "Kota Cimahi", metro: "bandung", island: "jawa" },
  { id: "bandung-barat", label: "Kab. Bandung Barat", metro: "bandung", island: "jawa" },
  { id: "jakarta", label: "Jakarta", metro: "jabodetabek", island: "jawa" },
  { id: "bogor", label: "Kota Bogor", metro: "jabodetabek", island: "jawa" },
  { id: "depok", label: "Kota Depok", metro: "jabodetabek", island: "jawa" },
  { id: "tangerang", label: "Kota Tangerang", metro: "jabodetabek", island: "jawa" },
  { id: "bekasi", label: "Kota Bekasi", metro: "jabodetabek", island: "jawa" },
  { id: "semarang", label: "Kota Semarang", metro: "semarang", island: "jawa" },
  { id: "yogyakarta", label: "Yogyakarta", metro: "yogyakarta", island: "jawa" },
  { id: "surabaya", label: "Kota Surabaya", metro: "surabaya", island: "jawa" },
  { id: "denpasar", label: "Kota Denpasar", metro: "denpasar", island: "bali" },
  { id: "palembang", label: "Kota Palembang", metro: "palembang", island: "sumatera" },
  { id: "medan", label: "Kota Medan", metro: "medan", island: "sumatera" },
  { id: "makassar", label: "Kota Makassar", metro: "makassar", island: "sulawesi" },
];

export const DELIVERY_METHODS: readonly {
  id: DeliveryMethodId;
  label: string;
  description: string;
}[] = [
  { id: "INSTANT", label: "Instan", description: "Kurir langsung dari gudang" },
  { id: "SAME_DAY", label: "Kilat", description: "Dikirim pada hari yang sama" },
  { id: "REGULAR", label: "Reguler", description: "Pengiriman hemat" },
];

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
