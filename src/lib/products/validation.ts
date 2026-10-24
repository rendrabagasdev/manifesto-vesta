import { z } from "zod";

export const PRODUCT_CATEGORIES = [
  "VEGETABLE",
  "FRUIT",
  "PROTEIN",
  "STAPLE",
  "HERB",
  "OTHER",
] as const;

export const PRODUCT_CATEGORY_LABELS: Record<string, string> = {
  VEGETABLE: "Sayur",
  FRUIT: "Buah",
  PROTEIN: "Protein",
  STAPLE: "Bahan pokok",
  HERB: "Herba",
  OTHER: "Lainnya",
};

export interface ProductFormState {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

export const createProductSchema = z.object({
  producerId: z.coerce.number().int().positive().optional(),
  name: z
    .string()
    .trim()
    .min(2, "Nama produk minimal 2 karakter.")
    .max(80, "Nama produk maksimal 80 karakter."),
  category: z.enum(PRODUCT_CATEGORIES),
  unit: z
    .string()
    .trim()
    .min(1, "Satuan wajib diisi.")
    .max(16, "Satuan maksimal 16 karakter."),
  shelfLifeDays: z.coerce
    .number()
    .int("Masa simpan harus bilangan bulat.")
    .min(1, "Masa simpan minimal 1 hari.")
    .max(3650, "Masa simpan maksimal 3650 hari."),
  idealTempC: z.coerce
    .number()
    .min(-30, "Suhu minimal -30°C.")
    .max(60, "Suhu maksimal 60°C."),
  basePricePerKg: z.coerce
    .number()
    .int("Harga dasar harus bilangan bulat.")
    .min(1, "Harga dasar minimal Rp1.")
    .max(10_000_000, "Harga dasar maksimal Rp10.000.000."),
  description: z
    .string()
    .trim()
    .max(500, "Deskripsi maksimal 500 karakter.")
    .optional(),
});

export const updateProductSchema = createProductSchema
  .omit({ producerId: true })
  .extend({ productId: z.coerce.number().int().positive() });

export const productIdSchema = z.coerce.number().int().positive();
