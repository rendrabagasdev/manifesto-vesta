export interface WeatherSnapshot {
  temperatureC: number;
  apparentTemperatureC: number | null;
  humidityPct: number | null;
  precipitationMm: number | null;
  windSpeedKmh: number | null;
  source: "OPENWEATHER" | "OPEN_METEO";
  fetchedAt: string;
}

interface WeatherCacheEntry {
  expiresAt: number;
  weather: WeatherSnapshot;
}

export interface WeatherLookupOptions {
  fetchImpl?: typeof fetch;
  now?: number;
  ttlMs?: number;
}

const DEFAULT_TTL_MS = 15 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 3_500;
const cache = new Map<string, WeatherCacheEntry>();

function cacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function isCoordinate(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

async function fetchJson(
  url: URL,
  fetchImpl: typeof fetch,
): Promise<unknown | null> {
  try {
    const response = await fetchImpl(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchOpenWeather(
  latitude: number,
  longitude: number,
  apiKey: string,
  fetchImpl: typeof fetch,
): Promise<WeatherSnapshot | null> {
  const url = new URL("https://api.openweathermap.org/data/2.5/weather");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("units", "metric");
  url.searchParams.set("appid", apiKey);

  const payload = await fetchJson(url, fetchImpl);
  if (!payload || typeof payload !== "object") return null;

  const root = payload as {
    main?: { temp?: unknown; feels_like?: unknown; humidity?: unknown };
    rain?: { "1h"?: unknown };
    wind?: { speed?: unknown };
  };
  const temperatureC = finiteOrNull(root.main?.temp);
  if (temperatureC === null) return null;

  const windMps = finiteOrNull(root.wind?.speed);

  return {
    temperatureC: round(temperatureC, 1),
    apparentTemperatureC: finiteOrNull(root.main?.feels_like),
    humidityPct: finiteOrNull(root.main?.humidity),
    precipitationMm: finiteOrNull(root.rain?.["1h"]),
    windSpeedKmh: windMps === null ? null : round(windMps * 3.6, 1),
    source: "OPENWEATHER",
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchOpenMeteo(
  latitude: number,
  longitude: number,
  fetchImpl: typeof fetch,
): Promise<WeatherSnapshot | null> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m",
  );
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("timezone", "auto");

  const payload = await fetchJson(url, fetchImpl);
  if (!payload || typeof payload !== "object") return null;

  const current = (payload as { current?: Record<string, unknown> }).current;
  const temperatureC = finiteOrNull(current?.temperature_2m);
  if (temperatureC === null) return null;

  return {
    temperatureC: round(temperatureC, 1),
    apparentTemperatureC: finiteOrNull(current?.apparent_temperature),
    humidityPct: finiteOrNull(current?.relative_humidity_2m),
    precipitationMm: finiteOrNull(current?.precipitation),
    windSpeedKmh: finiteOrNull(current?.wind_speed_10m),
    source: "OPEN_METEO",
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Ambient weather is a supporting signal, not a sensor replacement. Requests
 * are cached briefly because one cascade tick reads the same warehouses many
 * times, and a provider outage must never block a freshness recalculation.
 */
export async function getWeatherForCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  options: WeatherLookupOptions = {},
): Promise<WeatherSnapshot | null> {
  if (process.env.WEATHER_API_ENABLED === "false") return null;
  if (
    latitude === null ||
    latitude === undefined ||
    longitude === null ||
    longitude === undefined ||
    !isCoordinate(latitude, longitude)
  ) {
    return null;
  }

  const now = options.now ?? Date.now();
  const key = cacheKey(latitude, longitude);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) return cached.weather;

  const fetchImpl = options.fetchImpl ?? fetch;
  const apiKey = process.env.OPENWEATHER_API_KEY?.trim();

  const weather =
    (apiKey
      ? await fetchOpenWeather(latitude, longitude, apiKey, fetchImpl)
      : null) ??
    (await fetchOpenMeteo(latitude, longitude, fetchImpl));

  if (!weather) return null;

  cache.set(key, {
    weather,
    expiresAt: now + (options.ttlMs ?? DEFAULT_TTL_MS),
  });
  return weather;
}

export function getWeatherForWarehouse(
  warehouse: { latitude: number | null; longitude: number | null },
  options: WeatherLookupOptions = {},
): Promise<WeatherSnapshot | null> {
  return getWeatherForCoordinates(
    warehouse.latitude,
    warehouse.longitude,
    options,
  );
}

export function clearWeatherCache(): void {
  cache.clear();
}

export function weatherLabel(source: WeatherSnapshot["source"]): string {
  return source === "OPENWEATHER" ? "OpenWeather" : "Open-Meteo";
}
