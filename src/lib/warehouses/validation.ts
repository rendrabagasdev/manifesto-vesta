import { z } from "zod";

function optionalText(max: number, message: string) {
  return z
    .string()
    .trim()
    .max(max, message)
    .nullish()
    .transform((value) => (value ? value : undefined));
}

const managerIdSchema = z
  .string()
  .trim()
  .nullish()
  .transform((value) => (value ? Number(value) : undefined))
  .refine(
    (value) => value === undefined || (Number.isInteger(value) && value > 0),
    "Manajer gudang tidak valid.",
  );

const warehouseFields = {
  name: z
    .string()
    .trim()
    .min(2, "Nama gudang minimal 2 karakter.")
    .max(120, "Nama gudang maksimal 120 karakter."),
  address: optionalText(200, "Alamat maksimal 200 karakter."),
  city: optionalText(80, "Kota maksimal 80 karakter."),
  capacityKg: z.coerce
    .number({ error: "Isi kapasitas gudang." })
    .positive("Kapasitas harus lebih dari 0 kg.")
    .max(1_000_000, "Kapasitas maksimal 1.000.000 kg."),
  managerId: managerIdSchema,
};

export const createWarehouseSchema = z.object(warehouseFields);

export const updateWarehouseSchema = z.object({
  warehouseId: z.coerce.number().int().positive(),
  ...warehouseFields,
});

export const warehouseIdSchema = z.coerce.number().int().positive();

export type WarehouseFormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};
