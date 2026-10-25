import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { closeTestResources, truncateAll } from "./helpers/db";
import { createWorld } from "./helpers/fixtures";
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

import { saveConfigAction } from "@/app/dashboard/admin/config/actions";
import { getPlatformConfig } from "@/src/lib/config/platform";
import { db } from "@/src/prisma/db";

function sessionUser(id: number, role: UserRole) {
  return {
    id: String(id),
    email: `${role.toLowerCase()}@vesta.id`,
    name: `${role} User`,
    role,
  };
}

function configForm(overrides: Record<string, string> = {}): FormData {
  const form = new FormData();
  form.set("thresholdFresh", "75");
  form.set("thresholdRescue", "35");
  form.set("thresholdFeed", "12");
  form.set("thresholdResidue", "0");
  form.set("rescueTimerHours", "36");
  form.set("feedTimerHours", "60");
  form.set("residueTimerHours", "48");
  form.set("warehouseCostPerKg", "1200");
  form.set("logisticsCostPerKg", "1700");
  form.set("marginPerKg", "2500");
  form.set("rescueDealDurationHours", "24");
  form.set("earlyAccessWindowHours", "6");

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

describe("saveConfigAction", () => {
  it("rejects non-admin users", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.consumer.id, "CONSUMER");

    await expect(
      saveConfigAction({}, configForm()),
    ).rejects.toThrow("NEXT_REDIRECT:/dashboard");
  });

  it("persists every config group", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.admin.id, "ADMIN");

    const result = await saveConfigAction({}, configForm());
    expect(result).toEqual({
      success: "Konfigurasi cascade berhasil disimpan.",
    });

    const config = await getPlatformConfig();
    expect(config.thresholds).toEqual({
      fresh: 75,
      rescue: 35,
      feed: 12,
      residue: 0,
    });
    expect(config.stageTimersHours).toMatchObject({
      RESCUE: 36,
      FEED: 60,
      RESIDUE: 48,
    });
    expect(config.pricing).toEqual({
      warehouseCostPerKg: 1200,
      logisticsCostPerKg: 1700,
      marginPerKg: 2500,
    });
    expect(config.rescueDealDurationHours).toBe(24);
    expect(config.earlyAccessWindowHours).toBe(6);
    expect(config.updatedById).toBe(world.users.admin.id);

    const row = await db.orm.public.PlatformConfig.where({ id: 1 }).first();
    expect(row).not.toBeNull();
  });

  it("rejects thresholds that invert the cascade order", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.admin.id, "ADMIN");

    const result = await saveConfigAction(
      {},
      configForm({ thresholdFresh: "10", thresholdRescue: "20" }),
    );

    expect(result.error).toContain("segar > diskon");
    const row = await db.orm.public.PlatformConfig.where({ id: 1 }).first();
    expect(row).toBeNull();
  });

  it("returns field errors for out-of-range values", async () => {
    const world = await createWorld();
    state.user = sessionUser(world.users.admin.id, "ADMIN");

    const result = await saveConfigAction(
      {},
      configForm({ thresholdFresh: "101", earlyAccessWindowHours: "200" }),
    );

    expect(result.fieldErrors?.thresholdFresh).toBeDefined();
    expect(result.fieldErrors?.earlyAccessWindowHours).toBeDefined();
  });
});
