import { z } from "zod";
import { dateInputValue } from "@/src/lib/batches/format";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const harvestDateSchema = z
  .string()
  .trim()
  .regex(datePattern, "Pilih tanggal panen yang valid.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime());
  }, "Tanggal panen tidak valid.")
  .refine(
    (value) => value <= dateInputValue(),
    "Tanggal panen tidak boleh melewati hari ini.",
  );

const qualityNoteSchema = z
  .string()
  .trim()
  .max(500, "Catatan kualitas maksimal 500 karakter.")
  .optional()
  .transform((value) => (value ? value : undefined));

export const createBatchSchema = z.object({
  productId: z.coerce
    .number({ error: "Pilih produk." })
    .int("Produk tidak valid.")
    .positive("Pilih produk."),
  warehouseId: z.coerce
    .number({ error: "Pilih gudang." })
    .int("Gudang tidak valid.")
    .positive("Pilih gudang."),
  harvestDate: harvestDateSchema,
  quantityKg: z.coerce
    .number({ error: "Isi jumlah pasokan." })
    .positive("Jumlah pasokan harus lebih dari 0 kg.")
    .max(100000, "Jumlah pasokan maksimal 100.000 kg."),
  storageTempC: z.coerce
    .number({ error: "Isi suhu penyimpanan." })
    .min(-30, "Suhu minimal -30°C.")
    .max(60, "Suhu maksimal 60°C."),
  qualityNote: qualityNoteSchema,
});

export const updateBatchSchema = z.object({
  batchId: z.coerce.number().int().positive(),
  storageTempC: z.coerce
    .number({ error: "Isi suhu penyimpanan." })
    .min(-30, "Suhu minimal -30°C.")
    .max(60, "Suhu maksimal 60°C."),
  qualityNote: qualityNoteSchema,
});

export type BatchFormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};
