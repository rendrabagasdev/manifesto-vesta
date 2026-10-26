import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/src/prisma/db";
import { ApiError } from "@/src/lib/api/http";
import {
  createOrderFromCart,
  createPreorder,
  createSinglePurchase,
} from "@/src/lib/orders/service";
import {
  estimateImpact,
  getCascadeStats,
  getImpactSummary,
  IMPACT_FACTORS,
} from "@/src/lib/impact/ledger";
import {
  getOrderByCode,
  getOrdersForUser,
} from "@/src/lib/marketplace/queries";
import { getQuotaStatus } from "@/src/lib/loyalty/tiers";
import { estimateCartRoute } from "@/src/lib/delivery/routes";
import { calculateShippingCost } from "@/src/lib/delivery/shipping";
import { closeTestResources, truncateAll } from "./helpers/db";
import {
  createBatch,
  createBuyerTier,
  createFeedListing,
  createRescueDeal,
  createResidueListing,
  createWorld,
  hoursFromNowIso,
  today,
  type TestWorld,
} from "./helpers/fixtures";

const ADDRESS = "Jl. Cihampelas No. 45, Bandung";
const PHONE = "081234567890";

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await closeTestResources();
});

async function setupShop(world: TestWorld) {
  const fresh = await createBatch({
    product: world.products.tomato,
    warehouseId: world.warehouse.id,
    quantityKg: 100,
    status: "FRESH",
    freshnessScore: 95,
  });

  const rescue = await createBatch({
    product: world.products.spinach,
    warehouseId: world.warehouse.id,
    quantityKg: 100,
    status: "RESCUE",
    freshnessScore: 57,
  });
  const rescueDeal = await createRescueDeal({
    batchId: rescue.batch.id,
    rescuePricePerKg: 12000,
    discountPct: 30,
  });

  return { fresh, rescue, rescueDeal };
}

describe("estimateImpact", () => {
  it.each([
    ["FRESH", 0.35],
    ["RESCUE", 1],
    ["FEED", 0.7],
    ["RESIDUE", 0.35],
    ["DISPOSED", 0],
  ] as const)("applies the %s stage multiplier", (stage, multiplier) => {
    const impact = estimateImpact(10, "VEGETABLE", stage);
    expect(impact.rescuedKg).toBe(10);
    expect(impact.wasteDivertedKg).toBe(10);
    expect(impact.co2eSavedKg).toBeCloseTo(
      10 * IMPACT_FACTORS.VEGETABLE.co2ePerKg * multiplier,
      3,
    );
    expect(impact.waterSavedLiters).toBeCloseTo(
      10 * IMPACT_FACTORS.VEGETABLE.waterLitersPerKg * multiplier,
      1,
    );
  });

  it("clamps negative quantities and unknown categories/stages", () => {
    expect(estimateImpact(-5, "VEGETABLE", "FRESH")).toMatchObject({
      rescuedKg: 0,
      co2eSavedKg: 0,
      waterSavedLiters: 0,
      wasteDivertedKg: 0,
    });

    const unknown = estimateImpact(10, "UNKNOWN", "UNKNOWN");
    expect(unknown.co2eSavedKg).toBe(0);
    expect(unknown.rescuedKg).toBe(10);
  });
});

describe("createOrderFromCart", () => {
  it("checks out FRESH stock, reserves it and records impact + loyalty", async () => {
    const world = await createWorld();
    await createBuyerTier({ userId: world.users.consumer.id });
    const { fresh } = await setupShop(world);

    const result = await createOrderFromCart({
      buyerId: world.users.consumer.id,
      buyerName: world.users.consumer.name,
      buyerEmail: world.users.consumer.email,
      lines: [{ batchId: fresh.batch.id, quantityKg: 10 }],
      deliveryAddress: ADDRESS,
      contactPhone: PHONE,
      notes: "Titip di pos",
    });

    expect(result.paid).toBe(false);
    expect(result.paymentUrl).toBeNull();
    expect(result.code).toMatch(/^ORD-\d{8}-[A-Z0-9]{5}$/);

    const order = await db.orm.public.Order.where({ code: result.code })
      .include("items")
      .include("impactLogs")
      .first();

    expect(order).toMatchObject({
      buyerId: world.users.consumer.id,
      kind: "REGULAR",
      status: "PENDING",
      subtotal: 195_000,
      discount: 0,
      shippingCost: 0,
      total: 195_000,
      deliveryAddress: ADDRESS,
      contactPhone: PHONE,
      notes: "Titip di pos",
      paymentProvider: "COD",
      paymentRef: null,
      paymentUrl: null,
      paidAt: null,
      deliveryLatitude: null,
      deliveryLongitude: null,
      deliveryDistanceKm: null,
      deliveryDurationMinutes: null,
    });

    expect(order!.items).toHaveLength(1);
    expect(order!.items[0]).toMatchObject({
      batchId: fresh.batch.id,
      quantityKg: 10,
      pricePerKg: 19500,
      lineTotal: 195_000,
      stage: "FRESH",
    });

    const batch = await db.orm.public.Batch.where({ id: fresh.batch.id }).first();
    expect(batch!.reservedKg).toBe(10);

    expect(order!.impactLogs).toHaveLength(1);
    expect(order!.impactLogs[0]).toMatchObject({
      batchId: fresh.batch.id,
      orderId: order!.id,
      rescuedKg: 10,
      wasteDivertedKg: 10,
    });
    expect(order!.impactLogs[0].co2eSavedKg).toBeCloseTo(4.9, 3);
    expect(order!.impactLogs[0].waterSavedLiters).toBeCloseTo(770, 1);

    const tier = await db.orm.public.BuyerTier.where({
      userId: world.users.consumer.id,
    }).first();
    expect(tier).toMatchObject({
      totalSpend30d: 195_000,
      points: 195,
      tier: "STARTER",
    });

    const ledger = await db.orm.public.LoyaltyLedger.where({
      userId: world.users.consumer.id,
    }).all();
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      type: "EARN",
      amount: 195_000,
      pointsDelta: 195,
      orderId: order!.id,
    });
  });

  it("estimates the farthest warehouse leg for a multi-warehouse cart", async () => {
    const world = await createWorld();
    const near = await createBatch({
      product: world.products.tomato,
      warehouseId: world.warehouse.id,
      quantityKg: 10,
      status: "FRESH",
      freshnessScore: 95,
    });
    const far = await createBatch({
      product: world.products.spinach,
      warehouseId: world.otherWarehouse.id,
      quantityKg: 10,
      status: "FRESH",
      freshnessScore: 95,
    });

    const route = await estimateCartRoute(
      [near.batch.id, far.batch.id],
      { latitude: -6.9175, longitude: 107.6191 },
    );

    expect(route).not.toBeNull();
    expect(route!.legs).toHaveLength(2);
    expect(route!.warehouseName).toBe("Gudang Cadangan");
    expect(route!.distanceKm).toBeGreaterThan(route!.legs[0].distanceKm);
    expect(route!.distanceKm).toBe(route!.legs[1].distanceKm);
  });

  it("stores the pinned delivery point and route estimate", async () => {
    const world = await createWorld();
    await createBuyerTier({ userId: world.users.consumer.id });
    const { fresh } = await setupShop(world);

    const result = await createOrderFromCart({
      buyerId: world.users.consumer.id,
      lines: [{ batchId: fresh.batch.id, quantityKg: 2 }],
      deliveryAddress: ADDRESS,
      contactPhone: PHONE,
      deliveryLatitude: -6.9175,
      deliveryLongitude: 107.6191,
    });

    const order = await db.orm.public.Order.where({ code: result.code }).first();
    expect(order).toMatchObject({
      status: "PENDING",
      paymentProvider: "COD",
      deliveryLatitude: -6.9175,
      deliveryLongitude: 107.6191,
    });
    expect(order!.deliveryDistanceKm).toBeGreaterThan(0);
    expect(order!.deliveryDurationMinutes).toBeGreaterThanOrEqual(10);
    expect(order!.shippingCost).toBe(0);
  });

  it("charges shipping from the route distance and delivery method", async () => {
    const world = await createWorld();
    await createBuyerTier({ userId: world.users.consumer.id });
    const { fresh } = await setupShop(world);

    const result = await createOrderFromCart({
      buyerId: world.users.consumer.id,
      lines: [{ batchId: fresh.batch.id, quantityKg: 2 }],
      deliveryAddress: ADDRESS,
      deliveryCity: "bandung",
      deliveryMethod: "INSTANT",
      deliveryLatitude: -6.9175,
      deliveryLongitude: 107.6191,
      contactPhone: PHONE,
    });

    const order = await db.orm.public.Order.where({ code: result.code }).first();
    const expectedShipping = calculateShippingCost(
      order!.deliveryDistanceKm,
      "INSTANT",
    );

    expect(order).toMatchObject({
      subtotal: 39_000,
      shippingCost: expectedShipping,
      total: 39_000 + expectedShipping,
    });
    expect(order!.shippingCost).toBeGreaterThan(0);
  });

  it("sums multiple lines and reserves each batch", async () => {
    const world = await createWorld();
    await createBuyerTier({ userId: world.users.consumer.id });
    const { fresh } = await setupShop(world);
    const rice = await createBatch({
      product: world.products.rice,
      warehouseId: world.warehouse.id,
      quantityKg: 100,
      status: "FRESH",
      freshnessScore: 98,
    });

    const result = await createOrderFromCart({
      buyerId: world.users.consumer.id,
      lines: [
        { batchId: fresh.batch.id, quantityKg: 2 },
        { batchId: rice.batch.id, quantityKg: 5 },
      ],
      deliveryAddress: ADDRESS,
      contactPhone: PHONE,
    });

    const order = await db.orm.public.Order.where({ code: result.code })
      .include("items")
      .first();

    // 2 * 19500 + 5 * 18500
    expect(order!.subtotal).toBe(131_500);
    expect(order!.total).toBe(131_500);
    expect(order!.items).toHaveLength(2);
    expect(
      (await db.orm.public.Batch.where({ id: fresh.batch.id }).first())!.reservedKg,
    ).toBe(2);
    expect(
      (await db.orm.public.Batch.where({ id: rice.batch.id }).first())!.reservedKg,
    ).toBe(5);
  });

  it("stores the delivery location and estimate", async () => {
    const world = await createWorld();
    await createBuyerTier({ userId: world.users.consumer.id });
    const { fresh } = await setupShop(world);

    const startedAt = Date.now();
    const result = await createOrderFromCart({
      buyerId: world.users.consumer.id,
      lines: [{ batchId: fresh.batch.id, quantityKg: 2 }],
      deliveryAddress: ADDRESS,
      deliveryCity: "bandung",
      deliveryMethod: "INSTANT",
      contactPhone: PHONE,
    });

    const order = await db.orm.public.Order.where({ code: result.code }).first();
    expect(order).toMatchObject({
      deliveryCity: "Kota Bandung",
      deliveryMethod: "INSTANT",
    });
    expect(order!.estimatedDeliveryAt).not.toBeNull();

    const estimate = new Date(order!.estimatedDeliveryAt!).getTime();
    expect(estimate).toBeGreaterThanOrEqual(startedAt + 2 * 60 * 60 * 1000 - 1000);
    expect(estimate).toBeLessThanOrEqual(Date.now() + 2 * 60 * 60 * 1000 + 1000);
  });

  it("rejects instan outside the warehouse metro without reserving stock", async () => {
    const world = await createWorld();
    await createBuyerTier({ userId: world.users.consumer.id });
    const { fresh } = await setupShop(world);

    await expect(
      createOrderFromCart({
        buyerId: world.users.consumer.id,
        lines: [{ batchId: fresh.batch.id, quantityKg: 2 }],
        deliveryAddress: ADDRESS,
        deliveryCity: "jakarta",
        deliveryMethod: "INSTANT",
        contactPhone: PHONE,
      }),
    ).rejects.toMatchObject({ code: "METHOD_UNAVAILABLE", status: 409 });

    const batch = await db.orm.public.Batch.where({ id: fresh.batch.id }).first();
    expect(batch!.reservedKg).toBe(0);
    expect(await db.orm.public.Order.all()).toHaveLength(0);
  });

  it("rejects an unknown delivery city", async () => {
    const world = await createWorld();
    const { fresh } = await setupShop(world);

    await expect(
      createOrderFromCart({
        buyerId: world.users.consumer.id,
        lines: [{ batchId: fresh.batch.id, quantityKg: 2 }],
        deliveryAddress: ADDRESS,
        deliveryCity: "atlantis",
        deliveryMethod: "REGULAR",
        contactPhone: PHONE,
      }),
    ).rejects.toMatchObject({ code: "INVALID_CITY", status: 400 });
  });

  it("rejects an empty cart", async () => {
    const world = await createWorld();
    await expect(
      createOrderFromCart({
        buyerId: world.users.consumer.id,
        lines: [],
        deliveryAddress: ADDRESS,
        contactPhone: PHONE,
      }),
    ).rejects.toMatchObject({ code: "EMPTY_CART", status: 400 });
  });

  it("rejects a batch that is no longer FRESH", async () => {
    const world = await createWorld();
    const { rescue } = await setupShop(world);

    await expect(
      createOrderFromCart({
        buyerId: world.users.consumer.id,
        lines: [{ batchId: rescue.batch.id, quantityKg: 1 }],
        deliveryAddress: ADDRESS,
        contactPhone: PHONE,
      }),
    ).rejects.toMatchObject({ code: "BATCH_NOT_FRESH", status: 409 });
  });

  it("rejects quantities above the available stock", async () => {
    const world = await createWorld();
    const { fresh } = await setupShop(world);
    await db.orm.public.Batch.where({ id: fresh.batch.id }).update({
      reservedKg: 95,
    });

    await expect(
      createOrderFromCart({
        buyerId: world.users.consumer.id,
        lines: [{ batchId: fresh.batch.id, quantityKg: 10 }],
        deliveryAddress: ADDRESS,
        contactPhone: PHONE,
      }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK", status: 409 });
  });

  it.each([0, -1, Number.NaN])("rejects an invalid quantity of %s", async (qty) => {
    const world = await createWorld();
    const { fresh } = await setupShop(world);

    await expect(
      createOrderFromCart({
        buyerId: world.users.consumer.id,
        lines: [{ batchId: fresh.batch.id, quantityKg: qty }],
        deliveryAddress: ADDRESS,
        contactPhone: PHONE,
      }),
    ).rejects.toMatchObject({ code: "INVALID_QTY" });
  });

  it("rejects an unknown batch", async () => {
    const world = await createWorld();
    await expect(
      createOrderFromCart({
        buyerId: world.users.consumer.id,
        lines: [{ batchId: 9999, quantityKg: 1 }],
        deliveryAddress: ADDRESS,
        contactPhone: PHONE,
      }),
    ).rejects.toMatchObject({ code: "BATCH_NOT_FOUND", status: 404 });
  });
});

describe("createSinglePurchase (rescue deals)", () => {
  it("charges the rescue price, consumes quota and records rescue impact", async () => {
    const world = await createWorld();
    await createBuyerTier({ userId: world.users.consumer.id });
    const { rescue } = await setupShop(world);

    const result = await createSinglePurchase({
      buyerId: world.users.consumer.id,
      batchId: rescue.batch.id,
      quantityKg: 2,
      source: "RESCUE",
      contactPhone: PHONE,
    });

    expect(result.paid).toBe(true);

    const order = await db.orm.public.Order.where({ code: result.code })
      .include("items")
      .include("impactLogs")
      .first();

    expect(order).toMatchObject({
      kind: "REGULAR",
      status: "PAID",
      subtotal: 24_000,
      total: 24_000,
      tierAtPurchase: "STARTER",
    });
    expect(order!.items[0]).toMatchObject({
      batchId: rescue.batch.id,
      quantityKg: 2,
      pricePerKg: 12000,
      lineTotal: 24_000,
      stage: "RESCUE",
    });
    expect(order!.impactLogs[0].co2eSavedKg).toBeCloseTo(2.8, 3);
    expect(order!.impactLogs[0].waterSavedLiters).toBeCloseTo(440, 1);

    const batch = await db.orm.public.Batch.where({ id: rescue.batch.id }).first();
    expect(batch!.reservedKg).toBe(2);

    const quota = await getQuotaStatus(db, world.users.consumer.id);
    expect(quota.used).toBe(1);
    expect(quota.remaining).toBe(1);

    // Rescue purchases do not earn normal-spend points.
    expect(await db.orm.public.LoyaltyLedger.all()).toHaveLength(0);
    const tier = await db.orm.public.BuyerTier.where({
      userId: world.users.consumer.id,
    }).first();
    expect(tier).toMatchObject({ totalSpend30d: 0, points: 0 });
  });

  it("enforces the weekly quota and blocks the third Starter purchase", async () => {
    const world = await createWorld();
    await createBuyerTier({ userId: world.users.consumer.id });
    const { rescue } = await setupShop(world);

    await createSinglePurchase({
      buyerId: world.users.consumer.id,
      batchId: rescue.batch.id,
      quantityKg: 1,
      source: "RESCUE",
    });
    await createSinglePurchase({
      buyerId: world.users.consumer.id,
      batchId: rescue.batch.id,
      quantityKg: 1,
      source: "RESCUE",
    });

    await expect(
      createSinglePurchase({
        buyerId: world.users.consumer.id,
        batchId: rescue.batch.id,
        quantityKg: 1,
        source: "RESCUE",
      }),
    ).rejects.toMatchObject({
      code: "RESCUE_QUOTA_EXHAUSTED",
      status: 409,
    });

    const quota = await getQuotaStatus(db, world.users.consumer.id);
    expect(quota).toMatchObject({ used: 2, remaining: 0 });
    expect(await db.orm.public.Order.all()).toHaveLength(2);
  });

  it("locks Starter and Silver out of early access while Gold gets in", async () => {
    const world = await createWorld();
    const { rescue } = await setupShop(world);
    // Replace the open deal with one that starts in four hours.
    await db.orm.public.RescueDeal.where({ batchId: rescue.batch.id }).deleteAll();
    await createRescueDeal({
      batchId: rescue.batch.id,
      rescuePricePerKg: 9000,
      startsAt: hoursFromNowIso(4),
      endsAt: hoursFromNowIso(28),
      earlyAccessHours: 12,
    });

    await createBuyerTier({ userId: world.users.consumer.id, tier: "STARTER" });
    await createBuyerTier({
      userId: world.users.otherProducer.id,
      tier: "SILVER",
    });
    await createBuyerTier({ userId: world.users.business.id, tier: "GOLD" });

    await expect(
      createSinglePurchase({
        buyerId: world.users.consumer.id,
        batchId: rescue.batch.id,
        quantityKg: 1,
        source: "RESCUE",
      }),
    ).rejects.toMatchObject({ code: "DEAL_LOCKED", status: 403 });

    await expect(
      createSinglePurchase({
        buyerId: world.users.otherProducer.id,
        batchId: rescue.batch.id,
        quantityKg: 1,
        source: "RESCUE",
      }),
    ).rejects.toMatchObject({ code: "DEAL_LOCKED", status: 403 });

    const goldPurchase = await createSinglePurchase({
      buyerId: world.users.business.id,
      batchId: rescue.batch.id,
      quantityKg: 1,
      source: "RESCUE",
    });
    expect(goldPurchase.paid).toBe(true);

    // Locked attempts must not consume quota.
    const starterQuota = await getQuotaStatus(db, world.users.consumer.id);
    expect(starterQuota.used).toBe(0);
  });

  it("rejects an inactive deal, a non-RESCUE batch and insufficient stock", async () => {
    const world = await createWorld();
    const { fresh, rescue } = await setupShop(world);

    await db.orm.public.RescueDeal.where({ batchId: rescue.batch.id }).update({
      isActive: false,
    });
    await expect(
      createSinglePurchase({
        buyerId: world.users.consumer.id,
        batchId: rescue.batch.id,
        quantityKg: 1,
        source: "RESCUE",
      }),
    ).rejects.toMatchObject({ code: "DEAL_INACTIVE" });

    await db.orm.public.RescueDeal.where({ batchId: rescue.batch.id }).update({
      isActive: true,
    });
    await expect(
      createSinglePurchase({
        buyerId: world.users.consumer.id,
        batchId: fresh.batch.id,
        quantityKg: 1,
        source: "RESCUE",
      }),
    ).rejects.toMatchObject({ code: "DEAL_INACTIVE" });

    await expect(
      createSinglePurchase({
        buyerId: world.users.consumer.id,
        batchId: rescue.batch.id,
        quantityKg: 101,
        source: "RESCUE",
      }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });
  });

  it.each([0, -2, Number.NaN])("rejects an invalid quantity of %s", async (qty) => {
    const world = await createWorld();
    const { rescue } = await setupShop(world);

    await expect(
      createSinglePurchase({
        buyerId: world.users.consumer.id,
        batchId: rescue.batch.id,
        quantityKg: qty,
        source: "RESCUE",
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});

describe("createSinglePurchase (feed and residue)", () => {
  it("buys feed at the listing price with the feed impact multiplier", async () => {
    const world = await createWorld();
    const feedBatch = await createBatch({
      product: world.products.apple,
      warehouseId: world.warehouse.id,
      quantityKg: 50,
      status: "FEED",
      freshnessScore: 20,
    });
    await createFeedListing({
      batchId: feedBatch.batch.id,
      pricePerKg: 3000,
      availableKg: 50,
    });

    const result = await createSinglePurchase({
      buyerId: world.users.business.id,
      batchId: feedBatch.batch.id,
      quantityKg: 5,
      source: "FEED",
    });

    const order = await db.orm.public.Order.where({ code: result.code })
      .include("items")
      .include("impactLogs")
      .first();

    expect(order!.total).toBe(15_000);
    expect(order!.items[0]).toMatchObject({
      stage: "FEED",
      pricePerKg: 3000,
      lineTotal: 15_000,
    });
    expect(order!.impactLogs[0].co2eSavedKg).toBeCloseTo(5 * 1.1 * 0.7, 3);
    expect(order!.impactLogs[0].waterSavedLiters).toBeCloseTo(
      5 * 180 * 0.7,
      1,
    );
  });

  it("buys residue and rejects inactive listings", async () => {
    const world = await createWorld();
    const residueBatch = await createBatch({
      product: world.products.tomato,
      warehouseId: world.warehouse.id,
      quantityKg: 30,
      status: "RESIDUE",
      freshnessScore: 6,
    });
    const listing = await createResidueListing({
      batchId: residueBatch.batch.id,
      pricePerKg: 800,
      availableKg: 30,
    });

    const result = await createSinglePurchase({
      buyerId: world.users.business.id,
      batchId: residueBatch.batch.id,
      quantityKg: 3,
      source: "RESIDUE",
    });
    expect(result.paid).toBe(true);
    expect(
      (await db.orm.public.Order.where({ code: result.code }).first())!.total,
    ).toBe(2400);

    await db.orm.public.ResidueListing.where({ id: listing.id }).update({
      isActive: false,
    });
    await expect(
      createSinglePurchase({
        buyerId: world.users.business.id,
        batchId: residueBatch.batch.id,
        quantityKg: 1,
        source: "RESIDUE",
      }),
    ).rejects.toMatchObject({ code: "LISTING_INACTIVE" });
  });
});

describe("concurrent purchases", () => {
  it("sells the last kilogram to only one of two concurrent carts", async () => {
    const world = await createWorld();
    await createBuyerTier({ userId: world.users.consumer.id });
    const { fresh } = await setupShop(world);
    await db.orm.public.Batch.where({ id: fresh.batch.id }).update({
      quantityKg: 1,
      reservedKg: 0,
    });

    const attempts = await Promise.allSettled([
      createOrderFromCart({
        buyerId: world.users.consumer.id,
        lines: [{ batchId: fresh.batch.id, quantityKg: 1 }],
        deliveryAddress: ADDRESS,
        contactPhone: PHONE,
      }),
      createOrderFromCart({
        buyerId: world.users.consumer.id,
        lines: [{ batchId: fresh.batch.id, quantityKg: 1 }],
        deliveryAddress: ADDRESS,
        contactPhone: PHONE,
      }),
    ]);

    const fulfilled = attempts.filter((result) => result.status === "fulfilled");
    const rejected = attempts.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toMatchObject({
      code: "INSUFFICIENT_STOCK",
      status: 409,
    });

    const batch = await db.orm.public.Batch.where({ id: fresh.batch.id }).first();
    expect(batch!.reservedKg).toBe(1);
    expect(await db.orm.public.Order.all()).toHaveLength(1);
  });

  it("enforces the weekly quota across concurrent rescue purchases", async () => {
    const world = await createWorld();
    await createBuyerTier({
      userId: world.users.consumer.id,
      tier: "STARTER",
    });

    const rescueBatches = await Promise.all(
      [0, 1, 2].map(() =>
        createBatch({
          product: world.products.spinach,
          warehouseId: world.warehouse.id,
          quantityKg: 100,
          status: "RESCUE",
          freshnessScore: 57,
        }),
      ),
    );
    await Promise.all(
      rescueBatches.map((batch) =>
        createRescueDeal({
          batchId: batch.batch.id,
          rescuePricePerKg: 12000,
        }),
      ),
    );

    const attempts = await Promise.allSettled(
      rescueBatches.map((batch) =>
        createSinglePurchase({
          buyerId: world.users.consumer.id,
          batchId: batch.batch.id,
          quantityKg: 1,
          source: "RESCUE",
        }),
      ),
    );

    const fulfilled = attempts.filter((result) => result.status === "fulfilled");
    const rejected = attempts.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    expect(fulfilled).toHaveLength(2);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toMatchObject({
      code: "RESCUE_QUOTA_EXHAUSTED",
      status: 409,
    });

    const quota = await getQuotaStatus(db, world.users.consumer.id);
    expect(quota).toMatchObject({ limit: 2, used: 2, remaining: 0 });
    expect(await db.orm.public.Order.all()).toHaveLength(2);

    const reserved = await db.orm.public.Batch.all();
    expect(reserved.reduce((sum, batch) => sum + batch.reservedKg, 0)).toBe(2);
  });

  it("leaves no reservation or loyalty entry when any cart line is short", async () => {
    const world = await createWorld();
    await createBuyerTier({ userId: world.users.consumer.id });
    const { fresh } = await setupShop(world);
    const rice = await createBatch({
      product: world.products.rice,
      warehouseId: world.warehouse.id,
      quantityKg: 2,
      status: "FRESH",
      freshnessScore: 98,
    });

    await expect(
      createOrderFromCart({
        buyerId: world.users.consumer.id,
        lines: [
          { batchId: fresh.batch.id, quantityKg: 5 },
          { batchId: rice.batch.id, quantityKg: 5 },
        ],
        deliveryAddress: ADDRESS,
        contactPhone: PHONE,
      }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });

    expect(await db.orm.public.Order.all()).toHaveLength(0);
    expect(await db.orm.public.LoyaltyLedger.all()).toHaveLength(0);
    expect(
      (await db.orm.public.Batch.where({ id: fresh.batch.id }).first())!.reservedKg,
    ).toBe(0);
    expect(
      (await db.orm.public.Batch.where({ id: rice.batch.id }).first())!.reservedKg,
    ).toBe(0);
  });

  it("does not consume the rescue quota when the stock check fails", async () => {
    const world = await createWorld();
    await createBuyerTier({
      userId: world.users.consumer.id,
      tier: "STARTER",
    });
    const { rescue } = await setupShop(world);

    await expect(
      createSinglePurchase({
        buyerId: world.users.consumer.id,
        batchId: rescue.batch.id,
        quantityKg: 500,
        source: "RESCUE",
      }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });

    const quota = await getQuotaStatus(db, world.users.consumer.id);
    expect(quota).toMatchObject({ used: 0, remaining: 2 });
    expect(await db.orm.public.Order.all()).toHaveLength(0);
    expect(
      (await db.orm.public.Batch.where({ id: rescue.batch.id }).first())!.reservedKg,
    ).toBe(0);
  });
});

describe("createPreorder", () => {
  it("records a B2B pre-order, reserves stock and skips impact/loyalty", async () => {
    const world = await createWorld();
    const { fresh } = await setupShop(world);

    const result = await createPreorder({
      buyerId: world.users.business.id,
      batchId: fresh.batch.id,
      quantityKg: 20,
      scheduledFor: today(),
      recurrence: "WEEKLY",
      notes: "Kirim pagi",
    });

    const order = await db.orm.public.Order.where({ code: result.code })
      .include("items")
      .first();

    expect(order).toMatchObject({
      kind: "PREORDER",
      status: "PENDING",
      subtotal: 390_000,
      total: 390_000,
      scheduledFor: today(),
    });
    expect(order!.notes).toContain("Pesanan berulang: WEEKLY");
    expect(order!.notes).toContain("Kirim pagi");
    expect(order!.items[0]).toMatchObject({
      quantityKg: 20,
      pricePerKg: 19500,
      lineTotal: 390_000,
      stage: "FRESH",
    });
    expect(
      (await db.orm.public.Batch.where({ id: fresh.batch.id }).first())!.reservedKg,
    ).toBe(20);
    expect(await db.orm.public.ImpactLog.all()).toHaveLength(0);
    expect(await db.orm.public.LoyaltyLedger.all()).toHaveLength(0);
  });

  it("validates quantity and stock", async () => {
    const world = await createWorld();
    const { fresh } = await setupShop(world);

    await expect(
      createPreorder({
        buyerId: world.users.business.id,
        batchId: fresh.batch.id,
        quantityKg: 0,
        scheduledFor: today(),
        recurrence: "NONE",
      }),
    ).rejects.toMatchObject({ code: "INVALID_QTY" });

    await expect(
      createPreorder({
        buyerId: world.users.business.id,
        batchId: fresh.batch.id,
        quantityKg: 1000,
        scheduledFor: today(),
        recurrence: "NONE",
      }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });
  });

  it("omits the recurrence note when there is no recurrence or note", async () => {
    const world = await createWorld();
    const { fresh } = await setupShop(world);

    const result = await createPreorder({
      buyerId: world.users.business.id,
      batchId: fresh.batch.id,
      quantityKg: 1,
      scheduledFor: today(),
      recurrence: "NONE",
    });
    const order = await db.orm.public.Order.where({ code: result.code }).first();
    expect(order!.notes).toBeNull();
  });
});

describe("order and impact read models", () => {
  it("returns orders with items and impact for the buyer", async () => {
    const world = await createWorld();
    await createBuyerTier({ userId: world.users.consumer.id });
    const { fresh, rescue } = await setupShop(world);

    const cart = await createOrderFromCart({
      buyerId: world.users.consumer.id,
      lines: [{ batchId: fresh.batch.id, quantityKg: 10 }],
      deliveryAddress: ADDRESS,
      contactPhone: PHONE,
    });
    const single = await createSinglePurchase({
      buyerId: world.users.consumer.id,
      batchId: rescue.batch.id,
      quantityKg: 2,
      source: "RESCUE",
    });

    const orders = await getOrdersForUser(world.users.consumer.id, db);
    expect(orders).toHaveLength(2);
    const cartView = orders.find((order) => order.code === cart.code)!;
    const singleView = orders.find((order) => order.code === single.code)!;

    expect(cartView.items[0].productName).toBe("Tomat Servo");
    expect(cartView.impact.rescuedKg).toBe(10);
    expect(singleView.items[0].stage).toBe("RESCUE");
    expect(singleView.impact.rescuedKg).toBe(2);

    const detail = await getOrderByCode(cart.code, db);
    expect(detail?.buyer?.name).toBe("Sari");
    expect(detail?.items[0].batch?.product?.name).toBe("Tomat Servo");
  });

  it("aggregates impact for one buyer and for the platform", async () => {
    const world = await createWorld();
    await createBuyerTier({ userId: world.users.consumer.id });
    const { fresh, rescue } = await setupShop(world);

    await createOrderFromCart({
      buyerId: world.users.consumer.id,
      lines: [{ batchId: fresh.batch.id, quantityKg: 10 }],
      deliveryAddress: ADDRESS,
      contactPhone: PHONE,
    });
    await createSinglePurchase({
      buyerId: world.users.consumer.id,
      batchId: rescue.batch.id,
      quantityKg: 2,
      source: "RESCUE",
    });

    const buyerSummary = await getImpactSummary(db, world.users.consumer.id);
    expect(buyerSummary.totalTransactions).toBe(2);
    expect(buyerSummary.totalRescuedKg).toBe(12);
    expect(buyerSummary.totalCo2eSavedKg).toBeCloseTo(7.7, 3);
    expect(buyerSummary.totalWaterSavedLiters).toBeCloseTo(1210, 1);
    expect(buyerSummary.totalWasteDivertedKg).toBe(12);

    const platformSummary = await getImpactSummary(db);
    expect(platformSummary.totalTransactions).toBe(2);
    expect(platformSummary.totalBatchesProcessed).toBe(2);
    expect(platformSummary.statusCounts).toMatchObject({
      FRESH: 1,
      RESCUE: 1,
      FEED: 0,
      RESIDUE: 0,
      DISPOSED: 0,
    });
    expect(platformSummary.wasteDiversionRate).toBe(100);
  });

  it("computes cascade stats and waste diversion", async () => {
    const world = await createWorld();
    await createBatch({
      product: world.products.tomato,
      warehouseId: world.warehouse.id,
      status: "FRESH",
    });
    await createBatch({
      product: world.products.spinach,
      warehouseId: world.warehouse.id,
      status: "RESCUE",
    });
    await createBatch({
      product: world.products.apple,
      warehouseId: world.warehouse.id,
      status: "DISPOSED",
    });

    const stats = await getCascadeStats(db);
    expect(stats.totalBatches).toBe(3);
    expect(stats.statusCounts).toMatchObject({ FRESH: 1, RESCUE: 1, DISPOSED: 1 });
    expect(stats.wasteDiversionRate).toBeCloseTo(66.7, 1);
  });
});
