import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
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

import { db } from "@/src/prisma/db";
import {
  buyListingAction,
  buyRescueDealAction,
  checkoutAction,
  notifyMeAction,
  preorderAction,
} from "@/app/(shop)/actions";

const ADDRESS = "Jl. Cihampelas No. 45, Bandung";
const PHONE = "081234567890";

function sessionUser(id: number, role: UserRole, name = "Sari") {
  return { id: String(id), email: `${role.toLowerCase()}@vesta.id`, name, role };
}

function checkoutForm(cart: unknown, overrides: Record<string, string> = {}) {
  const form = new FormData();
  form.set("cart", typeof cart === "string" ? cart : JSON.stringify(cart));
  form.set("deliveryAddress", ADDRESS);
  form.set("deliveryCity", "bandung");
  form.set("deliveryMethod", "INSTANT");
  form.set("contactPhone", PHONE);
  for (const [key, value] of Object.entries(overrides)) form.set(key, value);
  return form;
}

beforeEach(async () => {
  state.user = null;
  await truncateAll();
});

afterAll(async () => {
  await closeTestResources();
});

describe("checkoutAction", () => {
  it("checks out a cart and reports demo payment success", async () => {
    const world = await createWorld();
    await createBuyerTier({ userId: world.users.consumer.id });
    state.user = sessionUser(world.users.consumer.id, "CONSUMER");

    const { batch } = await createBatch({
      product: world.products.tomato,
      warehouseId: world.warehouse.id,
      quantityKg: 100,
      status: "FRESH",
      freshnessScore: 95,
    });

    const result = await checkoutAction(
      { ok: false },
      checkoutForm([{ batchId: batch.id, quantityKg: 2 }]),
    );

    expect(result.ok).toBe(true);
    expect(result.code).toMatch(/^ORD-/);
    expect(result.message).toContain("demo berhasil");
    expect(await db.orm.public.Order.all()).toHaveLength(1);
  });

  it("rejects malformed cart JSON", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.consumer.id, "CONSUMER");

    const result = await checkoutAction({ ok: false }, checkoutForm("{not-json"));
    expect(result).toEqual({
      ok: false,
      error: "Data keranjang tidak valid.",
    });
  });

  it("validates the delivery address and phone", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.consumer.id, "CONSUMER");

    const result = await checkoutAction(
      { ok: false },
      checkoutForm([{ batchId: 1, quantityKg: 1 }], {
        deliveryAddress: "short",
        contactPhone: "123",
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Alamat pengiriman minimal 10 karakter.");
  });

  it("rejects a delivery method that does not serve the destination", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.consumer.id, "CONSUMER");

    const { batch } = await createBatch({
      product: world.products.tomato,
      warehouseId: world.warehouse.id,
      quantityKg: 100,
      status: "FRESH",
      freshnessScore: 95,
    });

    const result = await checkoutAction(
      { ok: false },
      checkoutForm([{ batchId: batch.id, quantityKg: 2 }], {
        deliveryCity: "jakarta",
        deliveryMethod: "INSTANT",
      }),
    );

    expect(result).toEqual({
      ok: false,
      error: "Metode Instan tidak tersedia untuk Jakarta.",
    });
    expect(await db.orm.public.Order.all()).toHaveLength(0);
  });

  it("surfaces ApiError messages from the order service", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.consumer.id, "CONSUMER");

    const result = await checkoutAction(
      { ok: false },
      checkoutForm([{ batchId: 9999, quantityKg: 1 }]),
    );

    expect(result).toEqual({
      ok: false,
      error: "Batch tidak ditemukan atau belum memiliki harga.",
    });
  });

  it("redirects unauthenticated callers", async () => {
    await expect(
      checkoutAction({ ok: false }, checkoutForm([{ batchId: 1, quantityKg: 1 }])),
    ).rejects.toMatchObject({ url: "/login" });
  });
});

describe("buyRescueDealAction", () => {
  it("buys a rescue deal for the session user", async () => {
    const world = await createWorld();
    await createBuyerTier({ userId: world.users.consumer.id });
    state.user = sessionUser(world.users.consumer.id, "CONSUMER");

    const { batch } = await createBatch({
      product: world.products.spinach,
      warehouseId: world.warehouse.id,
      status: "RESCUE",
      freshnessScore: 57,
    });
    await createRescueDeal({
      batchId: batch.id,
      rescuePricePerKg: 12000,
    });

    const form = new FormData();
    form.set("batchId", String(batch.id));
    form.set("quantityKg", "1");
    form.set("contactPhone", PHONE);

    const result = await buyRescueDealAction({ ok: false }, form);
    expect(result.ok).toBe(true);
    expect(result.message).toContain("Penawaran diskon dibeli");
  });

  it("validates the quantity and reports locked deals", async () => {
    const world = await createWorld();
    await createBuyerTier({ userId: world.users.consumer.id, tier: "STARTER" });
    state.user = sessionUser(world.users.consumer.id, "CONSUMER");

    const { batch } = await createBatch({
      product: world.products.spinach,
      warehouseId: world.warehouse.id,
      status: "RESCUE",
      freshnessScore: 57,
    });
    await createRescueDeal({
      batchId: batch.id,
      rescuePricePerKg: 12000,
      startsAt: hoursFromNowIso(4),
      endsAt: hoursFromNowIso(28),
    });

    const invalid = new FormData();
    invalid.set("batchId", String(batch.id));
    invalid.set("quantityKg", "0");
    expect((await buyRescueDealAction({ ok: false }, invalid)).ok).toBe(false);

    const locked = new FormData();
    locked.set("batchId", String(batch.id));
    locked.set("quantityKg", "1");
    const lockedResult = await buyRescueDealAction({ ok: false }, locked);
    expect(lockedResult.ok).toBe(false);
    expect(lockedResult.error).toContain("belum bisa Anda akses");
  });
});

describe("buyListingAction", () => {
  it("buys a feed listing by listing id", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.business.id, "BUSINESS", "Resto");

    const { batch } = await createBatch({
      product: world.products.apple,
      warehouseId: world.warehouse.id,
      quantityKg: 50,
      status: "FEED",
      freshnessScore: 20,
    });
    const listing = await createFeedListing({
      batchId: batch.id,
      pricePerKg: 3000,
      availableKg: 50,
    });

    const form = new FormData();
    form.set("listingId", String(listing.id));
    form.set("source", "FEED");
    form.set("quantityKg", "2");

    const result = await buyListingAction({ ok: false }, form);
    expect(result.ok).toBe(true);
    expect(result.code).toMatch(/^ORD-/);
  });

  it("buys a residue listing by listing id", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.business.id, "BUSINESS", "Resto");

    const { batch } = await createBatch({
      product: world.products.tomato,
      warehouseId: world.warehouse.id,
      quantityKg: 30,
      status: "RESIDUE",
      freshnessScore: 6,
    });
    const listing = await createResidueListing({
      batchId: batch.id,
      pricePerKg: 800,
      availableKg: 30,
    });

    const form = new FormData();
    form.set("listingId", String(listing.id));
    form.set("source", "RESIDUE");
    form.set("quantityKg", "1");

    const result = await buyListingAction({ ok: false }, form);
    expect(result.ok).toBe(true);
  });

  it("reports missing listings and invalid sources", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.business.id, "BUSINESS", "Resto");

    const missing = new FormData();
    missing.set("listingId", "9999");
    missing.set("source", "FEED");
    missing.set("quantityKg", "1");
    expect(await buyListingAction({ ok: false }, missing)).toEqual({
      ok: false,
      error: "Listing tidak ditemukan.",
    });

    const invalid = new FormData();
    invalid.set("listingId", "1");
    invalid.set("source", "FRESH");
    invalid.set("quantityKg", "1");
    expect((await buyListingAction({ ok: false }, invalid)).ok).toBe(false);
  });
});

describe("preorderAction", () => {
  it("creates a B2B pre-order", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.business.id, "BUSINESS", "Resto");

    const { batch } = await createBatch({
      product: world.products.tomato,
      warehouseId: world.warehouse.id,
      quantityKg: 100,
      status: "FRESH",
      freshnessScore: 95,
    });

    const form = new FormData();
    form.set("batchId", String(batch.id));
    form.set("quantityKg", "20");
    form.set("scheduledFor", today());
    form.set("recurrence", "WEEKLY");
    form.set("notes", "Kirim pagi");

    const result = await preorderAction({ ok: false }, form);
    expect(result.ok).toBe(true);
    expect(result.message).toContain("tercatat");
  });

  it("validates the schedule and recurrence", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.business.id, "BUSINESS", "Resto");

    const badDate = new FormData();
    badDate.set("batchId", "1");
    badDate.set("quantityKg", "1");
    badDate.set("scheduledFor", "23-10-2026");
    badDate.set("recurrence", "WEEKLY");
    const dateResult = await preorderAction({ ok: false }, badDate);
    expect(dateResult.ok).toBe(false);
    expect(dateResult.error).toBe("Pilih tanggal pengiriman.");

    const badRecurrence = new FormData();
    badRecurrence.set("batchId", "1");
    badRecurrence.set("quantityKg", "1");
    badRecurrence.set("scheduledFor", today());
    badRecurrence.set("recurrence", "DAILY");
    expect((await preorderAction({ ok: false }, badRecurrence)).ok).toBe(false);
  });
});

describe("notifyMeAction", () => {
  it("acknowledges a valid deal opt-in", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.consumer.id, "CONSUMER");

    const form = new FormData();
    form.set("dealId", "12");

    const result = await notifyMeAction({ ok: false }, form);
    expect(result.ok).toBe(true);
    expect(result.message).toContain("Notifikasi WhatsApp diaktifkan");
  });

  it("rejects an invalid deal id", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.consumer.id, "CONSUMER");

    const form = new FormData();
    form.set("dealId", "abc");

    expect(await notifyMeAction({ ok: false }, form)).toEqual({
      ok: false,
      message: "Penawaran tidak valid.",
    });
  });
});
