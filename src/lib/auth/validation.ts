import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Format email tidak valid."),
  password: z.string().min(1, "Kata sandi wajib diisi."),
});

/** The only roles open for self-registration; admin/staff accounts are seeded. */
export const ACCOUNT_TYPES = ["CONSUMER", "BUSINESS"] as const;

export const accountTypeSchema = z.enum(ACCOUNT_TYPES);

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const registerSchema = z
  .object({
    accountType: accountTypeSchema,
    name: z
      .string()
      .trim()
      .min(2, "Nama minimal 2 karakter.")
      .max(80, "Nama maksimal 80 karakter."),
    email: z.string().trim().toLowerCase().email("Format email tidak valid."),
    password: z.string().min(8, "Kata sandi minimal 8 karakter."),
    confirmPassword: z.string().min(1, "Konfirmasi kata sandi wajib diisi."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi kata sandi tidak cocok.",
    path: ["confirmPassword"],
  });
