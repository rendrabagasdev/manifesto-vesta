/**
 * Platform configuration: cascade thresholds, stage timers and default costs.
 *
 * The values live in a single-row `PlatformConfig` table (id = 1) so an ADMIN
 * can tune the demo without a redeploy. The cascade engine keeps its own safe
 * defaults; this module is the read/write source of truth for the admin UI and
 * API, and every unsafe patch is rejected before it reaches the database.
 */

import { db } from "@/src/prisma/db";
import { DEFAULT_STATUS_THRESHOLDS } from "@/src/lib/batches/freshness";

export const PLATFORM_CONFIG_ID = 1;

export interface PlatformThresholds {
  fresh: number;
  rescue: number;
  feed: number;
  residue: number;
}

export interface PlatformStageTimers {
  FRESH: number | null;
  RESCUE: number | null;
  FEED: number | null;
  RESIDUE: number | null;
  DISPOSED: number | null;
}

export interface PlatformPricingDefaults {
  warehouseCostPerKg: number;
  logisticsCostPerKg: number;
  marginPerKg: number;
}

export interface PlatformConfigView {
  thresholds: PlatformThresholds;
  stageTimersHours: PlatformStageTimers;
  pricing: PlatformPricingDefaults;
  pricingDefaults: PlatformPricingDefaults;
  rescueDealDurationHours: number;
  earlyAccessWindowHours: number;
  updatedById: number | null;
  updatedAt: string | null;
}

export const DEFAULT_PLATFORM_CONFIG: PlatformConfigView = {
  thresholds: { ...DEFAULT_STATUS_THRESHOLDS },
  stageTimersHours: {
    FRESH: null,
    RESCUE: 48,
    FEED: 72,
    RESIDUE: 72,
    DISPOSED: null,
  },
  pricing: {
    warehouseCostPerKg: 1000,
    logisticsCostPerKg: 1500,
    marginPerKg: 2000,
  },
  pricingDefaults: {
    warehouseCostPerKg: 1000,
    logisticsCostPerKg: 1500,
    marginPerKg: 2000,
  },
  rescueDealDurationHours: 48,
  earlyAccessWindowHours: 12,
  updatedById: null,
  updatedAt: null,
};

type QueryClient = Pick<typeof db, "orm">;

type ConfigRow = NonNullable<
  Awaited<ReturnType<typeof db.orm.public.PlatformConfig.first>>
>;

/** Flat patch matching the database columns. */
export interface PlatformConfigPatch {
  thresholdFresh?: number;
  thresholdRescue?: number;
  thresholdFeed?: number;
  thresholdResidue?: number;
  freshTimerHours?: number | null;
  rescueTimerHours?: number | null;
  feedTimerHours?: number | null;
  residueTimerHours?: number | null;
  rescueDealDurationHours?: number;
  earlyAccessWindowHours?: number;
  warehouseCostPerKg?: number;
  logisticsCostPerKg?: number;
  marginPerKg?: number;
  updatedById?: number | null;
}

function rowToView(row: ConfigRow): PlatformConfigView {
  const pricing: PlatformPricingDefaults = {
    warehouseCostPerKg: row.warehouseCostPerKg,
    logisticsCostPerKg: row.logisticsCostPerKg,
    marginPerKg: row.marginPerKg,
  };

  return {
    thresholds: {
      fresh: row.thresholdFresh,
      rescue: row.thresholdRescue,
      feed: row.thresholdFeed,
      residue: row.thresholdResidue,
    },
    stageTimersHours: {
      FRESH: row.freshTimerHours,
      RESCUE: row.rescueTimerHours,
      FEED: row.feedTimerHours,
      RESIDUE: row.residueTimerHours,
      DISPOSED: null,
    },
    pricing,
    pricingDefaults: { ...pricing },
    rescueDealDurationHours: row.rescueDealDurationHours,
    earlyAccessWindowHours: row.earlyAccessWindowHours,
    updatedById: row.updatedById,
    updatedAt: row.updatedAt,
  };
}

export async function getPlatformConfig(
  client: QueryClient = db,
): Promise<PlatformConfigView> {
  const row = await client.orm.public.PlatformConfig.where({
    id: PLATFORM_CONFIG_ID,
  }).first();

  if (!row) return structuredClone(DEFAULT_PLATFORM_CONFIG);
  return rowToView(row);
}

/**
 * Merge a validated patch into the singleton row. Creates the row on first
 * write; later writes never reset fields the caller did not send.
 */
export async function savePlatformConfig(
  patch: PlatformConfigPatch,
  actorId?: number,
): Promise<PlatformConfigView> {
  const existing = await db.orm.public.PlatformConfig.where({
    id: PLATFORM_CONFIG_ID,
  }).first();

  const data: PlatformConfigPatch = {
    ...patch,
    ...(actorId ? { updatedById: actorId } : {}),
  };

  if (existing) {
    await db.orm.public.PlatformConfig.where({ id: existing.id }).update(data);
  } else {
    await db.orm.public.PlatformConfig.create({
      id: PLATFORM_CONFIG_ID,
      ...data,
    });
  }

  return getPlatformConfig();
}

export function assertValidThresholds(
  thresholds: PlatformThresholds,
): void {
  const { fresh, rescue, feed, residue } = thresholds;
  const valid =
    fresh > rescue &&
    rescue > feed &&
    feed >= residue &&
    residue >= 0 &&
    fresh <= 100;
  if (!valid) {
    throw new Error(
      "Ambang cascade harus memenuhi segar > layu > pakan ≥ residu ≥ 0.",
    );
  }
}
