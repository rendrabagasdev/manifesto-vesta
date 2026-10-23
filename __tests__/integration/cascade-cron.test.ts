import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/cron/cascade-tick/route";
import { closeTestResources, truncateAll } from "./helpers/db";

const URL = "http://localhost:3000/api/cron/cascade-tick";

beforeEach(async () => {
  vi.stubEnv("CRON_SECRET", "test-cron-secret");
  await truncateAll();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

afterAll(async () => {
  await closeTestResources();
});

describe("GET /api/cron/cascade-tick", () => {
  it("rejects requests without the production secret", async () => {
    const response = await GET(new NextRequest(URL));
    expect(response.status).toBe(401);
  });

  it("runs the cascade tick with the production secret", async () => {
    const response = await GET(
      new NextRequest(URL, {
        headers: { authorization: "Bearer test-cron-secret" },
      }),
    );
    const json = (await response.json()) as {
      success: boolean;
      data?: { processedBatches: number };
    };

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data?.processedBatches).toBe(0);
  });
});
