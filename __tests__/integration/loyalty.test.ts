import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/src/prisma/db";
import { ApiError } from "@/src/lib/api/http";
import { runCascadeTick } from "@/src/lib/cascade/service";
import {
  addNormalSpend,
  computeTier,
  consumeRescueQuota,
  expireLoyaltySpend,
  getNextTier,
  getOrCreateBuyerTier,
  getQuotaStatus,
  getTierBenefit,
  getWeekEnd,
  getWeekStart,
  isTierName,
  progressToNextTier,
  runLoyaltyExpiry,
  TIER_BENEFITS,
} from "@/src/lib/loyalty/tiers";
import { closeTestResources, truncateAll } from "./helpers/db";
import {
  createBuyerTier,
  createLoyaltyEntry,
  createUser,
  createWorld,
  daysAgoIso,
} from "./helpers/fixtures";

const MONDAY = new Date("2026-10-19T03:00:00.000Z"); // Monday 10:00 Jakarta
const NEXT_MONDAY = new Date("2026-10-26T03:00:00.000Z");

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await closeTestResources();
});

describe("tier computation", () => {
  it.each([
    [0, "STARTER"],
    [499_999, "STARTER"],
    [500_000, "SILVER"],
    [1_999_999, "SILVER"],
    [2_000_000, "GOLD"],
    [4_999_999, "GOLD"],
    [5_000_000, "PLATINUM"],
    [50_000_000, "PLATINUM"],
  ] as const)("maps spend %s to %s", (spend, tier) => {
    expect(computeTier(spend)).toBe(tier);
  });

  it("exposes the documented benefit table", () => {
    expect(TIER_BENEFITS.STARTER).toMatchObject({
      minimumSpend: 0,
      rescueQuotaPerWeek: 2,
      earlyAccessHours: 0,
    });
    expect(TIER_BENEFITS.SILVER).toMatchObject({
      minimumSpend: 500_000,
      rescueQuotaPerWeek: 5,
      earlyAccessHours: 2,
    });
    expect(TIER_BENEFITS.GOLD).toMatchObject({
      minimumSpend: 2_000_000,
      rescueQuotaPerWeek: 12,
      earlyAccessHours: 6,
    });
    expect(TIER_BENEFITS.PLATINUM).toMatchObject({
      minimumSpend: 5_000_000,
      rescueQuotaPerWeek: 25,
      earlyAccessHours: 12,
    });
  });

  it("computes the next tier and progress", () => {
    expect(getNextTier("STARTER")).toEqual({
      nextTier: "SILVER",
      threshold: 500_000,
    });
    expect(getNextTier("PLATINUM")).toEqual({
      nextTier: null,
      threshold: null,
    });
    expect(progressToNextTier("STARTER", 250_000)).toBe(50);
    expect(progressToNextTier("STARTER", 900_000)).toBe(100);
    expect(progressToNextTier("PLATINUM", 9_000_000)).toBe(100);
  });

  it("validates tier names and falls back to Starter", () => {
    expect(isTierName("GOLD")).toBe(true);
    expect(isTierName("DIAMOND")).toBe(false);
    expect(getTierBenefit("DIAMOND").tier).toBe("STARTER");
    expect(getTierBenefit(null).tier).toBe("STARTER");
  });
});

describe("weekly quota windows", () => {
  it("starts on Monday in Asia/Jakarta", () => {
    expect(getWeekStart(MONDAY)).toBe("2026-10-19");
    expect(getWeekStart(new Date("2026-10-23T03:00:00.000Z"))).toBe(
      "2026-10-19",
    );
    expect(getWeekStart(new Date("2026-10-19T00:30:00.000Z"))).toBe(
      "2026-10-19",
    );
    expect(getWeekEnd(MONDAY)).toBe("2026-10-26");
  });

  it("rolls over at Jakarta midnight on Monday", () => {
    // Sunday 23:00 Jakarta == Sunday 16:00 UTC.
    expect(getWeekStart(new Date("2026-10-25T16:00:00.000Z"))).toBe(
      "2026-10-19",
    );
    // Monday 00:00 Jakarta == Sunday 17:00 UTC.
    expect(getWeekStart(new Date("2026-10-25T17:00:00.000Z"))).toBe(
      "2026-10-26",
    );
  });
});

describe("buyer tier bootstrap", () => {
  it("creates a Starter row once and returns the same row afterwards", async () => {
    const world = await createWorld();
    const first = await getOrCreateBuyerTier(db, world.users.consumer.id);
    const second = await getOrCreateBuyerTier(db, world.users.consumer.id);

    expect(first.id).toBe(second.id);
    expect(first.tier).toBe("STARTER");
    expect(first.rescueQuotaPerWeek).toBe(2);
    expect(await db.orm.public.BuyerTier.all()).toHaveLength(1);
  });

  it("returns the quota status with reset date", async () => {
    const world = await createWorld();
    const status = await getQuotaStatus(db, world.users.consumer.id, MONDAY);

    expect(status).toMatchObject({
      tier: "STARTER",
      tierLabel: "Starter",
      limit: 2,
      used: 0,
      remaining: 2,
      weekStart: "2026-10-19",
      resetsAt: "2026-10-26",
      earlyAccessHours: 0,
      points: 0,
      totalSpend30d: 0,
    });
  });
});

describe("consumeRescueQuota", () => {
  it("consumes quota one at a time", async () => {
    const world = await createWorld();

    const first = await consumeRescueQuota(db, world.users.consumer.id, MONDAY);
    expect(first).toMatchObject({ limit: 2, used: 1, remaining: 1 });

    const second = await consumeRescueQuota(db, world.users.consumer.id, MONDAY);
    expect(second).toMatchObject({ limit: 2, used: 2, remaining: 0 });
  });

  it("throws RESCUE_QUOTA_EXHAUSTED when the weekly limit is reached", async () => {
    const world = await createWorld();
    await consumeRescueQuota(db, world.users.consumer.id, MONDAY, 2);

    await expect(
      consumeRescueQuota(db, world.users.consumer.id, MONDAY, 1),
    ).rejects.toMatchObject({
      status: 409,
      code: "RESCUE_QUOTA_EXHAUSTED",
      details: { limit: 2, used: 2, remaining: 0 },
    });
  });

  it("never stacks quota across weeks", async () => {
    const world = await createWorld();
    await consumeRescueQuota(db, world.users.consumer.id, MONDAY, 2);

    const nextWeek = await consumeRescueQuota(
      db,
      world.users.consumer.id,
      NEXT_MONDAY,
      1,
    );

    expect(nextWeek).toMatchObject({
      weekStart: "2026-10-26",
      used: 1,
      remaining: 1,
    });

    const rows = await db.orm.public.RescueQuotaUsage.where({
      userId: world.users.consumer.id,
    }).all();
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.weekStart).sort()).toEqual([
      "2026-10-19",
      "2026-10-26",
    ]);

    const oldWeek = await getQuotaStatus(db, world.users.consumer.id, MONDAY);
    expect(oldWeek.used).toBe(2);
    expect(oldWeek.remaining).toBe(0);
  });

  it("uses the buyer's tier limit", async () => {
    const world = await createWorld();
    await createBuyerTier({
      userId: world.users.business.id,
      tier: "GOLD",
    });

    const result = await consumeRescueQuota(
      db,
      world.users.business.id,
      MONDAY,
      12,
    );
    expect(result).toMatchObject({ limit: 12, used: 12, remaining: 0 });

    await expect(
      consumeRescueQuota(db, world.users.business.id, MONDAY, 1),
    ).rejects.toMatchObject({ code: "RESCUE_QUOTA_EXHAUSTED" });
  });

  it.each([0, -1, 1.5])("rejects an invalid count of %s", async (count) => {
    const world = await createWorld();
    await expect(
      consumeRescueQuota(db, world.users.consumer.id, MONDAY, count),
    ).rejects.toBeInstanceOf(ApiError);
  });
});

describe("addNormalSpend", () => {
  it("awards points and upgrades tiers as spend accumulates", async () => {
    const world = await createWorld();
    const userId = world.users.consumer.id;

    const silver = await addNormalSpend(db, {
      userId,
      amount: 600_000,
      at: MONDAY,
      description: "Belanja pertama",
    });
    expect(silver).toMatchObject({
      previousTier: "STARTER",
      tier: "SILVER",
      totalSpend30d: 600_000,
      points: 600,
      pointsDelta: 600,
      tierChanged: true,
    });

    const gold = await addNormalSpend(db, {
      userId,
      amount: 1_500_000,
      at: MONDAY,
    });
    expect(gold).toMatchObject({
      previousTier: "SILVER",
      tier: "GOLD",
      totalSpend30d: 2_100_000,
      points: 2_100,
      pointsDelta: 1_500,
      tierChanged: true,
    });

    const platinum = await addNormalSpend(db, {
      userId,
      amount: 3_000_000,
      at: MONDAY,
    });
    expect(platinum).toMatchObject({
      previousTier: "GOLD",
      tier: "PLATINUM",
      totalSpend30d: 5_100_000,
      points: 5_100,
      pointsDelta: 3_000,
      tierChanged: true,
    });

    const tier = await db.orm.public.BuyerTier.where({ userId }).first();
    expect(tier).toMatchObject({
      tier: "PLATINUM",
      totalSpend30d: 5_100_000,
      points: 5_100,
      rescueQuotaPerWeek: 25,
      earlyAccessHours: 12,
    });
  });

  it("writes an EARN ledger entry linked to the order", async () => {
    const world = await createWorld();
    const order = await db.orm.public.Order.create({
      code: "ORD-LOYALTY-1",
      buyerId: world.users.consumer.id,
      subtotal: 195_000,
      total: 195_000,
      status: "PAID",
    });

    await addNormalSpend(db, {
      userId: world.users.consumer.id,
      amount: 195_000,
      orderId: order.id,
      at: MONDAY,
    });

    const entries = await db.orm.public.LoyaltyLedger.where({
      userId: world.users.consumer.id,
    }).all();

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      type: "EARN",
      amount: 195_000,
      pointsDelta: 195,
      orderId: order.id,
    });
  });

  it("ignores zero and negative amounts without writing a ledger entry", async () => {
    const world = await createWorld();
    const zero = await addNormalSpend(db, {
      userId: world.users.consumer.id,
      amount: 0,
    });
    const negative = await addNormalSpend(db, {
      userId: world.users.consumer.id,
      amount: -500,
    });

    expect(zero.pointsDelta).toBe(0);
    expect(negative.pointsDelta).toBe(0);
    expect(await db.orm.public.LoyaltyLedger.all()).toHaveLength(0);
  });

  it("floors points for fractional thousands", async () => {
    const world = await createWorld();
    const result = await addNormalSpend(db, {
      userId: world.users.consumer.id,
      amount: 1_999,
    });
    expect(result.pointsDelta).toBe(1);
  });
});

describe("expireLoyaltySpend", () => {
  it("drops spend older than 30 days and downgrades the tier", async () => {
    const world = await createWorld();
    const userId = world.users.consumer.id;

    await createBuyerTier({
      userId,
      tier: "GOLD",
      totalSpend30d: 5_000_000,
      points: 5000,
    });
    await createLoyaltyEntry({
      userId,
      amount: 1_000_000,
      createdAt: daysAgoIso(2),
    });
    await createLoyaltyEntry({
      userId,
      amount: 4_000_000,
      createdAt: daysAgoIso(40),
    });

    const result = await expireLoyaltySpend(db, userId);

    expect(result).toEqual({ totalSpend30d: 1_000_000, tier: "SILVER" });

    const tier = await db.orm.public.BuyerTier.where({ userId }).first();
    expect(tier).toMatchObject({
      tier: "SILVER",
      totalSpend30d: 1_000_000,
      points: 5000,
      rescueQuotaPerWeek: 5,
      earlyAccessHours: 2,
    });
  });

  it("resets to Starter when no recent spend remains", async () => {
    const world = await createWorld();
    await createBuyerTier({
      userId: world.users.consumer.id,
      tier: "PLATINUM",
      totalSpend30d: 9_000_000,
    });
    await createLoyaltyEntry({
      userId: world.users.consumer.id,
      amount: 9_000_000,
      createdAt: daysAgoIso(45),
    });

    const result = await expireLoyaltySpend(db, world.users.consumer.id);
    expect(result).toEqual({ totalSpend30d: 0, tier: "STARTER" });
  });

  it("only counts EARN entries", async () => {
    const world = await createWorld();
    await createLoyaltyEntry({
      userId: world.users.consumer.id,
      amount: 5_000_000,
      type: "REDEEM",
      createdAt: daysAgoIso(1),
    });

    const result = await expireLoyaltySpend(db, world.users.consumer.id);
    expect(result.totalSpend30d).toBe(0);
  });

  it("bootstraps a missing tier row", async () => {
    const user = await createUser({
      email: "new-buyer@vesta.id",
      name: "New Buyer",
      role: "CONSUMER",
    });

    const result = await expireLoyaltySpend(db, user.id);
    expect(result).toEqual({ totalSpend30d: 0, tier: "STARTER" });
  });
});

describe("runLoyaltyExpiry", () => {
  it("expires stale spend across buyers and reports the downgrades", async () => {
    const world = await createWorld();
    const stale = world.users.consumer.id;
    const active = world.users.business.id;

    await createBuyerTier({
      userId: stale,
      tier: "GOLD",
      totalSpend30d: 4_000_000,
      points: 4000,
    });
    await createLoyaltyEntry({
      userId: stale,
      amount: 4_000_000,
      createdAt: daysAgoIso(31),
    });
    await createBuyerTier({
      userId: active,
      tier: "SILVER",
      totalSpend30d: 1_000_000,
    });
    await createLoyaltyEntry({
      userId: active,
      amount: 1_000_000,
      createdAt: daysAgoIso(3),
    });

    const result = await runLoyaltyExpiry();

    expect(result).toEqual({
      processedUsers: 1,
      downgradedUsers: 1,
      expiredSpend: 4_000_000,
    });

    const staleTier = await db.orm.public.BuyerTier.where({
      userId: stale,
    }).first();
    expect(staleTier).toMatchObject({
      tier: "STARTER",
      totalSpend30d: 0,
      points: 4000,
      rescueQuotaPerWeek: 2,
      earlyAccessHours: 0,
    });

    const activeTier = await db.orm.public.BuyerTier.where({
      userId: active,
    }).first();
    expect(activeTier).toMatchObject({
      tier: "SILVER",
      totalSpend30d: 1_000_000,
    });
  });

  it("skips buyers that never spent", async () => {
    const world = await createWorld();
    await createBuyerTier({
      userId: world.users.consumer.id,
      tier: "STARTER",
    });

    const result = await runLoyaltyExpiry();

    expect(result).toEqual({
      processedUsers: 0,
      downgradedUsers: 0,
      expiredSpend: 0,
    });
  });

  it("runs as part of the cascade tick using the tick clock", async () => {
    const world = await createWorld();
    await createBuyerTier({
      userId: world.users.consumer.id,
      tier: "PLATINUM",
      totalSpend30d: 6_000_000,
    });
    await createLoyaltyEntry({
      userId: world.users.consumer.id,
      amount: 6_000_000,
      createdAt: daysAgoIso(40),
    });

    const tick = await runCascadeTick(new Date());

    expect(tick.loyalty).toEqual({
      processedUsers: 1,
      downgradedUsers: 1,
      expiredSpend: 6_000_000,
    });

    const tier = await db.orm.public.BuyerTier.where({
      userId: world.users.consumer.id,
    }).first();
    expect(tier).toMatchObject({ tier: "STARTER", totalSpend30d: 0 });
  });
});
