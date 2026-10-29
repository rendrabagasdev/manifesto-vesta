import { db } from "@/src/prisma/db";
import {
  estimateRoute,
  isValidCoordinate,
  type GeoPoint,
} from "@/src/lib/geo/routing";

type QueryClient = Pick<typeof db, "orm">;

export interface CartRouteLeg {
  warehouseId: number;
  warehouseName: string;
  distanceKm: number;
  durationMinutes: number;
  provider: "OSRM" | "ESTIMATE";
}

export interface CartRouteEstimate {
  distanceKm: number;
  durationMinutes: number;
  provider: "OSRM" | "ESTIMATE";
  warehouseName: string;
  legs: CartRouteLeg[];
}

/**
 * A cart can contain batches from several warehouses. The order stores the
 * farthest leg so the buyer sees a conservative distance instead of the
 * optimistic nearest one.
 */
export async function estimateCartRoute(
  batchIds: readonly number[],
  destination: GeoPoint,
  options: {
    client?: QueryClient;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<CartRouteEstimate | null> {
  if (!isValidCoordinate(destination) || batchIds.length === 0) return null;

  const client = options.client ?? db;
  const batches = await Promise.all(
    batchIds.map((batchId) =>
      client.orm.public.Batch.where({ id: batchId })
        .include("warehouse", (warehouse) =>
          warehouse.select(
            "id",
            "name",
            "latitude",
            "longitude",
          ),
        )
        .first(),
    ),
  );

  const warehouses = new Map<
    number,
    { id: number; name: string; latitude: number; longitude: number }
  >();

  for (const batch of batches) {
    const warehouse = batch?.warehouse;
    if (
      !warehouse ||
      warehouse.latitude === null ||
      warehouse.longitude === null
    ) {
      continue;
    }
    if (!isValidCoordinate({ latitude: warehouse.latitude, longitude: warehouse.longitude })) {
      continue;
    }
    warehouses.set(warehouse.id, {
      id: warehouse.id,
      name: warehouse.name,
      latitude: warehouse.latitude,
      longitude: warehouse.longitude,
    });
  }

  if (warehouses.size === 0) return null;

  const legs = await Promise.all(
    [...warehouses.values()].map(async (warehouse) => {
      const route = await estimateRoute(
        { latitude: warehouse.latitude, longitude: warehouse.longitude },
        destination,
        { fetchImpl: options.fetchImpl },
      );
      return {
        warehouseId: warehouse.id,
        warehouseName: warehouse.name,
        ...route,
      } satisfies CartRouteLeg;
    }),
  );

  const farthest = legs.reduce((current, leg) =>
    leg.distanceKm > current.distanceKm ? leg : current,
  );

  return {
    distanceKm: farthest.distanceKm,
    durationMinutes: farthest.durationMinutes,
    provider: farthest.provider,
    warehouseName: farthest.warehouseName,
    legs: legs.sort((a, b) => a.distanceKm - b.distanceKm),
  };
}
