import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { closeTestResources, truncateAll } from "./helpers/db";
import { createWorld, type TestWorld } from "./helpers/fixtures";
import type { UserRole } from "@/src/lib/auth/roles";

const { RedirectError, state, unstableUpdateMock } = vi.hoisted(() => {
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

  return { RedirectError, state, unstableUpdateMock: vi.fn() };
});

vi.mock("@/src/lib/auth/session", () => ({
  requireSession: async () => {
    if (!state.user) throw new RedirectError("/login");
    return state.user;
  },
}));

vi.mock("@/auth", () => ({
  unstable_update: unstableUpdateMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { db } from "@/src/prisma/db";
import { updateProfileAction } from "@/app/dashboard/profile/actions";

interface ProfileInput {
  name?: string;
  username?: string;
  phone?: string;
  city?: string;
  address?: string;
}

function profileForm(values: ProfileInput): FormData {
  const form = new FormData();
  form.set("name", values.name ?? "");
  form.set("username", values.username ?? "");
  form.set("phone", values.phone ?? "");
  form.set("city", values.city ?? "");
  form.set("address", values.address ?? "");
  return form;
}

async function getConsumer(world: TestWorld) {
  const user = await db.orm.public.User.where({
    id: world.users.consumer.id,
  }).first();
  if (!user) throw new Error("Consumer hilang dari database test.");
  return user;
}

let world: TestWorld;

beforeEach(async () => {
  await truncateAll();
  vi.clearAllMocks();
  world = await createWorld();
  state.user = {
    id: String(world.users.consumer.id),
    email: world.users.consumer.email,
    name: world.users.consumer.name ?? "Sari",
    role: "CONSUMER",
  };
});

afterAll(async () => {
  await closeTestResources();
});

describe("updateProfileAction", () => {
  it("menyimpan profil dan menyegarkan sesi", async () => {
    const result = await updateProfileAction(
      {},
      profileForm({
        name: "  Sari Dewi  ",
        username: "sari.dewi",
        phone: "0812 3456 7890",
        city: "Kota Bandung",
        address: "Jl. Cihampelas No. 45, Coblong",
      }),
    );

    expect(result).toEqual({ success: "Profil berhasil disimpan." });

    const user = await getConsumer(world);
    expect(user.name).toBe("Sari Dewi");
    expect(user.username).toBe("sari.dewi");
    expect(user.phone).toBe("0812 3456 7890");
    expect(user.city).toBe("Kota Bandung");
    expect(user.address).toBe("Jl. Cihampelas No. 45, Coblong");

    expect(revalidatePath).toHaveBeenCalledWith("/dashboard", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/profile");
    expect(unstableUpdateMock).toHaveBeenCalledWith({
      user: { name: "Sari Dewi" },
    });
  });

  it("menyimpan field opsional kosong sebagai null", async () => {
    const result = await updateProfileAction(
      {},
      profileForm({
        name: "Sari",
        username: "",
        phone: "",
        city: "",
        address: "",
      }),
    );

    expect(result).toEqual({ success: "Profil berhasil disimpan." });

    const user = await getConsumer(world);
    expect(user.name).toBe("Sari");
    expect(user.username).toBeNull();
    expect(user.phone).toBeNull();
    expect(user.city).toBeNull();
    expect(user.address).toBeNull();
  });

  it("menolak nomor telepon yang tidak valid tanpa mengubah data", async () => {
    const before = await getConsumer(world);

    const result = await updateProfileAction(
      {},
      profileForm({
        name: "Sari",
        phone: "telepon saya",
      }),
    );

    expect(result.error).toBe("Periksa kembali data profil.");
    expect(result.fieldErrors?.phone?.[0]).toMatch(/tidak valid/i);

    const user = await getConsumer(world);
    expect(user.phone).toBe(before.phone);
    expect(unstableUpdateMock).not.toHaveBeenCalled();
  });

  it("menolak username dan nama yang tidak sesuai aturan", async () => {
    const result = await updateProfileAction(
      {},
      profileForm({
        name: "S",
        username: "a b",
      }),
    );

    expect(result.error).toBe("Periksa kembali data profil.");
    expect(result.fieldErrors?.name?.[0]).toMatch(/minimal 2 karakter/i);
    expect(result.fieldErrors?.username?.[0]).toMatch(/3-30 karakter/i);
    expect(unstableUpdateMock).not.toHaveBeenCalled();
  });

  it("mengalihkan ke login saat tidak ada sesi", async () => {
    state.user = null;

    await expect(
      updateProfileAction({}, profileForm({ name: "Sari" })),
    ).rejects.toThrow(RedirectError);
  });
});
