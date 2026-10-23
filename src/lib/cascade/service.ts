import { db } from "@/src/prisma/db";
import {
  BATCH_STATUSES,
  statusFromScore,
  type BatchStatusValue,
} from "@/src/lib/batches/freshness";
import {
  calculateDynamicPricing,
  calculateFreshnessScore,
} from "@/src/lib/batches/engine";

export const CASCADE_CONFIG = {
  thresholds: {
    fresh: 70,
    rescue: 30,
    feed: 10,
    residue: 0,
  },
  /** Maximum time a batch may stay in a stage before the next stage is forced. */
  stageTimersHours: {
    FRESH: null,
    RESCUE: 48,
    FEED: 72,
    RESIDUE: 72,
    DISPOSED: null,
  } satisfies Record<BatchStatusValue, number | null>,
  rescueDealDurationHours: 48,
  earlyAccessWindowHours: 12,
} as const;

export function nextStatus(status: BatchStatusValue): BatchStatusValue {
  const index = BATCH_STATUSES.indexOf(status);
  return BATCH_STATUSES[Math.min(BATCH_STATUSES.length - 1, index + 1)];
}

export function statusIndex(status: BatchStatusValue): number {
  return BATCH_STATUSES.indexOf(status);
}

export function isForwardTransition(
  from: BatchStatusValue,
  to: BatchStatusValue,
): boolean {
  return statusIndex(to) >= statusIndex(from);
}

type QueryClient = Pick<typeof db, "orm">;

export interface SyncBatchOptions {
  now?: Date;
  actorId?: number | null;
  reason?: string;
  /** Automatic ticks must never move a batch backwards. */
  forwardOnly?: boolean;
  /** Manual warehouse corrections may move a batch to a different stage. */
  ignoreStageTimers?: boolean;
  /** Manually adjusted batches keep their stage unless forced. */
  respectManualOverride?: boolean;
  /** Demo ticks only process batches with an existing pricing record. */
  requirePriceBreakdown?: boolean;
}

export interface BatchSyncResult {
  batchId: number;
  batchCode: string;
  productName: string;
  previousStatus: BatchStatusValue;
  status: BatchStatusValue;
  previousScore: number;
  freshnessScore: number;
  transitioned: boolean;
  forcedByTimer: boolean;
  availableKg: number;
  rescueDealId: number | null;
  reason: string | null;
}

const HOUR_MS = 60 * 60 * 1000;

function asDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function stageEnteredAt(batch: {
  createdAt: string | Date;
  cascadeEvents: Array<{ createdAt: string | Date }>;
}): Date {
  const latest = batch.cascadeEvents[0];
  return asDate(latest?.createdAt ?? batch.createdAt);
}

export async function syncBatchState(
  client: QueryClient,
  batchId: number,
  options: SyncBatchOptions = {},
): Promise<BatchSyncResult | null> {
  const now = options.now ?? new Date();

  const batch = await client.orm.public.Batch.where({ id: batchId })
    .include("product", (product) =>
      product.select(
        "id",
        "name",
        "category",
        "unit",
        "shelfLifeDays",
        "idealTempC",
        "basePricePerKg",
      ),
    )
    .include("warehouse", (warehouse) => warehouse.select("id", "name", "city"))
    .include("priceBreakdown")
    .include("rescueDeal")
    .include("feedListing")
    .include("residueListing")
    .include("cascadeEvents", (events) =>
      events.select("id", "createdAt").orderBy((event) => event.createdAt.desc()).limit(1),
    )
    .first();

  if (
    !batch ||
    !batch.product ||
    (options.requirePriceBreakdown && !batch.priceBreakdown)
  ) {
    return null;
  }

  const product = batch.product;
  const previousStatus = batch.status;
  const previousScore = batch.freshnessScore;

  const freshness = calculateFreshnessScore({
    harvestDate: batch.harvestDate,
    receivedAt: batch.receivedAt,
    storageTempC: batch.storageTempC,
    idealTempC: product.idealTempC,
    shelfLifeDays: product.shelfLifeDays,
    category: product.category,
    now,
  });

  const availableKg = Math.max(0, batch.quantityKg - batch.reservedKg);
  let targetStatus = freshness.status;
  let forcedByTimer = false;

  if (
    options.respectManualOverride &&
    batch.isManuallyAdjusted &&
    !options.ignoreStageTimers
  ) {
    targetStatus = previousStatus;
  }

  if (options.forwardOnly && !isForwardTransition(previousStatus, targetStatus)) {
    targetStatus = previousStatus;
  }

  if (!options.ignoreStageTimers && availableKg > 0) {
    const entered = stageEnteredAt(batch);
    const elapsedHours = (now.getTime() - entered.getTime()) / HOUR_MS;

    const rescueExpired =
      previousStatus === "RESCUE" &&
      batch.rescueDeal !== null &&
      now.getTime() > asDate(batch.rescueDeal.endsAt).getTime();

    const timerHours = CASCADE_CONFIG.stageTimersHours[previousStatus];
    const timerExpired =
      timerHours !== null && elapsedHours >= timerHours;

    if (rescueExpired || timerExpired) {
      const forced = nextStatus(previousStatus);
      if (statusIndex(forced) > statusIndex(targetStatus)) {
        targetStatus = forced;
        forcedByTimer = true;
      }
    }
  }

  if (options.forwardOnly && !isForwardTransition(previousStatus, targetStatus)) {
    targetStatus = previousStatus;
  }

  const pricing = calculateDynamicPricing({
    basePricePerKg: product.basePricePerKg,
    status: targetStatus,
    category: product.category,
    freshnessScore: freshness.score,
    warehouseCostPerKg: batch.priceBreakdown?.warehouseCostPerKg ?? 1000,
    logisticsCostPerKg: batch.priceBreakdown?.logisticsCostPerKg ?? 1500,
    marginPerKg: batch.priceBreakdown?.marginPerKg ?? 2000,
  });

  await client.orm.public.Batch.where({ id: batch.id }).update({
    freshnessScore: freshness.score,
    status: targetStatus,
  });

  if (batch.priceBreakdown) {
    await client.orm.public.PriceBreakdown.where({ batchId: batch.id }).update({
      rescueDiscountPct: pricing.rescueDiscountPct,
      finalPricePerKg: pricing.finalPricePerKg,
    });
  } else {
    await client.orm.public.PriceBreakdown.create({
      batchId: batch.id,
      basePricePerKg: pricing.basePricePerKg,
      warehouseCostPerKg: pricing.warehouseCostPerKg,
      logisticsCostPerKg: pricing.logisticsCostPerKg,
      marginPerKg: pricing.marginPerKg,
      rescueDiscountPct: pricing.rescueDiscountPct,
      finalPricePerKg: pricing.finalPricePerKg,
    });
  }

  const transitioned = previousStatus !== targetStatus;
  let reason: string | null = null;

  if (transitioned) {
    reason =
      options.reason ??
      (forcedByTimer
        ? `Batas waktu tahap ${previousStatus} habis; batch dipindahkan otomatis ke ${targetStatus}.`
        : `Skor kesegaran ${freshness.score} memindahkan batch dari ${previousStatus} ke ${targetStatus}.`);

    await client.orm.public.CascadeEvent.create({
      batchId: batch.id,
      actorId: options.actorId ?? null,
      fromStatus: previousStatus,
      toStatus: targetStatus,
      freshnessScore: freshness.score,
      reason,
    });
  }

  const rescueDealId = await syncStageListing(client, {
    batchId: batch.id,
    status: targetStatus,
    availableKg,
    quantityKg: batch.quantityKg,
    productName: product.name,
    basePricePerKg: product.basePricePerKg,
    finalPricePerKg: pricing.finalPricePerKg,
    discountPct: pricing.rescueDiscountPct,
    now,
    existingRescueDealId: batch.rescueDeal?.id ?? null,
    existingFeedListingId: batch.feedListing?.id ?? null,
    existingResidueListingId: batch.residueListing?.id ?? null,
  });

  return {
    batchId: batch.id,
    batchCode: batch.code,
    productName: product.name,
    previousStatus,
    status: targetStatus,
    previousScore,
    freshnessScore: freshness.score,
    transitioned,
    forcedByTimer,
    availableKg,
    rescueDealId,
    reason,
  };
}

async function syncStageListing(
  client: QueryClient,
  options: {
    batchId: number;
    status: BatchStatusValue;
    availableKg: number;
    quantityKg: number;
    productName: string;
    basePricePerKg: number;
    finalPricePerKg: number;
    discountPct: number;
    now: Date;
    existingRescueDealId: number | null;
    existingFeedListingId: number | null;
    existingResidueListingId: number | null;
  },
): Promise<number | null> {
  const {
    batchId,
    status,
    availableKg,
    quantityKg,
    productName,
    basePricePerKg,
    finalPricePerKg,
    discountPct,
    now,
  } = options;

  if (status === "RESCUE") {
    const startsAt = now;
    const endsAt = new Date(
      now.getTime() + CASCADE_CONFIG.rescueDealDurationHours * HOUR_MS,
    );

    let dealId = options.existingRescueDealId;
    if (dealId) {
      await client.orm.public.RescueDeal.where({ id: dealId }).update({
        discountPct,
        rescuePricePerKg: finalPricePerKg,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        earlyAccessHours: CASCADE_CONFIG.earlyAccessWindowHours,
        isActive: availableKg > 0,
      });
    } else if (availableKg > 0) {
      const deal = await client.orm.public.RescueDeal.create({
        batchId,
        discountPct,
        rescuePricePerKg: finalPricePerKg,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        earlyAccessHours: CASCADE_CONFIG.earlyAccessWindowHours,
        isActive: true,
      });
      dealId = deal.id;
    }

    // A batch only owns one marketplace listing at a time.
    await deactivateIfPresent(client.orm.public.FeedListing, options.existingFeedListingId);
    await deactivateIfPresent(client.orm.public.ResidueListing, options.existingResidueListingId);

    return dealId;
  }

  // Leaving RESCUE deactivates its deal.
  await deactivateIfPresent(client.orm.public.RescueDeal, options.existingRescueDealId);

  if (status === "FEED") {
    await deactivateIfPresent(client.orm.public.ResidueListing, options.existingResidueListingId);

    const feedPrice = Math.max(500, Math.round(basePricePerKg * 0.2));

    if (options.existingFeedListingId) {
      await client.orm.public.FeedListing.where({
        id: options.existingFeedListingId,
      }).update({
        isActive: availableKg > 0,
      });
    } else if (availableKg > 0) {
      await client.orm.public.FeedListing.create({
        batchId,
        pricePerKg: feedPrice,
        availableKg,
        suitableFor: "Ruminansia",
        description: `${productName} dialihkan sebagai pakan ternak.`,
        isActive: true,
      });
    }

    return null;
  }

  await deactivateIfPresent(client.orm.public.FeedListing, options.existingFeedListingId);

  if (status === "RESIDUE") {
    const residuePrice = Math.max(250, Math.round(basePricePerKg * 0.05));

    if (options.existingResidueListingId) {
      await client.orm.public.ResidueListing.where({
        id: options.existingResidueListingId,
      }).update({
        isActive: availableKg > 0,
      });
    } else if (availableKg > 0) {
      await client.orm.public.ResidueListing.create({
        batchId,
        pricePerKg: residuePrice,
        availableKg,
        processingType: "Kompos",
        description: `Residu ${productName} untuk kompos dan biogas.`,
        isActive: true,
      });
    }

    return null;
  }

  // DISPOSED or FRESH: no marketplace listing.
  await deactivateIfPresent(client.orm.public.ResidueListing, options.existingResidueListingId);
  return null;
}

async function deactivateIfPresent(
  model:
    | typeof db.orm.public.RescueDeal
    | typeof db.orm.public.FeedListing
    | typeof db.orm.public.ResidueListing,
  id: number | null,
): Promise<void> {
  if (!id) return;
  // The union of the three collection types is not callable with an update
  // payload, but every model has the same `isActive` column. Narrow by trying
  // the shared shape through a small adapter.
  const collection = model as unknown as {
    where(filter: { id: number }): {
      update(data: { isActive: boolean }): Promise<unknown>;
    };
  };
  await collection.where({ id }).update({ isActive: false });
}

export interface CascadeTickResult {
  processedBatches: number;
  transitions: BatchSyncResult[];
  statusCounts: Record<string, number>;
  skipped: number;
}

export async function runCascadeTick(
  now = new Date(),
  options: { actorId?: number | null; requirePriceBreakdown?: boolean } = {},
): Promise<CascadeTickResult> {
  const batches = await db.orm.public.Batch.select("id").all();

  const transitions: BatchSyncResult[] = [];
  let processed = 0;
  let skipped = 0;

  for (const batch of batches) {
    try {
      const result = await db.transaction(async (tx) =>
        syncBatchState(tx, batch.id, {
          now,
          actorId: options.actorId ?? null,
          forwardOnly: true,
          respectManualOverride: true,
          requirePriceBreakdown: options.requirePriceBreakdown,
        }),
      );

      if (!result) {
        skipped += 1;
        continue;
      }

      processed += 1;
      if (result.transitioned) transitions.push(result);
    } catch (error) {
      skipped += 1;
      console.error(`[cascade] batch ${batch.id} gagal disinkronkan`, error);
    }
  }

  const statusCounts: Record<string, number> = {};
  for (const status of BATCH_STATUSES) {
    statusCounts[status] = 0;
  }

  const grouped = await db.orm.public.Batch
    .groupBy("status")
    .aggregate((aggregate) => ({ count: aggregate.count() }));

  for (const row of grouped) {
    statusCounts[row.status] = row.count;
  }

  return {
    processedBatches: processed,
    transitions,
    statusCounts,
    skipped,
  };
}
