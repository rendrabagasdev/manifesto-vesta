import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { closeTestResources, truncateAll } from "./helpers/db";
import {
  createBatch,
  createWorld,
  daysAgo,
  daysAgoIso,
  today,
} from "./helpers/fixtures";
import type { UserRole } from "@/src/lib/auth/roles";

const { RedirectError, state } = vi.hoisted(() => {
  class RedirectError extends Error {
    constructor(readonly url: string) {
      super(`NEXT_REDIRECT:${url}`);
      this.name = "RedirectError";
    }
  }

  const state: {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
    } | null;
  } = { user: null };

  return { RedirectError, state };
});

vi.mock("@/src/lib/auth/session", () => ({
  requireSession: async () => {
    if (!state.user) throw new RedirectError("/login");
    return state.user;
  },
  requireRole: async (roles: readonly UserRole[]) => {
    if (!state.user) throw new RedirectError("/login");
    if (!roles.includes(state.user.role)) throw new RedirectError("/dashboard");
    return state.user;
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
}));

import { db } from "@/src/prisma/db";
import {
  createBatchAction,
  deleteBatchAction,
  updateBatchAction,
} from "@/app/dashboard/batches/actions";

function sessionUser(
  id: number,
  role: UserRole,
  email = `${role.toLowerCase()}@vesta.id`,
) {
  return { id: String(id), email, name: `${role} User`, role };
}

async function captureRedirect(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
  } catch (error) {
    if (error instanceof RedirectError) return error.url;
    throw error;
  }
  throw new Error("Fungsi seharusnya melakukan redirect");
}

function batchForm(overrides: Record<string, string> = {}): FormData {
  const form = new FormData();
  form.set("harvestDate", today());
  form.set("quantityKg", "50");
  form.set("storageTempC", "10");
  form.set("qualityNote", "Kondisi baik");
  for (const [key, value] of Object.entries(overrides)) {
    form.set(key, value);
  }
  return form;
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-23T00:00:00.000Z"));
  state.user = null;
  await truncateAll();
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(async () => {
  await closeTestResources();
});

describe("createBatchAction", () => {
  it("creates a batch with freshness score, cascade event and price breakdown", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.producer.id, "PRODUCER");

    const form = batchForm({
      productId: String(world.products.tomato.id),
      warehouseId: String(world.warehouse.id),
    });

    const url = await captureRedirect(() => createBatchAction({}, form));

    const batch = await db.orm.public.Batch.where({
      productId: world.products.tomato.id,
    })
      .include("priceBreakdown")
      .include("cascadeEvents")
      .first();

    expect(batch).not.toBeNull();
    expect(url).toBe(`/dashboard/batches/${batch!.id}`);
    expect(batch!.freshnessScore).toBe(100);
    expect(batch!.status).toBe("FRESH");
    expect(batch!.quantityKg).toBe(50);
    expect(batch!.code).toMatch(/^VST-\d{8}-[A-Z0-9]{6}$/);
    expect(batch!.priceBreakdown?.basePricePerKg).toBe(15000);
    expect(batch!.priceBreakdown?.finalPricePerKg).toBe(19500);
    expect(batch!.priceBreakdown?.rescueDiscountPct).toBe(0);
    expect(batch!.cascadeEvents).toHaveLength(1);
    expect(batch!.cascadeEvents[0].fromStatus).toBeNull();
    expect(batch!.cascadeEvents[0].toStatus).toBe("FRESH");
    expect(batch!.cascadeEvents[0].actorId).toBe(world.users.producer.id);
  });

  it("allows an admin to create a batch for any producer", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.admin.id, "ADMIN");

    const url = await captureRedirect(() =>
      createBatchAction(
        {},
        batchForm({
          productId: String(world.products.otherTomato.id),
          warehouseId: String(world.warehouse.id),
        }),
      ),
    );

    expect(url).toMatch(/^\/dashboard\/batches\/\d+$/);
  });

  it("blocks a producer from recording another producer's product", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.producer.id, "PRODUCER");

    const result = await createBatchAction(
      {},
      batchForm({
        productId: String(world.products.otherTomato.id),
        warehouseId: String(world.warehouse.id),
      }),
    );

    expect(result.error).toBe("Anda hanya dapat mencatat produk milik sendiri.");
    expect(await db.orm.public.Batch.all()).toHaveLength(0);
  });

  it("blocks roles that may not create batches", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.consumer.id, "CONSUMER");

    await expect(
      createBatchAction(
        {},
        batchForm({
          productId: String(world.products.tomato.id),
          warehouseId: String(world.warehouse.id),
        }),
      ),
    ).rejects.toMatchObject({ url: "/dashboard" });
  });

  it("rejects invalid form data before writing", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.producer.id, "PRODUCER");

    const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const result = await createBatchAction(
      {},
      batchForm({
        productId: String(world.products.tomato.id),
        warehouseId: String(world.warehouse.id),
        harvestDate: future,
        quantityKg: "-5",
        storageTempC: "100",
      }),
    );

    expect(result.error).toBe("Periksa kembali data batch.");
    expect(result.fieldErrors?.harvestDate).toBeDefined();
    expect(result.fieldErrors?.quantityKg).toBeDefined();
    expect(result.fieldErrors?.storageTempC).toBeDefined();
    expect(await db.orm.public.Batch.all()).toHaveLength(0);
  });

  it("rejects an unknown product or warehouse", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.producer.id, "PRODUCER");

    const missingProduct = await createBatchAction(
      {},
      batchForm({
        productId: "9999",
        warehouseId: String(world.warehouse.id),
      }),
    );
    expect(missingProduct.error).toBe("Produk tidak ditemukan.");

    const missingWarehouse = await createBatchAction(
      {},
      batchForm({
        productId: String(world.products.tomato.id),
        warehouseId: "9999",
      }),
    );
    expect(missingWarehouse.error).toBe("Gudang tidak ditemukan.");
  });
});

describe("updateBatchAction", () => {
  async function setupWarehouseBatch() {
    const world = await createWorld();
    const { batch } = await createBatch({
      product: world.products.tomato,
      warehouseId: world.warehouse.id,
      harvestDate: daysAgo(2),
      receivedAt: daysAgoIso(2),
      storageTempC: 10,
      status: "FRESH",
    });
    return { world, batch };
  }

  it("recalculates the score and transitions FRESH -> RESCUE when it gets warmer", async () => {
    const { world, batch } = await setupWarehouseBatch();
    state.user = sessionUser(world.users.warehouse.id, "WAREHOUSE");

    const form = new FormData();
    form.set("batchId", String(batch.id));
    form.set("storageTempC", "20");
    form.set("qualityNote", "Suhu naik");

    const result = await updateBatchAction({}, form);

    const updated = await db.orm.public.Batch.where({ id: batch.id })
      .include("priceBreakdown")
      .include("cascadeEvents", (events) =>
        events.orderBy((event) => event.createdAt.desc()),
      )
      .first();

    expect(result.error).toBeUndefined();
    expect(result.success).toContain("Rescue");
    expect(updated!.freshnessScore).toBe(53);
    expect(updated!.status).toBe("RESCUE");
    expect(updated!.storageTempC).toBe(20);
    expect(updated!.qualityNote).toBe("Suhu naik");
    expect(updated!.priceBreakdown?.rescueDiscountPct).toBe(35);
    expect(updated!.priceBreakdown?.finalPricePerKg).toBe(12675);
    expect(updated!.cascadeEvents[0].fromStatus).toBe("FRESH");
    expect(updated!.cascadeEvents[0].toStatus).toBe("RESCUE");
  });

  it("keeps the stage when the temperature change is small", async () => {
    const { world, batch } = await setupWarehouseBatch();
    state.user = sessionUser(world.users.warehouse.id, "WAREHOUSE");

    const form = new FormData();
    form.set("batchId", String(batch.id));
    form.set("storageTempC", "11");

    const result = await updateBatchAction({}, form);
    const updated = await db.orm.public.Batch.where({ id: batch.id })
      .include("cascadeEvents")
      .first();

    expect(result.success).toContain("tetap di tahap");
    expect(updated!.status).toBe("FRESH");
    expect(updated!.cascadeEvents).toHaveLength(1);
  });

  it("rejects a warehouse manager who does not own the batch", async () => {
    const { world, batch } = await setupWarehouseBatch();
    state.user = sessionUser(world.users.otherWarehouse.id, "WAREHOUSE");

    const form = new FormData();
    form.set("batchId", String(batch.id));
    form.set("storageTempC", "20");

    const result = await updateBatchAction({}, form);
    expect(result.error).toBe("Batch ini bukan tanggung jawab gudang Anda.");
  });

  it("lets an admin update any batch", async () => {
    const { world, batch } = await setupWarehouseBatch();
    state.user = sessionUser(world.users.admin.id, "ADMIN");

    const form = new FormData();
    form.set("batchId", String(batch.id));
    form.set("storageTempC", "20");

    const result = await updateBatchAction({}, form);
    expect(result.success).toContain("Rescue");
  });

  it("blocks producers from updating storage temperature", async () => {
    const { world, batch } = await setupWarehouseBatch();
    state.user = sessionUser(world.users.producer.id, "PRODUCER");

    const form = new FormData();
    form.set("batchId", String(batch.id));
    form.set("storageTempC", "20");

    await expect(updateBatchAction({}, form)).rejects.toMatchObject({
      url: "/dashboard",
    });
  });

  it("validates the temperature range and missing batch", async () => {
    const { world, batch } = await setupWarehouseBatch();
    state.user = sessionUser(world.users.warehouse.id, "WAREHOUSE");

    const invalid = new FormData();
    invalid.set("batchId", String(batch.id));
    invalid.set("storageTempC", "99");
    const invalidResult = await updateBatchAction({}, invalid);
    expect(invalidResult.fieldErrors?.storageTempC).toBeDefined();

    const missing = new FormData();
    missing.set("batchId", "9999");
    missing.set("storageTempC", "10");
    const missingResult = await updateBatchAction({}, missing);
    expect(missingResult.error).toBe("Batch atau relasinya tidak ditemukan.");
  });
});

describe("deleteBatchAction", () => {
  it("deletes an unclaimed batch owned by the producer", async () => {
    const world = await createWorld();
    const { batch } = await createBatch({
      product: world.products.tomato,
      warehouseId: world.warehouse.id,
    });
    state.user = sessionUser(world.users.producer.id, "PRODUCER");

    const form = new FormData();
    form.set("batchId", String(batch.id));

    const url = await captureRedirect(() => deleteBatchAction({}, form));
    expect(url).toBe("/dashboard/batches?dihapus=1");
    expect(await db.orm.public.Batch.where({ id: batch.id }).first()).toBeNull();
  });

  it("refuses to delete a batch that already has an order", async () => {
    const world = await createWorld();
    const { batch } = await createBatch({
      product: world.products.tomato,
      warehouseId: world.warehouse.id,
    });
    const order = await db.orm.public.Order.create({
      code: "ORD-DELETE-1",
      buyerId: world.users.consumer.id,
      subtotal: 19500,
      total: 19500,
      status: "PAID",
    });
    await db.orm.public.OrderItem.create({
      orderId: order.id,
      batchId: batch.id,
      quantityKg: 1,
      pricePerKg: 19500,
      lineTotal: 19500,
      stage: "FRESH",
    });

    state.user = sessionUser(world.users.producer.id, "PRODUCER");
    const form = new FormData();
    form.set("batchId", String(batch.id));

    const result = await deleteBatchAction({}, form);
    expect(result.error).toContain("sudah dipesan");
    expect(await db.orm.public.Batch.where({ id: batch.id }).first()).not.toBeNull();
  });

  it("refuses to delete a batch with impact logs", async () => {
    const world = await createWorld();
    const { batch } = await createBatch({
      product: world.products.tomato,
      warehouseId: world.warehouse.id,
    });
    await db.orm.public.ImpactLog.create({
      batchId: batch.id,
      rescuedKg: 1,
      co2eSavedKg: 0.5,
      waterSavedLiters: 10,
      wasteDivertedKg: 1,
    });

    state.user = sessionUser(world.users.producer.id, "PRODUCER");
    const form = new FormData();
    form.set("batchId", String(batch.id));

    const result = await deleteBatchAction({}, form);
    expect(result.error).toContain("catatan dampak");
  });

  it("blocks a producer from deleting another producer's batch", async () => {
    const world = await createWorld();
    const { batch } = await createBatch({
      product: world.products.otherTomato,
      warehouseId: world.warehouse.id,
    });
    state.user = sessionUser(world.users.producer.id, "PRODUCER");

    const form = new FormData();
    form.set("batchId", String(batch.id));

    const result = await deleteBatchAction({}, form);
    expect(result.error).toBe("Anda hanya dapat menghapus batch milik sendiri.");
  });

  it("lets an admin delete any batch", async () => {
    const world = await createWorld();
    const { batch } = await createBatch({
      product: world.products.otherTomato,
      warehouseId: world.warehouse.id,
    });
    state.user = sessionUser(world.users.admin.id, "ADMIN");

    const form = new FormData();
    form.set("batchId", String(batch.id));

    const url = await captureRedirect(() => deleteBatchAction({}, form));
    expect(url).toBe("/dashboard/batches?dihapus=1");
  });

  it("blocks warehouse and consumer roles", async () => {
    const world = await createWorld();
    const { batch } = await createBatch({
      product: world.products.tomato,
      warehouseId: world.warehouse.id,
    });

    for (const user of [world.users.warehouse, world.users.consumer]) {
      state.user = sessionUser(user.id, user.role as UserRole);
      const form = new FormData();
      form.set("batchId", String(batch.id));

      await expect(deleteBatchAction({}, form)).rejects.toMatchObject({
        url: "/dashboard",
      });
    }
  });

  it("validates the batch id", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.admin.id, "ADMIN");

    const form = new FormData();
    form.set("batchId", "not-a-number");

    const result = await deleteBatchAction({}, form);
    expect(result.error).toBe("Batch tidak valid.");
  });
});
