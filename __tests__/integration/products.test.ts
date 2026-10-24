import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { closeTestResources, truncateAll } from "./helpers/db";
import { createBatch, createWorld } from "./helpers/fixtures";
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
import {
  createProductAction,
  deleteProductAction,
  updateProductAction,
} from "@/app/dashboard/products/actions";

function sessionUser(id: number, role: UserRole) {
  return {
    id: String(id),
    email: `${role.toLowerCase()}${id}@vesta.id`,
    name: `${role} ${id}`,
    role,
  };
}

function productForm(overrides: Record<string, string> = {}): FormData {
  const form = new FormData();
  form.set("name", "Wortel Lembang");
  form.set("category", "VEGETABLE");
  form.set("unit", "kg");
  form.set("shelfLifeDays", "10");
  form.set("idealTempC", "8");
  form.set("basePricePerKg", "12000");
  form.set("description", "Wortel manis");
  for (const [key, value] of Object.entries(overrides)) {
    form.set(key, value);
  }
  return form;
}

beforeEach(async () => {
  state.user = null;
  await truncateAll();
});

afterAll(async () => {
  await closeTestResources();
});

describe("createProductAction", () => {
  it("creates a product for the signed-in producer and ignores producerId input", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.producer.id, "PRODUCER");

    const form = productForm({
      producerId: String(world.otherProducer.id),
    });
    const result = await createProductAction({}, form);

    expect(result.success).toContain("Wortel Lembang");

    const product = await db.orm.public.Product.where({
      name: "Wortel Lembang",
    }).first();
    expect(product).toMatchObject({
      producerId: world.producer.id,
      category: "VEGETABLE",
      unit: "kg",
      shelfLifeDays: 10,
      idealTempC: 8,
      basePricePerKg: 12_000,
      description: "Wortel manis",
    });
  });

  it("lets an admin create a product for a chosen producer", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.admin.id, "ADMIN");

    const result = await createProductAction(
      {},
      productForm({
        producerId: String(world.otherProducer.id),
        name: "Jagung Manis",
        category: "STAPLE",
      }),
    );

    expect(result.success).toContain("Jagung Manis");
    const product = await db.orm.public.Product.where({
      name: "Jagung Manis",
    }).first();
    expect(product!.producerId).toBe(world.otherProducer.id);
  });

  it("requires an admin to pick a producer", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.admin.id, "ADMIN");

    const result = await createProductAction({}, productForm());

    expect(result.error).toContain("Pilih produsen");
    expect(await db.orm.public.Product.where({ name: "Wortel Lembang" }).first())
      .toBeNull();
  });

  it("rejects invalid base prices", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.producer.id, "PRODUCER");

    const result = await createProductAction(
      {},
      productForm({ basePricePerKg: "0" }),
    );

    expect(result.fieldErrors?.basePricePerKg?.[0]).toContain("minimal");
  });
});

describe("updateProductAction", () => {
  it("updates the producer's own product", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.producer.id, "PRODUCER");

    const result = await updateProductAction(
      {},
      productForm({
        productId: String(world.products.tomato.id),
        name: "Tomat Servo Premium",
        basePricePerKg: "17500",
      }),
    );

    expect(result.success).toContain("Tomat Servo Premium");
    const product = await db.orm.public.Product.where({
      id: world.products.tomato.id,
    }).first();
    expect(product).toMatchObject({
      name: "Tomat Servo Premium",
      basePricePerKg: 17_500,
    });
  });

  it("blocks a producer from editing another producer's product", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.otherProducer.id, "PRODUCER");

    const result = await updateProductAction(
      {},
      productForm({
        productId: String(world.products.tomato.id),
        name: "Diambil Alih",
      }),
    );

    expect(result.error).toContain("kebun sendiri");
    const product = await db.orm.public.Product.where({
      id: world.products.tomato.id,
    }).first();
    expect(product!.name).toBe("Tomat Servo");
  });

  it("lets an admin edit any product", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.admin.id, "ADMIN");

    const result = await updateProductAction(
      {},
      productForm({
        productId: String(world.products.tomato.id),
        basePricePerKg: "16000",
      }),
    );

    expect(result.success).toBeTruthy();
    const product = await db.orm.public.Product.where({
      id: world.products.tomato.id,
    }).first();
    expect(product!.basePricePerKg).toBe(16_000);
  });
});

describe("deleteProductAction", () => {
  it("blocks deletion while batches still reference the product", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.producer.id, "PRODUCER");
    await createBatch({
      product: world.products.tomato,
      warehouseId: world.warehouse.id,
    });

    const result = await deleteProductAction(
      {},
      productForm({ productId: String(world.products.tomato.id) }),
    );

    expect(result.error).toContain("masih dipakai");
    expect(
      await db.orm.public.Product.where({ id: world.products.tomato.id }).first(),
    ).not.toBeNull();
  });

  it("deletes an unused product and enforces ownership", async () => {
    const world = await createWorld();
    const unused = await db.orm.public.Product.create({
      producerId: world.producer.id,
      name: "Produk Uji",
      category: "OTHER",
      shelfLifeDays: 5,
      idealTempC: 10,
      basePricePerKg: 5000,
    });

    state.user = sessionUser(world.users.otherProducer.id, "PRODUCER");
    const blocked = await deleteProductAction(
      {},
      productForm({ productId: String(unused.id) }),
    );
    expect(blocked.error).toContain("kebun sendiri");

    state.user = sessionUser(world.users.producer.id, "PRODUCER");
    const result = await deleteProductAction(
      {},
      productForm({ productId: String(unused.id) }),
    );

    expect(result.success).toContain("Produk Uji");
    expect(await db.orm.public.Product.where({ id: unused.id }).first()).toBeNull();
  });
});
