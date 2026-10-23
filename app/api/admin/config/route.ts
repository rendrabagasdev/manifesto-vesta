/**
 * Admin cascade configuration.
 *
 * GET  /api/admin/config — current thresholds, stage timers and default costs
 * PUT  /api/admin/config — partial update (ADMIN only)
 *
 * Every payload is validated with Zod and cross-checked so a misconfigured
 * cascade can never invert its stages (fresh > rescue > feed ≥ residue).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ApiError,
  handleApiError,
  ok,
  readJsonBody,
  requireApiUser,
  userIdOf,
} from "@/src/lib/api/http";
import {
  assertValidThresholds,
  getPlatformConfig,
  savePlatformConfig,
  type PlatformConfigPatch,
} from "@/src/lib/config/platform";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const thresholdValue = z.coerce
  .number()
  .int("Ambang harus bilangan bulat.")
  .min(0, "Ambang minimal 0.")
  .max(100, "Ambang maksimal 100.");

const timerValue = z
  .union([
    z.coerce.number().int("Timer harus bilangan bulat.").min(0).max(8760),
    z.null(),
  ])
  .optional();

const thresholdsSchema = z
  .object({
    fresh: thresholdValue.optional(),
    rescue: thresholdValue.optional(),
    feed: thresholdValue.optional(),
    residue: thresholdValue.optional(),
  })
  .partial();

const pricingSchema = z
  .object({
    warehouseCostPerKg: z.coerce.number().int().min(0).max(10_000_000).optional(),
    logisticsCostPerKg: z.coerce.number().int().min(0).max(10_000_000).optional(),
    marginPerKg: z.coerce.number().int().min(0).max(10_000_000).optional(),
    warehouse: z.coerce.number().int().min(0).max(10_000_000).optional(),
    logistics: z.coerce.number().int().min(0).max(10_000_000).optional(),
    margin: z.coerce.number().int().min(0).max(10_000_000).optional(),
  })
  .partial();

const stageTimersSchema = z.record(z.string(), timerValue);

const configBodySchema = z
  .object({
    thresholds: thresholdsSchema.optional(),
    stageTimersHours: stageTimersSchema.optional(),
    pricing: pricingSchema.optional(),
    pricingDefaults: pricingSchema.optional(),
    rescueDealDurationHours: z.coerce.number().int().min(1).max(720).optional(),
    earlyAccessWindowHours: z.coerce.number().int().min(0).max(168).optional(),
    // Flat aliases make the endpoint forgiving for scripts and the admin form.
    thresholdFresh: thresholdValue.optional(),
    thresholdRescue: thresholdValue.optional(),
    thresholdFeed: thresholdValue.optional(),
    thresholdResidue: thresholdValue.optional(),
    fresh: thresholdValue.optional(),
    rescue: thresholdValue.optional(),
    feed: thresholdValue.optional(),
    residue: thresholdValue.optional(),
    freshTimerHours: timerValue,
    rescueTimerHours: timerValue,
    feedTimerHours: timerValue,
    residueTimerHours: timerValue,
    warehouseCostPerKg: pricingSchema.shape.warehouseCostPerKg,
    logisticsCostPerKg: pricingSchema.shape.logisticsCostPerKg,
    marginPerKg: pricingSchema.shape.marginPerKg,
  })
  .partial();

type ConfigBody = z.infer<typeof configBodySchema>;
type RawRecord = Record<string, unknown>;

function isRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeCase(
  value: unknown,
  keyMapper: (key: string) => string,
): unknown {
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [keyMapper(key), entry]),
  );
}

/**
 * Accept lowercase and uppercase stage keys (`rescue` / `RESCUE`) plus the
 * common `pricingDefaults` alias before Zod does the strict validation.
 */
function normalizeBody(raw: unknown): unknown {
  if (!isRecord(raw)) return raw;

  const normalized: RawRecord = { ...raw };

  if (isRecord(normalized.thresholds)) {
    normalized.thresholds = normalizeCase(
      normalized.thresholds,
      (key) => key.toLowerCase(),
    );
  }

  if (isRecord(normalized.stageTimersHours)) {
    normalized.stageTimersHours = normalizeCase(
      normalized.stageTimersHours,
      (key) => key.toUpperCase(),
    );
  }

  if (isRecord(normalized.stageTimers)) {
    normalized.stageTimersHours = normalizeCase(
      normalized.stageTimers,
      (key) => key.toUpperCase(),
    );
  }

  if (
    normalized.pricing === undefined &&
    (isRecord(normalized.pricingDefaults) || isRecord(normalized.costs))
  ) {
    normalized.pricing = normalized.pricingDefaults ?? normalized.costs;
  }

  return normalized;
}

function pickDefined<T>(value: T | undefined): T | undefined {
  return value === undefined ? undefined : value;
}

function toPatch(body: ConfigBody): PlatformConfigPatch {
  const patch: PlatformConfigPatch = {};

  const thresholds = {
    fresh: body.thresholds?.fresh ?? body.thresholdFresh ?? body.fresh,
    rescue: body.thresholds?.rescue ?? body.thresholdRescue ?? body.rescue,
    feed: body.thresholds?.feed ?? body.thresholdFeed ?? body.feed,
    residue:
      body.thresholds?.residue ?? body.thresholdResidue ?? body.residue,
  };

  if (thresholds.fresh !== undefined) patch.thresholdFresh = thresholds.fresh;
  if (thresholds.rescue !== undefined) patch.thresholdRescue = thresholds.rescue;
  if (thresholds.feed !== undefined) patch.thresholdFeed = thresholds.feed;
  if (thresholds.residue !== undefined) patch.thresholdResidue = thresholds.residue;

  const timers = body.stageTimersHours ?? {};
  const rescuedTimer = pickDefined(timers.RESCUE);
  const freshTimer = pickDefined(timers.FRESH);
  const feedTimer = pickDefined(timers.FEED);
  const residueTimer = pickDefined(timers.RESIDUE);

  if (freshTimer !== undefined) patch.freshTimerHours = freshTimer;
  if (rescuedTimer !== undefined) patch.rescueTimerHours = rescuedTimer;
  if (feedTimer !== undefined) patch.feedTimerHours = feedTimer;
  if (residueTimer !== undefined) patch.residueTimerHours = residueTimer;

  if (body.freshTimerHours !== undefined) {
    patch.freshTimerHours = body.freshTimerHours;
  }
  if (body.rescueTimerHours !== undefined) {
    patch.rescueTimerHours = body.rescueTimerHours;
  }
  if (body.feedTimerHours !== undefined) {
    patch.feedTimerHours = body.feedTimerHours;
  }
  if (body.residueTimerHours !== undefined) {
    patch.residueTimerHours = body.residueTimerHours;
  }

  const pricing = body.pricing ?? body.pricingDefaults;
  const warehouseCost =
    pricing?.warehouseCostPerKg ?? pricing?.warehouse;
  const logisticsCost =
    pricing?.logisticsCostPerKg ?? pricing?.logistics;
  const margin = pricing?.marginPerKg ?? pricing?.margin;

  if (warehouseCost !== undefined) {
    patch.warehouseCostPerKg = warehouseCost;
  }
  if (logisticsCost !== undefined) {
    patch.logisticsCostPerKg = logisticsCost;
  }
  if (margin !== undefined) {
    patch.marginPerKg = margin;
  }

  if (body.warehouseCostPerKg !== undefined) {
    patch.warehouseCostPerKg = body.warehouseCostPerKg;
  }
  if (body.logisticsCostPerKg !== undefined) {
    patch.logisticsCostPerKg = body.logisticsCostPerKg;
  }
  if (body.marginPerKg !== undefined) {
    patch.marginPerKg = body.marginPerKg;
  }

  if (body.rescueDealDurationHours !== undefined) {
    patch.rescueDealDurationHours = body.rescueDealDurationHours;
  }
  if (body.earlyAccessWindowHours !== undefined) {
    patch.earlyAccessWindowHours = body.earlyAccessWindowHours;
  }

  return patch;
}

function enforceConsistency(
  current: Awaited<ReturnType<typeof getPlatformConfig>>,
  patch: PlatformConfigPatch,
): void {
  const thresholds = {
    fresh: patch.thresholdFresh ?? current.thresholds.fresh,
    rescue: patch.thresholdRescue ?? current.thresholds.rescue,
    feed: patch.thresholdFeed ?? current.thresholds.feed,
    residue: patch.thresholdResidue ?? current.thresholds.residue,
  };

  try {
    assertValidThresholds(thresholds);
  } catch (error) {
    throw new ApiError(
      error instanceof Error ? error.message : "Ambang cascade tidak valid.",
      422,
      "INVALID_THRESHOLDS",
      { thresholds },
    );
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    await requireApiUser(["ADMIN"]);
    const config = await getPlatformConfig();
    return ok(
      { ...config, stageTimers: config.stageTimersHours },
      "Konfigurasi cascade",
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request?: Request): Promise<NextResponse> {
  try {
    const user = await requireApiUser(["ADMIN"]);
    if (!request) {
      throw new ApiError("Body konfigurasi wajib diisi", 400, "INVALID_BODY");
    }

    const raw = normalizeBody(await readJsonBody(request));
    const parsed = configBodySchema.safeParse(raw);

    if (!parsed.success) {
      throw new ApiError("Validasi konfigurasi gagal", 422, "VALIDATION_ERROR", {
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const patch = toPatch(parsed.data);
    if (Object.keys(patch).length === 0) {
      throw new ApiError(
        "Tidak ada perubahan konfigurasi yang dikirim",
        400,
        "EMPTY_PATCH",
      );
    }

    const current = await getPlatformConfig();
    enforceConsistency(current, patch);

    const saved = await savePlatformConfig(patch, userIdOf(user));
    return ok(
      { ...saved, stageTimers: saved.stageTimersHours },
      "Konfigurasi cascade diperbarui",
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/** PATCH is an alias so clients can use either verb. */
export const PATCH = PUT;
