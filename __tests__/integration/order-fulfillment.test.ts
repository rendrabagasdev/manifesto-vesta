import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { closeTestResources, truncateAll } from "./helpers/db";
import { createBatch, createWorld, type TestWorld } from "./helpers/fixtures";
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

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
}));

import { db } from "@/src/prisma/db";
import { ApiError } from "@/src/lib/api/http";
import { createOrderFromCart, createPreorder } from "@/src/lib/orders/service";
import {
  completeOrder,
  getFulfillmentOrders,
  shipOrder,
} from "@/src/lib/orders/fulfillment";
import {
  completeOrderAction,
  shipOrderAction,
} from "@/app/dashboard/orders/actions";

const ADDRESS = "Jl. Cihampelas No. 45, Bandung";
const PHONE = "081234567890";

function sessionUser(id: number, role: UserRole) {
  return {
    id: String(id),
    email: `${role.toLowerCase()}${id}@vesta.id`,
    name: `${role} ${id}`,
    role,
  };
}

function fulfiller(id: number, role: UserRole) {
  return { id, role };
}

async function markOrderPaid(orderId: number) {
  await db.orm.public.Order.where({ id: orderId }).update({
    status: "PAID",
    paymentProvider: "DEMO",
    paidAt: new Date().toISOString(),
  });
}

async function paidOrderFor(
  world: TestWorld,
  options: { quantityKg?: number } = {},
) {
  const { batch } = await createBatch({
    product: world.products.tomato,
    warehouseId: world.warehouse.id,
    quantityKg: 50,
    status: "FRESH",
    freshnessScore: 98,
  });

  const purchase = await createOrderFromCart({
    buyerId: world.users.consumer.id,
    lines: [{ batchId: batch.id, quantityKg: options.quantityKg ?? 10 }],
    deliveryAddress: ADDRESS,
    contactPhone: PHONE,
  });

  const order = await db.orm.public.Order.where({ code: purchase.code }).first();
  if (!order) throw new Error("Order fixture gagal dibuat");

  // Cart checkout is COD and starts PENDING; shipping tests need a paid order.
  await markOrderPaid(order.id);

  return {
    batch,
    order: (await db.orm.public.Order.where({ id: order.id }).first())!,
  };
}

async function expectApiError(
  work: Promise<unknown>,
  code: string,
): Promise<ApiError> {
  try {
    await work;
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe(code);
    return error as ApiError;
  }
  throw new Error(`Seharusnya gagal dengan ${code}`);
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

function actionForm(orderId: number): FormData {
  const form = new FormData();
  form.set("orderId", String(orderId));
  return form;
}

beforeEach(async () => {
  state.user = null;
  await truncateAll();
});

afterAll(async () => {
  await closeTestResources();
});

describe("shipOrder", () => {
  it("releases the reservation and decrements stock for the managed warehouse", async () => {
    const world = await createWorld();
    const { batch, order } = await paidOrderFor(world);

    const result = await shipOrder(
      fulfiller(world.users.warehouse.id, "WAREHOUSE"),
      order.id,
    );

    expect(result.code).toBe(order.code);

    const shipped = await db.orm.public.Order.where({ id: order.id }).first();
    expect(shipped!.status).toBe("SHIPPED");

    const stock = await db.orm.public.Batch.where({ id: batch.id }).first();
    expect(stock!.quantityKg).toBe(40);
    expect(stock!.reservedKg).toBe(0);
  });

  it("blocks a warehouse that does not manage the batch without touching stock", async () => {
    const world = await createWorld();
    const { batch, order } = await paidOrderFor(world);

    await expectApiError(
      shipOrder(fulfiller(world.users.otherWarehouse.id, "WAREHOUSE"), order.id),
      "ORDER_OUT_OF_SCOPE",
    );

    const untouched = await db.orm.public.Batch.where({ id: batch.id }).first();
    expect(untouched!.quantityKg).toBe(50);
    expect(untouched!.reservedKg).toBe(10);
    expect(
      (await db.orm.public.Order.where({ id: order.id }).first())!.status,
    ).toBe("PAID");
  });

  it("lets an admin ship orders from any warehouse", async () => {
    const world = await createWorld();
    const { batch, order } = await paidOrderFor(world);

    await shipOrder(fulfiller(world.users.admin.id, "ADMIN"), order.id);

    const stock = await db.orm.public.Batch.where({ id: batch.id }).first();
    expect(stock!.quantityKg).toBe(40);
    expect(stock!.reservedKg).toBe(0);
  });

  it("refuses unpaid preorders", async () => {
    const world = await createWorld();
    const { batch } = await createBatch({
      product: world.products.rice,
      warehouseId: world.warehouse.id,
      quantityKg: 50,
      status: "FRESH",
      freshnessScore: 98,
    });

    const preorder = await createPreorder({
      buyerId: world.users.business.id,
      batchId: batch.id,
      quantityKg: 10,
      scheduledFor: "2026-11-01",
      recurrence: "NONE",
    });
    const order = await db.orm.public.Order.where({ code: preorder.code }).first();

    await expectApiError(
      shipOrder(
        fulfiller(world.users.warehouse.id, "WAREHOUSE"),
        order!.id,
      ),
      "ORDER_NOT_PAID",
    );

    const stock = await db.orm.public.Batch.where({ id: batch.id }).first();
    expect(stock!.quantityKg).toBe(50);
    expect(stock!.reservedKg).toBe(10);
  });

  it("cannot ship the same order twice", async () => {
    const world = await createWorld();
    const { batch, order } = await paidOrderFor(world);
    const staff = fulfiller(world.users.warehouse.id, "WAREHOUSE");

    await shipOrder(staff, order.id);
    await expectApiError(shipOrder(staff, order.id), "ORDER_ALREADY_SHIPPED");

    const stock = await db.orm.public.Batch.where({ id: batch.id }).first();
    expect(stock!.quantityKg).toBe(40);
    expect(stock!.reservedKg).toBe(0);
  });

  it("serializes concurrent ship attempts and releases stock once", async () => {
    const world = await createWorld();
    const { batch, order } = await paidOrderFor(world);
    const staff = fulfiller(world.users.warehouse.id, "WAREHOUSE");

    const results = await Promise.allSettled([
      shipOrder(staff, order.id),
      shipOrder(staff, order.id),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter(
      (result): result is PromiseRejectedResult =>
        result.status === "rejected",
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0].reason as ApiError).code).toBe("ORDER_ALREADY_SHIPPED");

    const stock = await db.orm.public.Batch.where({ id: batch.id }).first();
    expect(stock!.quantityKg).toBe(40);
    expect(stock!.reservedKg).toBe(0);
  });

  it("rejects mixed-warehouse orders for warehouse staff but allows admin", async () => {
    const world = await createWorld();
    const { batch: ownBatch } = await createBatch({
      product: world.products.tomato,
      warehouseId: world.warehouse.id,
      quantityKg: 50,
      status: "FRESH",
      freshnessScore: 98,
    });
    const { batch: foreignBatch } = await createBatch({
      product: world.products.rice,
      warehouseId: world.otherWarehouse.id,
      quantityKg: 50,
      status: "FRESH",
      freshnessScore: 98,
    });

    const purchase = await createOrderFromCart({
      buyerId: world.users.consumer.id,
      lines: [
        { batchId: ownBatch.id, quantityKg: 4 },
        { batchId: foreignBatch.id, quantityKg: 6 },
      ],
      deliveryAddress: ADDRESS,
      contactPhone: PHONE,
    });
    const order = await db.orm.public.Order.where({ code: purchase.code }).first();
    await markOrderPaid(order!.id);

    await expectApiError(
      shipOrder(
        fulfiller(world.users.warehouse.id, "WAREHOUSE"),
        order!.id,
      ),
      "ORDER_OUT_OF_SCOPE",
    );

    for (const id of [ownBatch.id, foreignBatch.id]) {
      const stock = await db.orm.public.Batch.where({ id }).first();
      expect(stock!.quantityKg).toBe(50);
      expect(stock!.reservedKg).toBe(id === ownBatch.id ? 4 : 6);
    }

    await shipOrder(fulfiller(world.users.admin.id, "ADMIN"), order!.id);

    const ownStock = await db.orm.public.Batch.where({ id: ownBatch.id }).first();
    const foreignStock = await db.orm.public.Batch.where({
      id: foreignBatch.id,
    }).first();
    expect(ownStock!.quantityKg).toBe(46);
    expect(ownStock!.reservedKg).toBe(0);
    expect(foreignStock!.quantityKg).toBe(44);
    expect(foreignStock!.reservedKg).toBe(0);
  });
});

describe("completeOrder", () => {
  it("requires the order to be shipped first", async () => {
    const world = await createWorld();
    const { order } = await paidOrderFor(world);

    await expectApiError(
      completeOrder(
        fulfiller(world.users.warehouse.id, "WAREHOUSE"),
        order.id,
      ),
      "ORDER_NOT_SHIPPED",
    );
  });

  it("completes a shipped order without changing stock again", async () => {
    const world = await createWorld();
    const { batch, order } = await paidOrderFor(world);
    const staff = fulfiller(world.users.warehouse.id, "WAREHOUSE");

    await shipOrder(staff, order.id);
    const result = await completeOrder(staff, order.id);

    expect(result.code).toBe(order.code);
    expect(
      (await db.orm.public.Order.where({ id: order.id }).first())!.status,
    ).toBe("COMPLETED");

    const stock = await db.orm.public.Batch.where({ id: batch.id }).first();
    expect(stock!.quantityKg).toBe(40);
    expect(stock!.reservedKg).toBe(0);
  });

  it("enforces warehouse scope for completion", async () => {
    const world = await createWorld();
    const { order } = await paidOrderFor(world);
    await shipOrder(fulfiller(world.users.warehouse.id, "WAREHOUSE"), order.id);

    await expectApiError(
      completeOrder(
        fulfiller(world.users.otherWarehouse.id, "WAREHOUSE"),
        order.id,
      ),
      "ORDER_OUT_OF_SCOPE",
    );
    expect(
      (await db.orm.public.Order.where({ id: order.id }).first())!.status,
    ).toBe("SHIPPED");
  });
});

describe("getFulfillmentOrders", () => {
  it("scopes the queue to managed warehouses and includes shipped orders", async () => {
    const world = await createWorld();
    const own = await paidOrderFor(world);

    const { batch: foreignBatch } = await createBatch({
      product: world.products.rice,
      warehouseId: world.otherWarehouse.id,
      quantityKg: 30,
      status: "FRESH",
      freshnessScore: 98,
    });
    const foreignPurchase = await createOrderFromCart({
      buyerId: world.users.consumer.id,
      lines: [{ batchId: foreignBatch.id, quantityKg: 5 }],
      deliveryAddress: ADDRESS,
      contactPhone: PHONE,
    });
    const foreignOrder = await db.orm.public.Order.where({
      code: foreignPurchase.code,
    }).first();
    await markOrderPaid(foreignOrder!.id);

    const adminQueue = await getFulfillmentOrders(
      fulfiller(world.users.admin.id, "ADMIN"),
    );
    expect(adminQueue.map((entry) => entry.code).sort()).toEqual(
      [own.order.code, foreignOrder!.code].sort(),
    );

    const warehouseQueue = await getFulfillmentOrders(
      fulfiller(world.users.warehouse.id, "WAREHOUSE"),
    );
    expect(warehouseQueue.map((entry) => entry.code)).toEqual([own.order.code]);
    expect(warehouseQueue[0].items[0]).toMatchObject({
      batchId: own.batch.id,
      warehouseId: world.warehouse.id,
      quantityKg: 10,
    });

    await shipOrder(fulfiller(world.users.warehouse.id, "WAREHOUSE"), own.order.id);

    const afterShip = await getFulfillmentOrders(
      fulfiller(world.users.warehouse.id, "WAREHOUSE"),
    );
    expect(afterShip.map((entry) => [entry.code, entry.status])).toEqual([
      [own.order.code, "SHIPPED"],
    ]);
  });

  it("returns an empty queue for roles that cannot fulfill", async () => {
    const world = await createWorld();
    const queue = await getFulfillmentOrders(
      fulfiller(world.users.consumer.id, "CONSUMER"),
    );
    expect(queue).toEqual([]);
  });
});

describe("fulfillment actions", () => {
  it("rejects buyers and anonymous sessions", async () => {
    const world = await createWorld();
    const { order } = await paidOrderFor(world);

    expect(await captureRedirect(() => shipOrderAction({}, actionForm(order.id)))).toBe(
      "/login",
    );

    state.user = sessionUser(world.users.consumer.id, "CONSUMER");
    expect(await captureRedirect(() => shipOrderAction({}, actionForm(order.id)))).toBe(
      "/dashboard",
    );
  });

  it("ships and completes through the server actions", async () => {
    const world = await createWorld();
    const { batch, order } = await paidOrderFor(world);
    state.user = sessionUser(world.users.warehouse.id, "WAREHOUSE");

    const shipResult = await shipOrderAction({}, actionForm(order.id));
    expect(shipResult.success).toContain(order.code);
    expect(shipResult.error).toBeUndefined();

    const completeResult = await completeOrderAction({}, actionForm(order.id));
    expect(completeResult.success).toContain(order.code);

    const finalOrder = await db.orm.public.Order.where({ id: order.id }).first();
    expect(finalOrder!.status).toBe("COMPLETED");

    const stock = await db.orm.public.Batch.where({ id: batch.id }).first();
    expect(stock!.quantityKg).toBe(40);
    expect(stock!.reservedKg).toBe(0);
  });

  it("returns a readable error for an invalid order id", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.warehouse.id, "WAREHOUSE");

    const form = new FormData();
    form.set("orderId", "abc");
    const result = await completeOrderAction({}, form);
    expect(result).toEqual({ error: "Pesanan tidak valid." });
  });
});
