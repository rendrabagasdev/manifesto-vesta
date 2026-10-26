import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearWeatherCache,
  getWeatherForCoordinates,
  weatherLabel,
} from "@/src/lib/weather/service";
import {
  estimateFromStraightLine,
  estimateRoute,
  haversineKm,
  isValidCoordinate,
} from "@/src/lib/geo/routing";

const BANDUNG = { latitude: -6.943, longitude: 107.625 };
const CIMAHI = { latitude: -6.8722, longitude: 107.5425 };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.unstubAllEnvs();
  clearWeatherCache();
});

afterEach(() => {
  vi.unstubAllEnvs();
  clearWeatherCache();
});

describe("getWeatherForCoordinates", () => {
  it("skips the provider when weather is disabled", async () => {
    const fetchMock = vi.fn();
    const weather = await getWeatherForCoordinates(
      BANDUNG.latitude,
      BANDUNG.longitude,
      { fetchImpl: fetchMock as unknown as typeof fetch },
    );

    expect(weather).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("parses Open-Meteo when no OpenWeather key is set", async () => {
    vi.stubEnv("WEATHER_API_ENABLED", "true");
    vi.stubEnv("OPENWEATHER_API_KEY", "");

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toContain("open-meteo.com");
      return jsonResponse({
        current: {
          temperature_2m: 27.46,
          relative_humidity_2m: 82,
          apparent_temperature: 29.1,
          precipitation: 0.4,
          wind_speed_10m: 6,
        },
      });
    });

    const weather = await getWeatherForCoordinates(
      BANDUNG.latitude,
      BANDUNG.longitude,
      { fetchImpl: fetchMock as unknown as typeof fetch },
    );

    expect(weather).toMatchObject({
      temperatureC: 27.5,
      apparentTemperatureC: 29.1,
      humidityPct: 82,
      precipitationMm: 0.4,
      windSpeedKmh: 6,
      source: "OPEN_METEO",
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("open-meteo.com");
    expect(weatherLabel("OPEN_METEO")).toBe("Open-Meteo");
  });

  it("prefers OpenWeather when a key is configured", async () => {
    vi.stubEnv("WEATHER_API_ENABLED", "true");
    vi.stubEnv("OPENWEATHER_API_KEY", "test-key");

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("openweathermap.org")) {
        return jsonResponse({
          main: { temp: 26.44, feels_like: 28, humidity: 78 },
          rain: { "1h": 1.2 },
          wind: { speed: 2.5 },
        });
      }
      return jsonResponse({ current: { temperature_2m: 31 } });
    });

    const weather = await getWeatherForCoordinates(
      BANDUNG.latitude,
      BANDUNG.longitude,
      { fetchImpl: fetchMock as unknown as typeof fetch },
    );

    expect(weather).toMatchObject({
      temperatureC: 26.4,
      humidityPct: 78,
      precipitationMm: 1.2,
      windSpeedKmh: 9,
      source: "OPENWEATHER",
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("openweathermap.org");
  });

  it("falls back to Open-Meteo when OpenWeather fails", async () => {
    vi.stubEnv("WEATHER_API_ENABLED", "true");
    vi.stubEnv("OPENWEATHER_API_KEY", "test-key");

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("openweathermap.org")) {
        return jsonResponse({ message: "unauthorized" }, 401);
      }
      return jsonResponse({ current: { temperature_2m: 28 } });
    });

    const weather = await getWeatherForCoordinates(
      BANDUNG.latitude,
      BANDUNG.longitude,
      { fetchImpl: fetchMock as unknown as typeof fetch },
    );

    expect(weather?.source).toBe("OPEN_METEO");
    expect(weather?.temperatureC).toBe(28);
  });

  it("caches successful lookups for the configured TTL", async () => {
    vi.stubEnv("WEATHER_API_ENABLED", "true");
    vi.stubEnv("OPENWEATHER_API_KEY", "");

    const fetchMock = vi.fn(async () =>
      jsonResponse({ current: { temperature_2m: 27 } }),
    );
    const options = {
      fetchImpl: fetchMock as unknown as typeof fetch,
      ttlMs: 1_000,
    };

    await getWeatherForCoordinates(BANDUNG.latitude, BANDUNG.longitude, {
      ...options,
      now: 1_000,
    });
    await getWeatherForCoordinates(BANDUNG.latitude, BANDUNG.longitude, {
      ...options,
      now: 1_500,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await getWeatherForCoordinates(BANDUNG.latitude, BANDUNG.longitude, {
      ...options,
      now: 3_000,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns null for invalid coordinates or provider failure", async () => {
    vi.stubEnv("WEATHER_API_ENABLED", "true");
    vi.stubEnv("OPENWEATHER_API_KEY", "");

    const fetchMock = vi.fn(async () => jsonResponse({ error: true }, 500));

    expect(
      await getWeatherForCoordinates(120, 107, {
        fetchImpl: fetchMock as unknown as typeof fetch,
      }),
    ).toBeNull();
    expect(
      await getWeatherForCoordinates(BANDUNG.latitude, BANDUNG.longitude, {
        fetchImpl: fetchMock as unknown as typeof fetch,
      }),
    ).toBeNull();
  });
});

describe("route estimates", () => {
  it("validates coordinates and measures distance", () => {
    expect(isValidCoordinate(BANDUNG)).toBe(true);
    expect(isValidCoordinate({ latitude: 91, longitude: 0 })).toBe(false);
    expect(isValidCoordinate({ latitude: 0, longitude: 181 })).toBe(false);
    expect(haversineKm(BANDUNG, BANDUNG)).toBeCloseTo(0, 5);

    const estimate = estimateFromStraightLine(BANDUNG, CIMAHI);
    expect(estimate.distanceKm).toBeGreaterThan(10);
    expect(estimate.durationMinutes).toBeGreaterThanOrEqual(10);
    expect(estimate.provider).toBe("ESTIMATE");
  });

  it("parses OSRM distance and duration", async () => {
    vi.stubEnv("ROUTING_API_ENABLED", "true");

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toContain("router.project-osrm.org");
      return jsonResponse({ routes: [{ distance: 12_345, duration: 900 }] });
    });

    const route = await estimateRoute(BANDUNG, CIMAHI, {
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(route).toEqual({
      distanceKm: 12.3,
      durationMinutes: 15,
      provider: "OSRM",
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "/route/v1/driving/107.625,-6.943;107.5425,-6.8722",
    );
  });

  it("falls back to the straight-line estimate when OSRM fails", async () => {
    vi.stubEnv("ROUTING_API_ENABLED", "true");

    const fetchMock = vi.fn(async () => jsonResponse({ code: "error" }, 503));
    const route = await estimateRoute(BANDUNG, CIMAHI, {
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(route).toEqual(estimateFromStraightLine(BANDUNG, CIMAHI));
  });

  it("uses the offline estimate when routing is disabled", async () => {
    const fetchMock = vi.fn();
    const route = await estimateRoute(BANDUNG, CIMAHI, {
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(route.provider).toBe("ESTIMATE");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects invalid route coordinates", async () => {
    await expect(
      estimateRoute(BANDUNG, { latitude: 95, longitude: 200 }),
    ).rejects.toThrow("Koordinat rute tidak valid.");
  });
});
