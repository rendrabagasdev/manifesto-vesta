import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { closeTestResources, truncateAll } from "./helpers/db";
import {
  createBatch,
  createBuyerTier,
  createRescueDeal,
  createWorld,
  hoursFromNowIso,
} from "./helpers/fixtures";
import type { UserRole } from "@/src/lib/auth/roles";

const { state, RedirectError } = vi.hoisted(() => {
  class RedirectError extends Error {
    constructor(readonly url: string) {
      super(`NEXT_REDIRECT:${url}`);
    }
  }
  const state: {
    user: { id: string; email: string; name: string; role: UserRole } | null;
  } = { user: null };
  return { state, RedirectError };
});

vi.mock("@/auth", () => ({
  auth: async () => (state.user ? { user: state.user } : null),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: {},
}));

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

import { db } from "@/src/prisma/db";
import { GET, PUT } from "@/app/api/admin/config/route";
import {
  createBatchAction,
  syncBatchStateAction,
  updateBatchQualityAction,
} from "@/app/actions/batches";
import { claimRescueDealAction, placeOrderAction } from "@/app/actions/orders";
import { generateBatchQRCode, generateTraceabilityPDF } from "@/src/lib/traceability/qrcode";
import { handleNotification, createMidtransSignature } from "@/src/lib/payment/midtrans";
import { FONNTE_TIMEOUT_MS, sendOrderConfirmation } from "@/src/lib/notifications/fonnte";

function user(id: number, role: UserRole) {
  return { id: String(id), email: `${role.toLowerCase()}${id}@vesta.id`, name: `${role}`, role };
}

beforeEach(async () => {
  state.user = null;
  process.env.FONNTE_API_TOKEN = "";
  process.env.MIDTRANS_SERVER_KEY = "";
  await truncateAll();
});

afterAll(async () => {
  await closeTestResources();
});

describe("admin config", () => {
  it("returns defaults for admin and persists patches", async () => {
    const world = await createWorld();
    state.user = user(world.users.admin.id, "ADMIN");

    const initial = await GET();
    const initialJson = (await initial.json()) as { success: boolean; data: { thresholds: { fresh: number } } };
    expect(initial.status).toBe(200);
    expect(initialJson.data.thresholds.fresh).toBe(70);

    const response = await PUT(
      new Request("http://localhost/api/admin/config", {
        method: "PUT",
        body: JSON.stringify({
          thresholds: { fresh: 75, rescue: 35, feed: 12, residue: 0 },
          stageTimersHours: { RESCUE: 36, FEED: 60, RESIDUE: 60 },
          pricingDefaults: { marginPerKg: 2500 },
        }),
      }),
    );
    const json = (await response.json()) as {
      success: boolean;
      data: { thresholds: { fresh: number }; stageTimersHours: { RESCUE: number }; pricing: { marginPerKg: number } };
    };
    expect(response.status).toBe(200);
    expect(json.data.thresholds.fresh).toBe(75);
    expect(json.data.stageTimersHours.RESCUE).toBe(36);
    expect(json.data.pricing.marginPerKg).toBe(2500);

    const bad = await PUT(
      new Request("http://localhost/api/admin/config", {
        method: "PUT",
        body: JSON.stringify({ thresholds: { fresh: 10, rescue: 20 } }),
      }),
    );
    expect(bad.status).toBe(422);
  });

  it("rejects non-admin", async () => {
    const world = await createWorld();
    state.user = user(world.users.consumer.id, "CONSUMER");
    const response = await GET();
    expect(response.status).toBe(403);
  });
});

describe("batch actions", () => {
  it("creates, updates, and syncs a batch", async () => {
    const world = await createWorld();
    state.user = user(world.users.producer.id, "PRODUCER");

    const created = await createBatchAction({
      productId: world.products.tomato.id,
      warehouseId: world.warehouse.id,
      harvestDate: new Date().toISOString().slice(0, 10),
      quantityKg: 50,
      storageTempC: 10,
    });
    expect(created.ok).toBe(true);
    expect(created.code).toMatch(/^VST-/);

    state.user = user(world.users.warehouse.id, "WAREHOUSE");
    const updated = await updateBatchQualityAction(created.batchId!, {
      storageTempC: 12,
      qualityNote: "Suhu naik",
    });
    expect(updated.ok).toBe(true);

    const synced = await syncBatchStateAction(created.batchId!);
    expect(synced.ok).toBe(true);
    expect(synced.batchId).toBe(created.batchId);
  });
});

describe("order actions", () => {
  it("places a fresh order and claims a rescue deal with quota", async () => {
    const world = await createWorld();
    await createBuyerTier({ userId: world.users.consumer.id });

    const { batch } = await createBatch({
      product: world.products.tomato,
      warehouseId: world.warehouse.id,
      quantityKg: 100,
      status: "FRESH",
      freshnessScore: 95,
    });

    state.user = user(world.users.consumer.id, "CONSUMER");
    const order = await placeOrderAction([{ batchId: batch.id, quantityKg: 2 }]);
    expect(order.ok).toBe(true);
    expect(order.code).toMatch(/^ORD-/);

    const rescue = await createBatch({
      product: world.products.spinach,
      warehouseId: world.warehouse.id,
      quantityKg: 50,
      status: "RESCUE",
      freshnessScore: 55,
    });
    const deal = await createRescueDeal({
      batchId: rescue.batch.id,
      rescuePricePerKg: 6000,
      startsAt: hoursFromNowIso(-1),
      endsAt: hoursFromNowIso(10),
      earlyAccessHours: 0,
    });

    const claim = await claimRescueDealAction(deal.id, 1);
    expect(claim.ok).toBe(true);
    expect(claim.code).toMatch(/^ORD-/);
    expect(claim.quotaRemaining).toBe(1);
  });
});

describe("traceability", () => {
  it("makes a QR data URL and a PDF", async () => {
    const world = await createWorld();
    const { batch } = await createBatch({
      product: world.products.tomato,
      warehouseId: world.warehouse.id,
      status: "FRESH",
      freshnessScore: 90,
    });

    const qr = await generateBatchQRCode(batch.code);
    expect(qr.startsWith("data:image/png;base64,")).toBe(true);

    const loaded = await db.orm.public.Batch.where({ id: batch.id })
      .include("product", (product) =>
        product.select("id", "name", "category", "unit").include("producer", (p) => p.select("id", "farmName")),
      )
      .include("warehouse", (w) => w.select("id", "name", "city"))
      .include("priceBreakdown")
      .include("cascadeEvents")
      .include("impactLogs")
      .first();

    const pdf = await generateTraceabilityPDF(loaded!);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});

describe("midtrans + fonnte", () => {
  it("reconciles a settlement notification", async () => {
    const world = await createWorld();
    const order = await db.orm.public.Order.create({
      code: "ORD-TEST-1",
      buyerId: world.users.consumer.id,
      subtotal: 10000,
      total: 10000,
    });

    process.env.MIDTRANS_SERVER_KEY = "SB-Mid-server-test";
    const payload = {
      order_id: order.code,
      status_code: "200",
      gross_amount: "10000.00",
      transaction_status: "settlement" as const,
      transaction_id: "trx-1",
    };
    const result = await handleNotification({
      ...payload,
      signature_key: createMidtransSignature(
        payload.order_id,
        payload.status_code,
        payload.gross_amount,
      ),
    });

    expect(result.paid).toBe(true);
    expect(result.status).toBe("PAID");
    const saved = await db.orm.public.Order.where({ id: order.id }).first();
    expect(saved!.status).toBe("PAID");
    expect(saved!.paidAt).not.toBeNull();
  });

  it("sends a Fonnte message with timeout-safe fetch", async () => {
    process.env.FONNTE_API_TOKEN = "token-1";
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      new Response(JSON.stringify({ status: true, detail: "sent" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendOrderConfirmation("0812-3456-7890", {
      code: "ORD-1",
      total: 25000,
      status: "PAID",
    });
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = init.body as URLSearchParams;
    expect(body.get("target")).toBe("6281234567890");
    expect(body.get("message")).toContain("ORD-1");
    expect(FONNTE_TIMEOUT_MS).toBe(1500);
    vi.unstubAllGlobals();
  });
});
