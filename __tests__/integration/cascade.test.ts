import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/src/prisma/db";
import {
  CASCADE_CONFIG,
  isForwardTransition,
  nextStatus,
  runCascadeTick,
  statusIndex,
  syncBatchState,
} from "@/src/lib/cascade/service";
import {
  getFeedListings,
  getFreshListings,
  getRescueDeals,
  getResidueListings,
} from "@/src/lib/marketplace/queries";
import { savePlatformConfig } from "@/src/lib/config/platform";
import { closeTestResources, truncateAll } from "./helpers/db";
import {
  createBatch,
  createFeedListing,
  createRescueDeal,
  createResidueListing,
  createWorld,
  daysAgoIso,
  hoursAgoIso,
  type TestWorld,
} from "./helpers/fixtures";

const NOW = new Date("2026-10-23T00:00:00.000Z");
const plusHours = (hours: number) =>
  new Date(NOW.getTime() + hours * 60 * 60 * 1000);
const asHours = (value: string | Date) =>
  (value instanceof Date ? value.getTime() : new Date(value).getTime()) /
  (60 * 60 * 1000);

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  await truncateAll();
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(async () => {
  await closeTestResources();
});

function rescueBatch(world: TestWorld, overrides: { receivedAt?: string } = {}) {
  return createBatch({
    product: world.products.tomato,
    warehouseId: world.warehouse.id,
    harvestDate: daysAgoIso(2).slice(0, 10),
    receivedAt: overrides.receivedAt ?? daysAgoIso(2),
    status: "FRESH",
    freshnessScore: 71,
    quantityKg: 100,
  });
}

describe("cascade helpers", () => {
  it("advances one stage at a time and never past DISPOSED", () => {
    expect(nextStatus("FRESH")).toBe("RESCUE");
    expect(nextStatus("RESCUE")).toBe("FEED");
    expect(nextStatus("FEED")).toBe("RESIDUE");
    expect(nextStatus("RESIDUE")).toBe("DISPOSED");
    expect(nextStatus("DISPOSED")).toBe("DISPOSED");
    expect(statusIndex("FRESH")).toBe(0);
    expect(statusIndex("DISPOSED")).toBe(4);
  });

  it("only treats equal or later stages as forward transitions", () => {
    expect(isForwardTransition("FRESH", "RESCUE")).toBe(true);
    expect(isForwardTransition("FRESH", "FRESH")).toBe(true);
    expect(isForwardTransition("FEED", "RESCUE")).toBe(false);
    expect(isForwardTransition("DISPOSED", "RESIDUE")).toBe(false);
  });

  it("documents the cascade thresholds and stage timers", () => {
    expect(CASCADE_CONFIG.thresholds).toEqual({
      fresh: 70,
      rescue: 30,
      feed: 10,
      residue: 0,
    });
    expect(CASCADE_CONFIG.stageTimersHours).toMatchObject({
      FRESH: null,
      RESCUE: 48,
      FEED: 72,
      RESIDUE: 72,
      DISPOSED: null,
    });
    expect(CASCADE_CONFIG.rescueDealDurationHours).toBe(48);
    expect(CASCADE_CONFIG.earlyAccessWindowHours).toBe(12);
  });
});

describe("syncBatchState transitions", () => {
  it("moves FRESH -> RESCUE and opens a rescue deal", async () => {
    const world = await createWorld();
    const { batch } = await rescueBatch(world);

    const result = await syncBatchState(db, batch.id, { now: plusHours(24) });

    const updated = await db.orm.public.Batch.where({ id: batch.id })
      .include("priceBreakdown")
      .include("rescueDeal")
      .include("feedListing")
      .include("residueListing")
      .first();

    expect(result).toMatchObject({
      previousStatus: "FRESH",
      status: "RESCUE",
      freshnessScore: 57,
      transitioned: true,
      forcedByTimer: false,
    });
    expect(updated!.status).toBe("RESCUE");
    expect(updated!.freshnessScore).toBe(57);
    expect(updated!.priceBreakdown!.rescueDiscountPct).toBeGreaterThanOrEqual(8);
    expect(updated!.priceBreakdown!.rescueDiscountPct).toBeLessThanOrEqual(60);
    expect(updated!.priceBreakdown!.finalPricePerKg).toBeLessThan(19500);
    expect(updated!.rescueDeal).not.toBeNull();
    expect(updated!.rescueDeal!.isActive).toBe(true);
    expect(updated!.rescueDeal!.earlyAccessHours).toBe(12);
    expect(updated!.rescueDeal!.rescuePricePerKg).toBe(
      updated!.priceBreakdown!.finalPricePerKg,
    );
    expect(updated!.feedListing).toBeNull();
    expect(updated!.residueListing).toBeNull();

    const events = await db.orm.public.CascadeEvent.where({ batchId: batch.id }).all();
    expect(events).toHaveLength(2);
    expect(events.some((event) => event.toStatus === "RESCUE")).toBe(true);
  });

  it("applies configured thresholds and rescue windows", async () => {
    const world = await createWorld();
    await savePlatformConfig({
      thresholdFresh: 80,
      thresholdRescue: 40,
      thresholdFeed: 20,
      thresholdResidue: 5,
      rescueDealDurationHours: 24,
      earlyAccessWindowHours: 6,
    });

    const { batch } = await rescueBatch(world);
    const result = await syncBatchState(db, batch.id, { now: NOW });

    expect(result).toMatchObject({
      previousStatus: "FRESH",
      status: "RESCUE",
      forcedByTimer: false,
    });

    const deal = await db.orm.public.RescueDeal.where({
      batchId: batch.id,
    }).first();
    expect(deal).not.toBeNull();
    expect(deal!.earlyAccessHours).toBe(6);
    expect(asHours(deal!.endsAt)).toBeCloseTo(asHours(NOW) + 24, 5);
  });

  it("forces the next stage using the configured timer", async () => {
    const world = await createWorld();
    await savePlatformConfig({ rescueTimerHours: 1 });

    const { batch } = await createBatch({
      product: world.products.rice,
      warehouseId: world.warehouse.id,
      receivedAt: new Date().toISOString(),
      status: "RESCUE",
      freshnessScore: 90,
      cascadeCreatedAt: hoursAgoIso(2),
    });

    const result = await syncBatchState(db, batch.id, { now: NOW });

    expect(result).toMatchObject({
      previousStatus: "RESCUE",
      status: "FEED",
      forcedByTimer: true,
    });
  });

  it("moves RESCUE -> FEED and swaps the rescue deal for a feed listing", async () => {
    const world = await createWorld();
    const { batch } = await rescueBatch(world);
    await syncBatchState(db, batch.id, { now: plusHours(24) });

    const result = await syncBatchState(db, batch.id, { now: plusHours(72) });

    const updated = await db.orm.public.Batch.where({ id: batch.id })
      .include("rescueDeal")
      .include("feedListing")
      .first();

    expect(result).toMatchObject({ previousStatus: "RESCUE", status: "FEED" });
    expect(updated!.status).toBe("FEED");
    expect(updated!.rescueDeal!.isActive).toBe(false);
    expect(updated!.feedListing).not.toBeNull();
    expect(updated!.feedListing!.isActive).toBe(true);
    expect(updated!.feedListing!.pricePerKg).toBe(3000);
    expect(updated!.feedListing!.availableKg).toBe(100);
  });

  it("moves FEED -> RESIDUE and swaps the feed listing for a residue listing", async () => {
    const world = await createWorld();
    const { batch } = await rescueBatch(world);
    await syncBatchState(db, batch.id, { now: plusHours(24) });
    await syncBatchState(db, batch.id, { now: plusHours(72) });

    const result = await syncBatchState(db, batch.id, { now: plusHours(108) });

    const updated = await db.orm.public.Batch.where({ id: batch.id })
      .include("feedListing")
      .include("residueListing")
      .first();

    expect(result).toMatchObject({ previousStatus: "FEED", status: "RESIDUE" });
    expect(updated!.status).toBe("RESIDUE");
    expect(updated!.feedListing!.isActive).toBe(false);
    expect(updated!.residueListing).not.toBeNull();
    expect(updated!.residueListing!.isActive).toBe(true);
    expect(updated!.residueListing!.pricePerKg).toBe(750);
  });

  it("moves RESIDUE -> DISPOSED and deactivates every listing", async () => {
    const world = await createWorld();
    const { batch } = await rescueBatch(world);
    await syncBatchState(db, batch.id, { now: plusHours(24) });
    await syncBatchState(db, batch.id, { now: plusHours(72) });
    await syncBatchState(db, batch.id, { now: plusHours(108) });

    const result = await syncBatchState(db, batch.id, { now: plusHours(168) });

    const updated = await db.orm.public.Batch.where({ id: batch.id })
      .include("rescueDeal")
      .include("feedListing")
      .include("residueListing")
      .first();

    expect(result).toMatchObject({
      previousStatus: "RESIDUE",
      status: "DISPOSED",
      freshnessScore: 0,
    });
    expect(updated!.status).toBe("DISPOSED");
    expect(updated!.rescueDeal!.isActive).toBe(false);
    expect(updated!.feedListing!.isActive).toBe(false);
    expect(updated!.residueListing!.isActive).toBe(false);
  });

  it("returns null for an unknown batch", async () => {
    await createWorld();
    await expect(syncBatchState(db, 9999)).resolves.toBeNull();
  });
});

describe("syncBatchState safeguards", () => {
  it("never moves a batch backwards when forwardOnly is set", async () => {
    const world = await createWorld();
    const { batch } = await createBatch({
      product: world.products.tomato,
      warehouseId: world.warehouse.id,
      receivedAt: new Date().toISOString(),
      status: "RESCUE",
      freshnessScore: 40,
    });

    const result = await syncBatchState(db, batch.id, {
      now: new Date(),
      forwardOnly: true,
    });

    expect(result).toMatchObject({
      previousStatus: "RESCUE",
      status: "RESCUE",
      transitioned: false,
    });
    const updated = await db.orm.public.Batch.where({ id: batch.id }).first();
    expect(updated!.status).toBe("RESCUE");
  });

  it("respects a manual warehouse override", async () => {
    const world = await createWorld();
    const { batch } = await createBatch({
      product: world.products.tomato,
      warehouseId: world.warehouse.id,
      receivedAt: new Date().toISOString(),
      status: "FEED",
      freshnessScore: 20,
      isManuallyAdjusted: true,
    });

    const result = await syncBatchState(db, batch.id, {
      now: new Date(),
      respectManualOverride: true,
    });

    expect(result).toMatchObject({
      previousStatus: "FEED",
      status: "FEED",
      transitioned: false,
    });
  });

  it("ignores the manual override when stage timers are ignored", async () => {
    const world = await createWorld();
    const { batch } = await createBatch({
      product: world.products.tomato,
      warehouseId: world.warehouse.id,
      receivedAt: new Date().toISOString(),
      status: "FEED",
      freshnessScore: 20,
      isManuallyAdjusted: true,
    });

    const result = await syncBatchState(db, batch.id, {
      now: new Date(),
      respectManualOverride: true,
      ignoreStageTimers: true,
    });

    expect(result).toMatchObject({
      previousStatus: "FEED",
      status: "FRESH",
      transitioned: true,
    });
  });

  it("forces the next stage when the stage timer expires", async () => {
    const world = await createWorld();
    const { batch } = await createBatch({
      product: world.products.rice,
      warehouseId: world.warehouse.id,
      receivedAt: new Date().toISOString(),
      status: "RESCUE",
      freshnessScore: 90,
      cascadeCreatedAt: hoursAgoIso(50),
    });

    const result = await syncBatchState(db, batch.id, {
      now: new Date(),
      respectManualOverride: true,
    });

    expect(result).toMatchObject({
      previousStatus: "RESCUE",
      status: "FEED",
      forcedByTimer: true,
    });
    expect(result?.reason).toContain("Batas waktu");
  });

  it("forces the next stage when the rescue deal has expired", async () => {
    const world = await createWorld();
    const { batch } = await rescueBatch(world);
    await syncBatchState(db, batch.id, { now: plusHours(24) });

    // Simulate a deal that already closed while the score is still in RESCUE.
    const deal = await db.orm.public.RescueDeal.where({ batchId: batch.id }).first();
    await db.orm.public.RescueDeal.where({ id: deal!.id }).update({
      endsAt: hoursAgoIso(1),
    });

    const result = await syncBatchState(db, batch.id, { now: new Date() });

    expect(result).toMatchObject({
      previousStatus: "RESCUE",
      status: "FEED",
      forcedByTimer: true,
    });
  });

  it("does not create a listing for a fully reserved batch", async () => {
    const world = await createWorld();
    const { batch } = await rescueBatch(world);
    await db.orm.public.Batch.where({ id: batch.id }).update({
      reservedKg: 100,
    });

    const result = await syncBatchState(db, batch.id, { now: plusHours(24) });

    expect(result?.status).toBe("RESCUE");
    expect(result?.availableKg).toBe(0);
    expect(
      await db.orm.public.RescueDeal.where({ batchId: batch.id }).first(),
    ).toBeNull();
  });
});

describe("runCascadeTick", () => {
  it("processes every batch and reports transitions and status counts", async () => {
    const world = await createWorld();

    const fresh = await createBatch({
      product: world.products.tomato,
      warehouseId: world.warehouse.id,
      receivedAt: new Date().toISOString(),
      status: "FRESH",
      freshnessScore: 100,
    });
    const toRescue = await createBatch({
      product: world.products.tomato,
      warehouseId: world.warehouse.id,
      receivedAt: daysAgoIso(3),
      status: "FRESH",
      freshnessScore: 90,
    });
    const toFeed = await createBatch({
      product: world.products.apple,
      warehouseId: world.warehouse.id,
      receivedAt: daysAgoIso(20),
      status: "FRESH",
      freshnessScore: 90,
    });

    const result = await runCascadeTick(new Date());

    expect(result.processedBatches).toBe(3);
    expect(result.skipped).toBe(0);
    expect(result.statusCounts).toMatchObject({
      FRESH: 1,
      RESCUE: 1,
      FEED: 1,
      RESIDUE: 0,
      DISPOSED: 0,
    });
    expect(
      result.transitions.map((transition) => transition.batchId).sort(),
    ).toEqual([toRescue.batch.id, toFeed.batch.id].sort());

    const freshAfter = await db.orm.public.Batch.where({ id: fresh.batch.id }).first();
    expect(freshAfter!.status).toBe("FRESH");
  });

  it("returns zeroes on an empty database", async () => {
    const result = await runCascadeTick(new Date());
    expect(result.processedBatches).toBe(0);
    expect(result.transitions).toEqual([]);
    expect(result.statusCounts).toEqual({
      FRESH: 0,
      RESCUE: 0,
      FEED: 0,
      RESIDUE: 0,
      DISPOSED: 0,
    });
  });
});

describe("marketplace visibility across the cascade", () => {
  it("lists only FRESH batches with stock in the fresh marketplace", async () => {
    const world = await createWorld();
    const fresh = await createBatch({
      product: world.products.tomato,
      warehouseId: world.warehouse.id,
      quantityKg: 10,
      status: "FRESH",
      freshnessScore: 95,
    });
    await createBatch({
      product: world.products.spinach,
      warehouseId: world.warehouse.id,
      quantityKg: 10,
      reservedKg: 10,
      status: "FRESH",
      freshnessScore: 95,
    });
    await createBatch({
      product: world.products.apple,
      warehouseId: world.warehouse.id,
      quantityKg: 10,
      status: "RESCUE",
      freshnessScore: 50,
    });

    const listings = await getFreshListings(db);
    expect(listings.map((listing) => listing.batchId)).toEqual([fresh.batch.id]);
    expect(listings[0].availableKg).toBe(10);
    expect(listings[0].pricePerKg).toBe(19500);
  });

  it("moves a batch from rescue deals to feed and then residue listings", async () => {
    const world = await createWorld();
    const { batch } = await rescueBatch(world);

    expect(await getRescueDeals(db)).toEqual([]);
    expect(await getFeedListings(db)).toEqual([]);

    await syncBatchState(db, batch.id, { now: plusHours(24) });
    const deals = await getRescueDeals(db);
    expect(deals).toHaveLength(1);
    expect(deals[0].batchId).toBe(batch.id);
    expect(deals[0].availableKg).toBe(100);
    expect(await getFreshListings(db)).toEqual([]);

    await syncBatchState(db, batch.id, { now: plusHours(72) });
    expect(await getRescueDeals(db)).toEqual([]);
    const feed = await getFeedListings(db);
    expect(feed).toHaveLength(1);
    expect(feed[0].batchId).toBe(batch.id);
    expect(feed[0].pricePerKg).toBe(3000);

    await syncBatchState(db, batch.id, { now: plusHours(108) });
    expect(await getFeedListings(db)).toEqual([]);
    const residue = await getResidueListings(db);
    expect(residue).toHaveLength(1);
    expect(residue[0].batchId).toBe(batch.id);
    expect(residue[0].pricePerKg).toBe(750);

    await syncBatchState(db, batch.id, { now: plusHours(168) });
    expect(await getResidueListings(db)).toEqual([]);
  });

  it("hides inactive or out-of-stock rescue, feed and residue listings", async () => {
    const world = await createWorld();
    const rescue = await createBatch({
      product: world.products.tomato,
      warehouseId: world.warehouse.id,
      quantityKg: 10,
      status: "RESCUE",
      freshnessScore: 50,
    });
    const feed = await createBatch({
      product: world.products.apple,
      warehouseId: world.warehouse.id,
      quantityKg: 10,
      reservedKg: 10,
      status: "FEED",
      freshnessScore: 20,
    });
    const residue = await createBatch({
      product: world.products.spinach,
      warehouseId: world.warehouse.id,
      quantityKg: 10,
      status: "RESIDUE",
      freshnessScore: 5,
    });

    await createRescueDeal({
      batchId: rescue.batch.id,
      rescuePricePerKg: 10000,
      isActive: true,
    });
    await createFeedListing({
      batchId: feed.batch.id,
      pricePerKg: 2000,
      isActive: true,
    });
    await createResidueListing({
      batchId: residue.batch.id,
      pricePerKg: 500,
      isActive: false,
    });

    expect(await getRescueDeals(db)).toHaveLength(1);
    expect(await getFeedListings(db)).toHaveLength(0);
    expect(await getResidueListings(db)).toHaveLength(0);
  });

  it("exposes the rescue deal access window to the marketplace", async () => {
    const world = await createWorld();
    const { batch } = await rescueBatch(world);
    await syncBatchState(db, batch.id, { now: plusHours(24) });

    const [deal] = await getRescueDeals(db);
    expect(deal.dealEarlyAccessHours).toBe(12);
    expect(deal.access.publicStartsAt).toBe(new Date(deal.startsAt).toISOString());
    expect(deal.discountPct).toBeGreaterThanOrEqual(8);
    expect(deal.originalPricePerKg).toBeGreaterThan(deal.rescuePricePerKg);
  });
});
