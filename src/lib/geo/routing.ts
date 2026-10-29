export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface RouteEstimate {
  distanceKm: number;
  durationMinutes: number;
  provider: "OSRM" | "ESTIMATE";
}

export interface RouteEstimateOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

const EARTH_RADIUS_KM = 6_371;
const ROAD_FACTOR = 1.35;
const AVERAGE_SPEED_KMH = 28;
const DEFAULT_OSRM_URL = "https://router.project-osrm.org";

export function isValidCoordinate(point: GeoPoint): boolean {
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    point.longitude >= -180 &&
    point.longitude <= 180
  );
}

export function haversineKm(from: GeoPoint, to: GeoPoint): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

export function estimateFromStraightLine(from: GeoPoint, to: GeoPoint): RouteEstimate {
  const distanceKm = Math.max(0.1, haversineKm(from, to) * ROAD_FACTOR);
  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    durationMinutes: Math.max(
      10,
      Math.round((distanceKm / AVERAGE_SPEED_KMH) * 60),
    ),
    provider: "ESTIMATE",
  };
}

/**
 * OSRM is keyless, so the demo can show a real driving route. When the public
 * server is unavailable we keep the checkout usable with a conservative
 * straight-line estimate instead of failing the order.
 */
export async function estimateRoute(
  from: GeoPoint,
  to: GeoPoint,
  options: RouteEstimateOptions = {},
): Promise<RouteEstimate> {
  if (!isValidCoordinate(from) || !isValidCoordinate(to)) {
    throw new Error("Koordinat rute tidak valid.");
  }

  if (process.env.ROUTING_API_ENABLED === "false") {
    return estimateFromStraightLine(from, to);
  }

  const baseUrl = process.env.OSRM_BASE_URL?.trim() || DEFAULT_OSRM_URL;
  const url = new URL(
    `/route/v1/driving/${from.longitude},${from.latitude};${to.longitude},${to.latitude}`,
    baseUrl,
  );
  url.searchParams.set("overview", "false");

  try {
    const response = await (options.fetchImpl ?? fetch)(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(options.timeoutMs ?? 3_500),
    });
    if (!response.ok) return estimateFromStraightLine(from, to);

    const payload: unknown = await response.json();
    const routes = (payload as { routes?: Array<{ distance?: unknown; duration?: unknown }> })
      .routes;
    const route = routes?.[0];
    const distanceMeters =
      typeof route?.distance === "number" ? route.distance : null;
    const durationSeconds =
      typeof route?.duration === "number" ? route.duration : null;

    if (
      distanceMeters === null ||
      !Number.isFinite(distanceMeters) ||
      distanceMeters <= 0
    ) {
      return estimateFromStraightLine(from, to);
    }

    return {
      distanceKm: Math.round((distanceMeters / 1000) * 10) / 10,
      durationMinutes:
        durationSeconds !== null && Number.isFinite(durationSeconds)
          ? Math.max(1, Math.round(durationSeconds / 60))
          : estimateFromStraightLine(from, to).durationMinutes,
      provider: "OSRM",
    };
  } catch {
    return estimateFromStraightLine(from, to);
  }
}
