"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/src/prisma/db";
import { registerSchema } from "@/src/lib/auth/validation";

export type RegisterState = {
  error: string | null;
};

export async function registerAction(
  _previousState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    accountType: formData.get("accountType"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid." };
  }

  const existingUser = await db.orm.public.User.where({
    email: parsed.data.email,
  }).first();

  if (existingUser) {
    return { error: "Email sudah terdaftar. Silakan masuk." };
  }

  try {
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    await db.orm.public.User.create({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: parsed.data.accountType,
    });
  } catch {
    return { error: "Pendaftaran gagal. Silakan coba lagi." };
  }

  redirect("/login?registered=1");
}
