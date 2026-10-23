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

vi.mock("@/auth", () => ({
  auth: async () => (state.user ? { user: state.user } : null),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: {},
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, connection: async () => undefined };
});

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
}));

import { requireRole, requireSession } from "@/src/lib/auth/session";
import {
  BATCH_CREATE_ROLES,
  BATCH_DELETE_ROLES,
  BATCH_UPDATE_ROLES,
  BATCH_VIEW_ROLES,
  hasRole,
} from "@/src/lib/auth/roles";
import {
  ApiError,
  optionalApiUser,
  requireApiUser,
  userIdOf,
} from "@/src/lib/api/http";
import {
  canAccessBatch,
  getBatchById,
  getBatchesForUser,
} from "@/src/lib/batches/queries";

function sessionUser(
  id: number,
  role: UserRole,
  email = `${role.toLowerCase()}${id}@vesta.id`,
) {
  return { id: String(id), email, name: `${role} ${id}`, role };
}

beforeEach(async () => {
  state.user = null;
  await truncateAll();
});

afterAll(async () => {
  await closeTestResources();
});

describe("role matrices", () => {
  it("documents which roles may view, create, update and delete batches", () => {
    expect(BATCH_VIEW_ROLES).toEqual(["ADMIN", "PRODUCER", "WAREHOUSE"]);
    expect(BATCH_CREATE_ROLES).toEqual(["ADMIN", "PRODUCER"]);
    expect(BATCH_UPDATE_ROLES).toEqual(["ADMIN", "WAREHOUSE"]);
    expect(BATCH_DELETE_ROLES).toEqual(["ADMIN", "PRODUCER"]);
  });

  it("checks role membership", () => {
    expect(hasRole("ADMIN", BATCH_CREATE_ROLES)).toBe(true);
    expect(hasRole("CONSUMER", BATCH_CREATE_ROLES)).toBe(false);
    expect(hasRole("BUSINESS", BATCH_UPDATE_ROLES)).toBe(false);
  });
});

describe("requireSession / requireRole", () => {
  it("redirects anonymous visitors to /login", async () => {
    await expect(requireSession()).rejects.toMatchObject({ url: "/login" });
  });

  it("returns the authenticated session user", async () => {
    state.user = sessionUser(1, "ADMIN");
    await expect(requireSession()).resolves.toMatchObject({
      id: "1",
      role: "ADMIN",
    });
  });

  it("lets a permitted role through", async () => {
    state.user = sessionUser(1, "ADMIN");
    await expect(requireRole(BATCH_CREATE_ROLES)).resolves.toMatchObject({
      role: "ADMIN",
    });
  });

  it("redirects a role that is not permitted to /dashboard", async () => {
    state.user = sessionUser(4, "CONSUMER");
    await expect(requireRole(BATCH_VIEW_ROLES)).rejects.toMatchObject({
      url: "/dashboard",
    });
  });
});

describe("requireApiUser", () => {
  it("throws 401 when there is no session", async () => {
    await expect(requireApiUser()).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    });
  });

  it("throws 403 for a role outside the allow-list", async () => {
    state.user = sessionUser(4, "CONSUMER");
    await expect(requireApiUser(["ADMIN", "WAREHOUSE"])).rejects.toBeInstanceOf(
      ApiError,
    );
    await expect(requireApiUser(["ADMIN", "WAREHOUSE"])).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
  });

  it("returns the user when the role is allowed or no roles are required", async () => {
    state.user = sessionUser(3, "WAREHOUSE");

    await expect(requireApiUser(["ADMIN", "WAREHOUSE"])).resolves.toMatchObject({
      id: "3",
      role: "WAREHOUSE",
    });
    await expect(requireApiUser()).resolves.toMatchObject({ role: "WAREHOUSE" });
    await expect(optionalApiUser()).resolves.toMatchObject({ role: "WAREHOUSE" });
  });

  it("rejects malformed session ids", () => {
    expect(() => userIdOf({ ...sessionUser(1, "ADMIN"), id: "abc" })).toThrow(
      ApiError,
    );
    expect(userIdOf(sessionUser(1, "ADMIN"))).toBe(1);
  });
});

describe("batch access boundaries", () => {
  it("only lets the owning producer, assigned warehouse and admin read a batch", async () => {
    const world = await createWorld();
    const { batch } = await createBatch({
      product: world.products.tomato,
      warehouseId: world.warehouse.id,
    });
    const detail = await getBatchById(batch.id);
    expect(detail).not.toBeNull();

    expect(
      canAccessBatch(sessionUser(world.users.admin.id, "ADMIN"), detail!, world.producer.id),
    ).toBe(true);
    expect(
      canAccessBatch(
        sessionUser(world.users.producer.id, "PRODUCER"),
        detail!,
        world.producer.id,
      ),
    ).toBe(true);
    expect(
      canAccessBatch(
        sessionUser(world.users.otherProducer.id, "PRODUCER"),
        detail!,
        world.otherProducer.id,
      ),
    ).toBe(false);
    expect(
      canAccessBatch(
        sessionUser(world.users.warehouse.id, "WAREHOUSE"),
        detail!,
        null,
      ),
    ).toBe(true);
    expect(
      canAccessBatch(
        sessionUser(world.users.otherWarehouse.id, "WAREHOUSE"),
        detail!,
        null,
      ),
    ).toBe(false);
    expect(
      canAccessBatch(
        sessionUser(world.users.consumer.id, "CONSUMER"),
        detail!,
        null,
      ),
    ).toBe(false);
  });

  it("scopes the batch list per role", async () => {
    const world = await createWorld();
    const own = await createBatch({
      product: world.products.tomato,
      warehouseId: world.warehouse.id,
    });
    const foreign = await createBatch({
      product: world.products.otherTomato,
      warehouseId: world.otherWarehouse.id,
    });

    const adminBatches = await getBatchesForUser(
      sessionUser(world.users.admin.id, "ADMIN"),
    );
    const producerBatches = await getBatchesForUser(
      sessionUser(world.users.producer.id, "PRODUCER"),
    );
    const otherProducerBatches = await getBatchesForUser(
      sessionUser(world.users.otherProducer.id, "PRODUCER"),
    );
    const warehouseBatches = await getBatchesForUser(
      sessionUser(world.users.warehouse.id, "WAREHOUSE"),
    );
    const otherWarehouseBatches = await getBatchesForUser(
      sessionUser(world.users.otherWarehouse.id, "WAREHOUSE"),
    );
    const consumerBatches = await getBatchesForUser(
      sessionUser(world.users.consumer.id, "CONSUMER"),
    );

    expect(adminBatches.map((row) => row.id).sort()).toEqual(
      [own.batch.id, foreign.batch.id].sort(),
    );
    expect(producerBatches.map((row) => row.id)).toEqual([own.batch.id]);
    expect(otherProducerBatches.map((row) => row.id)).toEqual([foreign.batch.id]);
    expect(warehouseBatches.map((row) => row.id)).toEqual([own.batch.id]);
    expect(otherWarehouseBatches.map((row) => row.id)).toEqual([foreign.batch.id]);
    expect(consumerBatches).toEqual([]);
  });
});
