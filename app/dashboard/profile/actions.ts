"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { unstable_update } from "@/auth";
import { db } from "@/src/prisma/db";
import { requireSession } from "@/src/lib/auth/session";

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter.")
    .max(80, "Nama maksimal 80 karakter."),
  username: z
    .string()
    .trim()
    .max(30, "Username maksimal 30 karakter.")
    .refine(
      (value) => value === "" || /^[a-zA-Z0-9._-]{3,30}$/.test(value),
      "Username 3-30 karakter, hanya huruf, angka, titik, garis bawah, atau strip.",
    )
    .transform((value) => value || null),
  phone: z
    .string()
    .trim()
    .max(20, "Nomor telepon maksimal 20 karakter.")
    .refine(
      (value) => value === "" || /^\+?[0-9()\-\s]{8,20}$/.test(value),
      "Nomor telepon tidak valid.",
    )
    .transform((value) => value || null),
  city: z
    .string()
    .trim()
    .max(60, "Kota maksimal 60 karakter.")
    .transform((value) => value || null),
  address: z
    .string()
    .trim()
    .max(300, "Alamat maksimal 300 karakter.")
    .transform((value) => value || null),
});

export type ProfileFormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export async function updateProfileAction(
  _previousState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await requireSession();

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    username: formData.get("username"),
    phone: formData.get("phone"),
    city: formData.get("city"),
    address: formData.get("address"),
  });

  if (!parsed.success) {
    return {
      error: "Periksa kembali data profil.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await db.orm.public.User.where({ id: Number(user.id) }).update({
      name: parsed.data.name,
      username: parsed.data.username,
      phone: parsed.data.phone,
      city: parsed.data.city,
      address: parsed.data.address,
    });
  } catch (error) {
    console.error("updateProfileAction", error);
    return { error: "Profil gagal disimpan. Coba lagi." };
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/profile");

  await unstable_update({ user: { name: parsed.data.name } });

  return { success: "Profil berhasil disimpan." };
}
