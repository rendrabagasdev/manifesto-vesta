import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { db } from "@/src/prisma/db";
import {
  createWarehouseAction,
  deleteWarehouseAction,
  updateWarehouseAction,
} from "@/app/dashboard/admin/warehouses/actions";

function sessionUser(
  id: number,
  role: UserRole,
  email = `${role.toLowerCase()}@vesta.id`,
) {
  return { id: String(id), email, name: `${role} User`, role };
}

function warehouseForm(overrides: Record<string, string> = {}): FormData {
  const form = new FormData();
  form.set("name", "Gudang Baru");
  form.set("address", "Jl. Baru No. 3");
  form.set("city", "Bandung");
  form.set("capacityKg", "2500");
  form.set("managerId", "");
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

describe("warehouse CRUD", () => {
  it("rejects non-admin users", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.producer.id, "PRODUCER");

    await expect(createWarehouseAction({}, warehouseForm())).rejects.toThrow(
      "NEXT_REDIRECT:/dashboard",
    );
  });

  it("creates a warehouse with a warehouse-role manager", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.admin.id, "ADMIN");

    const result = await createWarehouseAction(
      {},
      warehouseForm({ managerId: String(world.users.warehouse.id) }),
    );

    expect(result.success).toContain("Gudang Baru");

    const warehouse = await db.orm.public.Warehouse.where({
      name: "Gudang Baru",
    }).first();

    expect(warehouse).not.toBeNull();
    expect(warehouse!.city).toBe("Bandung");
    expect(warehouse!.address).toBe("Jl. Baru No. 3");
    expect(warehouse!.capacityKg).toBe(2500);
    expect(warehouse!.managerId).toBe(world.users.warehouse.id);
  });

  it("rejects a manager that does not have the WAREHOUSE role", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.admin.id, "ADMIN");

    const result = await createWarehouseAction(
      {},
      warehouseForm({ managerId: String(world.users.consumer.id) }),
    );

    expect(result.error).toContain("peran Gudang");
    expect(result.fieldErrors?.managerId?.[0]).toBeDefined();

    const warehouse = await db.orm.public.Warehouse.where({
      name: "Gudang Baru",
    }).first();
    expect(warehouse).toBeNull();
  });

  it("returns field errors for invalid input", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.admin.id, "ADMIN");

    const result = await createWarehouseAction(
      {},
      warehouseForm({ name: "A", capacityKg: "0" }),
    );

    expect(result.error).toBeDefined();
    expect(result.fieldErrors?.name?.[0]).toContain("minimal 2 karakter");
    expect(result.fieldErrors?.capacityKg?.[0]).toContain("lebih dari 0");
  });

  it("updates a warehouse and clears its manager", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.admin.id, "ADMIN");

    const result = await updateWarehouseAction({}, warehouseForm({
      warehouseId: String(world.otherWarehouse.id),
      name: "Gudang Cimahi Baru",
      city: "Cimahi",
      capacityKg: "1800",
      managerId: "",
    }));

    expect(result.success).toContain("Gudang Cimahi Baru");

    const warehouse = await db.orm.public.Warehouse.where({
      id: world.otherWarehouse.id,
    }).first();

    expect(warehouse!.name).toBe("Gudang Cimahi Baru");
    expect(warehouse!.city).toBe("Cimahi");
    expect(warehouse!.capacityKg).toBe(1800);
    expect(warehouse!.managerId).toBeNull();
  });

  it("blocks deleting a warehouse that still stores batches", async () => {
    const world = await createWorld();
    await createBatch({
      product: world.products.tomato,
      warehouseId: world.warehouse.id,
    });
    state.user = sessionUser(world.users.admin.id, "ADMIN");

    const form = new FormData();
    form.set("warehouseId", String(world.warehouse.id));

    const result = await deleteWarehouseAction({}, form);

    expect(result.error).toContain("batch");

    const warehouse = await db.orm.public.Warehouse.where({
      id: world.warehouse.id,
    }).first();
    expect(warehouse).not.toBeNull();
  });

  it("deletes an empty warehouse", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.admin.id, "ADMIN");

    const form = new FormData();
    form.set("warehouseId", String(world.otherWarehouse.id));

    const result = await deleteWarehouseAction({}, form);

    expect(result.success).toContain("Gudang Cadangan");

    const warehouse = await db.orm.public.Warehouse.where({
      id: world.otherWarehouse.id,
    }).first();
    expect(warehouse).toBeNull();
  });
});
