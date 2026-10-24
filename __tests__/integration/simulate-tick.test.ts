import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { authState } = vi.hoisted(() => ({
  authState: {
    user: {
      id: "1",
      email: "admin@vesta.id",
      name: "Admin Vesta",
      role: "ADMIN",
    } as { id: string; email: string; name: string; role: string } | null,
  },
}));

vi.mock("@/auth", () => ({
  auth: async () => (authState.user ? { user: authState.user } : null),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: {},
}));

import { db } from "@/src/prisma/db";
import { GET, POST } from "@/app/api/demo/simulate-tick/route";
import { closeTestResources, truncateAll } from "./helpers/db";
import { syncBatchState } from "@/src/lib/cascade/service";
import {
  createBatch,
  createWorld,
  daysAgo,
  daysAgoIso,
} from "./helpers/fixtures";

const URL = "http://localhost:3000/api/demo/simulate-tick";

function tick(body?: unknown): NextRequest {
  return new NextRequest(URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function readJson(response: Response) {
  return (await response.json()) as {
    success: boolean;
    message?: string;
    error?: string;
    data?: {
      advancedHours: number;
      processedBatches: number;
      updatedPricing: number;
      newRescueDeals: number;
      newFeedListings: number;
      newResidueListings: number;
      disposedBatches: number;
      loyalty: {
        processedUsers: number;
        downgradedUsers: number;
        expiredSpend: number;
      };
      statusTransitions: Array<{
        batchId: number;
        batchCode: string;
        fromStatus: string;
        toStatus: string;
        freshnessScore: number;
      }>;
    };
  };
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-23T00:00:00.000Z"));
  authState.user = {
    id: "1",
    email: "admin@vesta.id",
    name: "Admin Vesta",
    role: "ADMIN",
  };
  await truncateAll();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

afterAll(async () => {
  await closeTestResources();
});

describe("GET /api/demo/simulate-tick", () => {
  it("documents the POST contract", async () => {
    const response = await GET();
    const json = (await response.json()) as {
      message: string;
      usage: { method: string; body: { hours: number } };
    };

    expect(response.status).toBe(200);
    expect(json.message).toContain("POST");
    expect(json.usage).toMatchObject({
      method: "POST",
      body: { hours: 24 },
    });
  });
});

describe("POST /api/demo/simulate-tick access control", () => {
  it("requires a signed-in admin", async () => {
    authState.user = null;

    const response = await POST(tick({ hours: 24 }));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toMatchObject({
      success: false,
      error: "Silakan masuk terlebih dahulu",
    });
  });

  it("rejects non-admin roles", async () => {
    authState.user = {
      id: "2",
      email: "pembeli@vesta.id",
      name: "Pembeli",
      role: "CONSUMER",
    };

    const response = await POST(tick({ hours: 24 }));
    expect(response.status).toBe(403);
  });

  it("refuses to run when simulation is disabled", async () => {
    vi.stubEnv("SIMULATE_TIME_ENABLED", "false");

    const response = await POST(tick({ hours: 24 }));
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json).toMatchObject({
      success: false,
      error: "Simulasi waktu dinonaktifkan pada lingkungan ini",
    });
  });
});

describe("POST /api/demo/simulate-tick", () => {
  it("matches the normal cascade service for equivalent batches", async () => {
    const world = await createWorld();
    const normal = await createBatch({
      product: world.products.tomato,
      warehouseId: world.warehouse.id,
      harvestDate: daysAgo(2),
      receivedAt: daysAgoIso(2),
      status: "FRESH",
      freshnessScore: 71,
      quantityKg: 100,
    });
    const simulated = await createBatch({
      product: world.products.tomato,
      warehouseId: world.warehouse.id,
      harvestDate: daysAgo(2),
      receivedAt: daysAgoIso(2),
      status: "FRESH",
      freshnessScore: 71,
      quantityKg: 100,
    });

    const advancedNow = new Date("2026-10-24T00:00:00.000Z");
    const normalResult = await syncBatchState(db, normal.batch.id, {
      now: advancedNow,
      forwardOnly: true,
      respectManualOverride: true,
    });
    const simulationJson = await readJson(await POST(tick({ hours: 24 })));
    const simulatedTransition = simulationJson.data!.statusTransitions.find(
      (transition) => transition.batchId === simulated.batch.id,
    );

    expect(simulatedTransition).toMatchObject({
      fromStatus: normalResult!.previousStatus,
      toStatus: normalResult!.status,
      freshnessScore: normalResult!.freshnessScore,
    });
  });

  it("advances 24h and moves a FRESH batch into RESCUE with a new deal", async () => {
    const world = await createWorld();
    const { batch } = await createBatch({
      product: world.products.tomato,
      warehouseId: world.warehouse.id,
      harvestDate: daysAgo(2),
      receivedAt: daysAgoIso(2),
      status: "FRESH",
      freshnessScore: 71,
      quantityKg: 100,
    });

    const response = await POST(tick({ hours: 24 }));
    const json = await readJson(response);

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toContain("24 jam");
    expect(json.data).toMatchObject({
      advancedHours: 24,
      processedBatches: 1,
      updatedPricing: 1,
      newRescueDeals: 1,
      disposedBatches: 0,
    });
    expect(json.data!.loyalty).toEqual({
      processedUsers: 0,
      downgradedUsers: 0,
      expiredSpend: 0,
    });
    expect(json.data!.statusTransitions).toEqual([
      {
        batchId: batch.id,
        batchCode: batch.code,
        fromStatus: "FRESH",
        toStatus: "RESCUE",
        freshnessScore: 57,
      },
    ]);

    const updated = await db.orm.public.Batch.where({ id: batch.id })
      .include("priceBreakdown")
      .include("rescueDeal")
      .first();
    expect(updated!.status).toBe("RESCUE");
    expect(updated!.freshnessScore).toBe(57);
    expect(updated!.priceBreakdown!.rescueDiscountPct).toBeGreaterThan(8);
    expect(updated!.rescueDeal).not.toBeNull();
    expect(updated!.rescueDeal!.isActive).toBe(true);

    const events = await db.orm.public.CascadeEvent.where({ batchId: batch.id }).all();
    expect(events.some((event) => event.toStatus === "RESCUE")).toBe(true);
  });

  it("defaults to 24h when the body is missing or malformed", async () => {
    const world = await createWorld();
    const { batch } = await createBatch({
      product: world.products.tomato,
      warehouseId: world.warehouse.id,
      receivedAt: daysAgoIso(2),
      status: "FRESH",
      freshnessScore: 71,
    });

    const noBody = await readJson(await POST(tick()));
    expect(noBody.data!.advancedHours).toBe(24);

    const malformed = new NextRequest(URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not-json",
    });
    const malformedJson = await readJson(await POST(malformed));
    expect(malformedJson.data!.advancedHours).toBe(24);
    expect(
      (await db.orm.public.Batch.where({ id: batch.id }).first())!.status,
    ).toBe("RESCUE");
  });

  it("moves a batch into FEED and creates a feed listing", async () => {
    const world = await createWorld();
    const { batch } = await createBatch({
      product: world.products.tomato,
      warehouseId: world.warehouse.id,
      receivedAt: daysAgoIso(2),
      status: "FRESH",
      freshnessScore: 71,
      quantityKg: 100,
    });

    const json = await readJson(await POST(tick({ hours: 72 })));

    expect(json.data!.statusTransitions[0]).toMatchObject({
      fromStatus: "FRESH",
      toStatus: "FEED",
      freshnessScore: 29,
    });
    expect(json.data!.newFeedListings).toBe(1);

    const updated = await db.orm.public.Batch.where({ id: batch.id })
      .include("feedListing")
      .first();
    expect(updated!.status).toBe("FEED");
    expect(updated!.feedListing).not.toBeNull();
    expect(updated!.feedListing!.isActive).toBe(true);
  });

  it("moves a batch into RESIDUE and then DISPOSED", async () => {
    const world = await createWorld();
    const { batch } = await createBatch({
      product: world.products.tomato,
      warehouseId: world.warehouse.id,
      receivedAt: daysAgoIso(2),
      status: "FRESH",
      freshnessScore: 71,
      quantityKg: 100,
    });

    const residue = await readJson(await POST(tick({ hours: 108 })));
    expect(residue.data!.statusTransitions[0]).toMatchObject({
      fromStatus: "FRESH",
      toStatus: "RESIDUE",
      freshnessScore: 7,
    });
    expect(residue.data!.newResidueListings).toBe(1);

    const disposed = await readJson(await POST(tick({ hours: 168 })));
    expect(disposed.data!.statusTransitions[0]).toMatchObject({
      fromStatus: "RESIDUE",
      toStatus: "DISPOSED",
      freshnessScore: 0,
    });
    expect(disposed.data!.disposedBatches).toBe(1);

    const updated = await db.orm.public.Batch.where({ id: batch.id })
      .include("residueListing")
      .first();
    expect(updated!.status).toBe("DISPOSED");
    expect(updated!.residueListing!.isActive).toBe(false);
  });

  it("walks a batch through every stage on successive ticks", async () => {
    const world = await createWorld();
    const { batch } = await createBatch({
      product: world.products.tomato,
      warehouseId: world.warehouse.id,
      receivedAt: daysAgoIso(2),
      status: "FRESH",
      freshnessScore: 71,
    });

    const rescue = await readJson(await POST(tick({ hours: 24 })));
    expect(rescue.data!.statusTransitions[0].toStatus).toBe("RESCUE");

    const feed = await readJson(await POST(tick({ hours: 72 })));
    expect(feed.data!.statusTransitions[0]).toMatchObject({
      fromStatus: "RESCUE",
      toStatus: "FEED",
    });

    const residue = await readJson(await POST(tick({ hours: 108 })));
    expect(residue.data!.statusTransitions[0]).toMatchObject({
      fromStatus: "FEED",
      toStatus: "RESIDUE",
    });

    const disposed = await readJson(await POST(tick({ hours: 168 })));
    expect(disposed.data!.statusTransitions[0]).toMatchObject({
      fromStatus: "RESIDUE",
      toStatus: "DISPOSED",
    });

    const statuses = await db.orm.public.CascadeEvent.where({
      batchId: batch.id,
    }).all();
    expect(statuses.map((event) => event.toStatus)).toEqual(
      expect.arrayContaining(["RESCUE", "FEED", "RESIDUE", "DISPOSED"]),
    );
  });

  it("skips batches that have no product or price breakdown", async () => {
    const world = await createWorld();
    const orphan = await db.orm.public.Batch.create({
      code: "ORPHAN-1",
      productId: world.products.tomato.id,
      warehouseId: world.warehouse.id,
      harvestDate: daysAgo(1),
      storageTempC: 10,
      quantityKg: 5,
      freshnessScore: 100,
      status: "FRESH",
    });

    const json = await readJson(await POST(tick({ hours: 24 })));
    expect(json.data!.processedBatches).toBe(0);
    expect(json.data!.updatedPricing).toBe(0);
    expect(
      (await db.orm.public.Batch.where({ id: orphan.id }).first())!.status,
    ).toBe("FRESH");
  });
});
