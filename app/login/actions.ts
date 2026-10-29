"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { db } from "@/src/prisma/db";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/src/lib/auth/demo-accounts";
import { loginDestinationForRole } from "@/src/lib/auth/roles";
import type { UserRole } from "@/src/lib/auth/roles";
import { loginSchema } from "@/src/lib/auth/validation";

export type LoginState = {
  error: string | null;
};

export type DemoLoginState = {
  error: string | null;
};

export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid." };
  }

  // Route the redirect by role: buyers land on the marketplace, staff on
  // the dashboard. The role is resolved from the database so the same
  // action serves both the buyer and admin login forms.
  const user = await db.orm.public.User.where({
    email: parsed.data.email,
  }).first();
  const destination = loginDestinationForRole(user?.role as UserRole | undefined);

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: destination,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email atau kata sandi salah." };
    }
    throw error;
  }

  return { error: null };
}

export async function demoLoginAction(
  _previousState: DemoLoginState,
  formData: FormData,
): Promise<DemoLoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const account = DEMO_ACCOUNTS.find((item) => item.email === email);

  if (!account) {
    return { error: "Akun demo tidak ditemukan." };
  }

  try {
    await signIn("credentials", {
      email: account.email,
      password: DEMO_PASSWORD,
      redirectTo: loginDestinationForRole(account.role),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Gagal masuk ke akun demo. Coba lagi." };
    }
    throw error;
  }

  return { error: null };
}
