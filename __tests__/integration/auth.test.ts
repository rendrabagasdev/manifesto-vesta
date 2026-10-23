import bcrypt from "bcryptjs";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { authenticateCredentials, authConfig } from "@/auth";
import { db } from "@/src/prisma/db";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/src/lib/auth/demo-accounts";
import { loginSchema } from "@/src/lib/auth/validation";
import { closeTestResources, truncateAll } from "./helpers/db";
import { createWorld, TEST_PASSWORD } from "./helpers/fixtures";

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await closeTestResources();
});

describe("login with demo accounts", () => {
  it("exposes exactly the five documented roles", () => {
    expect(DEMO_ACCOUNTS).toHaveLength(5);
    expect(DEMO_ACCOUNTS.map((account) => account.role).sort()).toEqual([
      "ADMIN",
      "BUSINESS",
      "CONSUMER",
      "PRODUCER",
      "WAREHOUSE",
    ]);
  });

  it("authenticates every demo account with the shared demo password", async () => {
    const world = await createWorld();

    for (const account of DEMO_ACCOUNTS) {
      const user = await authenticateCredentials({
        email: account.email,
        password: DEMO_PASSWORD,
      });

      expect(user).not.toBeNull();
      expect(user?.email).toBe(account.email);
      expect(user?.role).toBe(account.role);
      expect(user?.name).toBe(account.name);
      expect(typeof user?.id).toBe("string");
    }

    // The fixture world really created those users.
    expect(await db.orm.public.User.all()).toHaveLength(7);
    expect(world.users.admin.role).toBe("ADMIN");
  });

  it("stores passwords as bcrypt hashes, never as plaintext", async () => {
    await createWorld();
    const user = await db.orm.public.User.where({
      email: "b2c@vesta.id",
    }).first();

    expect(user?.passwordHash).toBeDefined();
    expect(user?.passwordHash).not.toBe(TEST_PASSWORD);
    await expect(
      bcrypt.compare(TEST_PASSWORD, user!.passwordHash),
    ).resolves.toBe(true);
  });

  it("normalises email case and surrounding whitespace", async () => {
    await createWorld();
    const user = await authenticateCredentials({
      email: "  B2C@Vesta.ID ",
      password: DEMO_PASSWORD,
    });

    expect(user?.email).toBe("b2c@vesta.id");
    expect(user?.role).toBe("CONSUMER");
  });

  it.each([
    ["wrong password", { email: "admin@vesta.id", password: "nope" }],
    ["unknown email", { email: "ghost@vesta.id", password: DEMO_PASSWORD }],
    ["malformed email", { email: "not-an-email", password: DEMO_PASSWORD }],
    ["missing password", { email: "admin@vesta.id" }],
    ["missing email", { password: DEMO_PASSWORD }],
    ["undefined credentials", undefined],
  ])("rejects %s", async (_label, credentials) => {
    await createWorld();
    await expect(authenticateCredentials(credentials)).resolves.toBeNull();
  });

  it("validates login input with Zod before hitting the database", () => {
    expect(loginSchema.safeParse({ email: "", password: "" }).success).toBe(false);
    expect(
      loginSchema.safeParse({ email: "a@b.co", password: "x" }).success,
    ).toBe(true);
    expect(
      loginSchema.safeParse({ email: "A@B.CO", password: "x" }).data?.email,
    ).toBe("a@b.co");
  });
});

describe("session persistence", () => {
  const jwtCallback = authConfig.callbacks.jwt;
  const sessionCallback = authConfig.callbacks.session;

  async function tokenFor(user: {
    id: string;
    role: "ADMIN" | "PRODUCER" | "WAREHOUSE" | "CONSUMER" | "BUSINESS";
    email: string;
    name: string;
  }) {
    const args = {
      token: {},
      user,
      account: null,
      profile: undefined,
      trigger: "signIn" as const,
      isNewUser: false,
    } as unknown as Parameters<typeof jwtCallback>[0];

    return jwtCallback(args);
  }

  function sessionFrom(token: Awaited<ReturnType<typeof tokenFor>>) {
    const session = {
      user: { name: "Sari", email: "b2c@vesta.id" },
      expires: new Date(Date.now() + 60_000).toISOString(),
    };
    const args = {
      session,
      token,
      user: undefined,
      newSession: undefined,
      trigger: "update" as const,
    } as unknown as Parameters<typeof sessionCallback>[0];

    return sessionCallback(args);
  }

  it("carries id and role from the user into the JWT and then the session", async () => {
    const token = await tokenFor({
      id: "4",
      role: "CONSUMER",
      email: "b2c@vesta.id",
      name: "Sari",
    });

    expect(token.id).toBe("4");
    expect(token.role).toBe("CONSUMER");

    const session = await sessionFrom(token);
    expect(session.user?.id).toBe("4");
    expect(session.user?.role).toBe("CONSUMER");
  });

  it.each(["ADMIN", "PRODUCER", "WAREHOUSE", "CONSUMER", "BUSINESS"] as const)(
    "persists the %s role across token refreshes",
    async (role) => {
      const token = await tokenFor({
        id: "99",
        role,
        email: `${role.toLowerCase()}@vesta.id`,
        name: role,
      });

      const refreshedArgs = {
        token,
        user: undefined,
        account: null,
        profile: undefined,
        trigger: "update" as const,
        isNewUser: false,
      } as unknown as Parameters<typeof jwtCallback>[0];
      const refreshed = await jwtCallback(refreshedArgs);

      expect(refreshed.id).toBe("99");
      expect(refreshed.role).toBe(role);
      expect((await sessionFrom(refreshed)).user?.role).toBe(role);
    },
  );

  it("falls back to CONSUMER when the token has no role", async () => {
    const session = await sessionFrom({} as Awaited<ReturnType<typeof tokenFor>>);
    expect(session.user?.id).toBe("");
    expect(session.user?.role).toBe("CONSUMER");
  });
});
