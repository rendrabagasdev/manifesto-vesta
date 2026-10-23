"use server";

/**
 * Batch mutations as Server Actions.
 *
 * These actions are the single mutation entry point for producers/warehouses:
 * validate with Zod → enforce RBAC + ownership → persist with Prisma → let the
 * cascade engine create stage listings → notify the producer on transitions.
 */

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/src/prisma/db";
import {
  BATCH_CREATE_ROLES,
  BATCH_UPDATE_ROLES,
} from "@/src/lib/auth/roles";
import { requireRole } from "@/src/lib/auth/session";
import {
  calculateDynamicPricing,
  calculateFreshnessScore,
} from "@/src/lib/batches/engine";
import { dateCompact } from "@/src/lib/batches/format";
import { getProducerForUser } from "@/src/lib/batches/queries";
import { createBatchSchema } from "@/src/lib/batches/validation";
import { syncBatchState } from "@/src/lib/cascade/service";
import { sendCascadeAlert } from "@/src/lib/notifications/fonnte";

export type BatchStatusValue =
  | "FRESH"
  | "RESCUE"
  | "FEED"
  | "RESIDUE"
  | "DISPOSED";

export interface CreateBatchInput {
  productId: number | string;
  warehouseId: number | string;
  harvestDate: string;
  quantityKg: number | string;
  storageTempC: number | string;
  qualityNote?: string | null;
}

export interface QualityUpdateInput {
  storageTempC?: number | string;
  qualityNote?: string | null;
  isManuallyAdjusted?: boolean;
}

export interface BatchActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Alias of batchId for callers that expect a generic `id`. */
  id?: number;
  batchId?: number;
  code?: string;
  status?: BatchStatusValue;
  previousStatus?: BatchStatusValue;
  freshnessScore?: number;
  previousScore?: number;
  transitioned?: boolean;
  forcedByTimer?: boolean;
  availableKg?: number;
  rescueDealId?: number | null;
  reason?: string | null;
  result?: unknown;
}

const qualityUpdateSchema = z
  .object({
    storageTempC: z.coerce
      .number({ error: "Suhu penyimpanan tidak valid." })
      .min(-30, "Suhu minimal -30°C.")
      .max(60, "Suhu maksimal 60°C.")
      .optional(),
    qualityNote: z
      .string()
      .trim()
      .max(500, "Catatan kualitas maksimal 500 karakter.")
      .nullable()
      .optional(),
    isManuallyAdjusted: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.storageTempC !== undefined ||
      value.qualityNote !== undefined ||
      value.isManuallyAdjusted !== undefined,
    "Tidak ada perubahan kualitas yang dikirim.",
  );

const idSchema = z.coerce
  .number({ error: "ID batch tidak valid." })
  .int("ID batch tidak valid.")
  .positive("ID batch tidak valid.");

function revalidate(paths: readonly string[]): void {
  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch {
      // Unit tests and background jobs run outside a Next.js request context.
    }
  }
}

function createBatchCode(): string {
  return `VST-${dateCompact()}-${randomUUID()
    .replaceAll("-", "")
    .slice(0, 6)
    .toUpperCase()}`;
}

function toFormRecord(input: CreateBatchInput | FormData): unknown {
  if (input instanceof FormData) {
    return {
      productId: input.get("productId"),
      warehouseId: input.get("warehouseId"),
      harvestDate: input.get("harvestDate"),
      quantityKg: input.get("quantityKg"),
      storageTempC: input.get("storageTempC"),
      qualityNote: input.get("qualityNote") ?? undefined,
    };
  }

  // Accept Date objects from programmatic callers; the Zod schema expects the
  // `YYYY-MM-DD` form used by the dashboard.
  const record = { ...(input as unknown as Record<string, unknown>) };
  if (record.harvestDate instanceof Date) {
    record.harvestDate = record.harvestDate.toISOString().slice(0, 10);
  }
  return record;
}

function failure(error: string, fieldErrors?: Record<string, string[] | undefined>): BatchActionResult {
  return { ok: false, error, ...(fieldErrors ? { fieldErrors } : {}) };
}

async function producerPhoneForBatch(batchId: number): Promise<string | null> {
  const batch = await db.orm.public.Batch.where({ id: batchId })
    .include("product", (product) =>
      product.select("id", "name", "producerId"),
    )
    .include("warehouse", (warehouse) => warehouse.select("id", "name", "city"))
    .first();

  if (!batch?.product) return null;

  const producer = await db.orm.public.Producer.where({
    id: batch.product.producerId,
  })
    .select("id", "phone")
    .first();

  return producer?.phone ?? null;
}

export async function createBatchAction(
  input: CreateBatchInput | FormData,
): Promise<BatchActionResult> {
  const user = await requireRole(BATCH_CREATE_ROLES);

  const parsed = createBatchSchema.safeParse(toFormRecord(input));
  if (!parsed.success) {
    return failure("Periksa kembali data batch.", parsed.error.flatten().fieldErrors);
  }

  const data = parsed.data;

  const product = await db.orm.public.Product.where({ id: data.productId })
    .select(
      "id",
      "name",
      "category",
      "producerId",
      "shelfLifeDays",
      "idealTempC",
      "basePricePerKg",
    )
    .first();

  if (!product) return failure("Produk tidak ditemukan.");

  if (user.role === "PRODUCER") {
    const producer = await getProducerForUser(user.id);
    if (!producer || producer.id !== product.producerId) {
      return failure("Anda hanya dapat mencatat produk milik sendiri.");
    }
  }

  const warehouse = await db.orm.public.Warehouse.where({
    id: data.warehouseId,
  })
    .select("id", "name")
    .first();

  if (!warehouse) return failure("Gudang tidak ditemukan.");

  const now = new Date();
  const freshness = calculateFreshnessScore({
    harvestDate: data.harvestDate,
    receivedAt: now,
    storageTempC: data.storageTempC,
    idealTempC: product.idealTempC,
    shelfLifeDays: product.shelfLifeDays,
    category: product.category,
    now,
  });

  const pricing = calculateDynamicPricing({
    basePricePerKg: product.basePricePerKg,
    status: freshness.status,
    category: product.category,
    freshnessScore: freshness.score,
  });

  try {
    const created = await db.transaction(async (tx) => {
      const batch = await tx.orm.public.Batch.create({
        code: createBatchCode(),
        productId: product.id,
        warehouseId: warehouse.id,
        harvestDate: data.harvestDate,
        receivedAt: now.toISOString(),
        storageTempC: data.storageTempC,
        quantityKg: data.quantityKg,
        freshnessScore: freshness.score,
        status: freshness.status,
        qualityNote: data.qualityNote ?? null,
      });

      await tx.orm.public.PriceBreakdown.create({
        batchId: batch.id,
        basePricePerKg: pricing.basePricePerKg,
        warehouseCostPerKg: pricing.warehouseCostPerKg,
        logisticsCostPerKg: pricing.logisticsCostPerKg,
        marginPerKg: pricing.marginPerKg,
        rescueDiscountPct: pricing.rescueDiscountPct,
        finalPricePerKg: pricing.finalPricePerKg,
      });

      await tx.orm.public.CascadeEvent.create({
        batchId: batch.id,
        actorId: Number(user.id),
        fromStatus: null,
        toStatus: freshness.status,
        freshnessScore: freshness.score,
        reason: "Batch diterima dan dihitung otomatis oleh sistem.",
      });

      // Creates the stage listing when the batch arrives already in RESCUE,
      // FEED or RESIDUE (e.g. a delayed delivery).
      await syncBatchState(tx, batch.id, {
        now,
        actorId: Number(user.id),
        ignoreStageTimers: true,
      });

      return batch;
    });

    revalidate(["/dashboard", "/dashboard/batches", "/marketplace"]);

    return {
      ok: true,
      id: created.id,
      batchId: created.id,
      code: created.code,
      status: freshness.status,
      freshnessScore: freshness.score,
    };
  } catch (error) {
    console.error("createBatchAction", error);
    return failure("Batch gagal disimpan. Coba lagi tanpa mengubah data.");
  }
}

export async function updateBatchQualityAction(
  batchId: number | string,
  data: QualityUpdateInput,
): Promise<BatchActionResult> {
  const user = await requireRole(BATCH_UPDATE_ROLES);

  const parsedId = idSchema.safeParse(batchId);
  if (!parsedId.success) return failure("Batch tidak valid.");

  const parsedData = qualityUpdateSchema.safeParse(data);
  if (!parsedData.success) {
    return failure(
      "Periksa kembali suhu dan catatan kualitas.",
      parsedData.error.flatten().fieldErrors,
    );
  }

  const batch = await db.orm.public.Batch.where({ id: parsedId.data })
    .include("product", (product) =>
      product.select("id", "name", "category", "shelfLifeDays", "idealTempC"),
    )
    .include("warehouse", (warehouse) =>
      warehouse.select("id", "managerId", "name", "city"),
    )
    .first();

  if (!batch || !batch.product || !batch.warehouse) {
    return failure("Batch atau relasinya tidak ditemukan.");
  }

  if (
    user.role === "WAREHOUSE" &&
    batch.warehouse.managerId !== Number(user.id)
  ) {
    return failure("Batch ini bukan tanggung jawab gudang Anda.");
  }

  try {
    const result = await db.transaction(async (tx) => {
      await tx.orm.public.Batch.where({ id: batch.id }).update({
        ...(parsedData.data.storageTempC !== undefined
          ? { storageTempC: parsedData.data.storageTempC }
          : {}),
        ...(parsedData.data.qualityNote !== undefined
          ? { qualityNote: parsedData.data.qualityNote ?? null }
          : {}),
        ...(parsedData.data.isManuallyAdjusted !== undefined
          ? { isManuallyAdjusted: parsedData.data.isManuallyAdjusted }
          : {}),
      });

      return syncBatchState(tx, batch.id, {
        actorId: Number(user.id),
        reason: `Kualitas batch diperbarui oleh ${user.name ?? "petugas gudang"}.`,
        ignoreStageTimers: true,
      });
    });

    if (!result) return failure("Batch tidak dapat disinkronkan.");

    if (result.transitioned && result.reason) {
      const phone = await producerPhoneForBatch(batch.id);
      if (phone) {
        await sendCascadeAlert(
          phone,
          {
            code: result.batchCode,
            productName: result.productName,
            freshnessScore: result.freshnessScore,
            quantityKg: batch.quantityKg,
            warehouse: batch.warehouse,
          },
          result.status,
        );
      }
    }

    revalidate([
      "/dashboard",
      "/dashboard/batches",
      `/dashboard/batches/${batch.id}`,
      "/marketplace",
      "/rescue-deals",
      "/feed",
      "/residue",
    ]);

    return {
      ok: true,
      id: result.batchId,
      batchId: result.batchId,
      code: result.batchCode,
      status: result.status,
      previousStatus: result.previousStatus,
      freshnessScore: result.freshnessScore,
      previousScore: result.previousScore,
      transitioned: result.transitioned,
      forcedByTimer: result.forcedByTimer,
      availableKg: result.availableKg,
      rescueDealId: result.rescueDealId,
      reason: result.reason,
      result,
    };
  } catch (error) {
    console.error("updateBatchQualityAction", error);
    return failure("Perubahan gagal disimpan. Coba lagi.");
  }
}

export async function syncBatchStateAction(
  batchId: number | string,
): Promise<BatchActionResult> {
  const user = await requireRole(BATCH_UPDATE_ROLES);

  const parsedId = idSchema.safeParse(batchId);
  if (!parsedId.success) return failure("Batch tidak valid.");

  const batch = await db.orm.public.Batch.where({ id: parsedId.data })
    .include("product", (product) =>
      product.select("id", "name", "producerId"),
    )
    .include("warehouse", (warehouse) =>
      warehouse.select("id", "name", "city", "managerId"),
    )
    .first();

  if (!batch || !batch.product || !batch.warehouse) {
    return failure("Batch atau relasinya tidak ditemukan.");
  }

  if (
    user.role === "WAREHOUSE" &&
    batch.warehouse.managerId !== Number(user.id)
  ) {
    return failure("Batch ini bukan tanggung jawab gudang Anda.");
  }

  try {
    const result = await syncBatchState(db, batch.id, {
      actorId: Number(user.id),
      reason: `Sinkronisasi manual oleh ${user.name ?? "petugas"}.`,
      ignoreStageTimers: true,
    });

    if (!result) return failure("Batch tidak dapat disinkronkan.");

    if (result.transitioned && result.reason) {
      const producer = await db.orm.public.Producer.where({
        id: batch.product.producerId,
      })
        .select("id", "phone")
        .first();

      if (producer?.phone) {
        await sendCascadeAlert(
          producer.phone,
          {
            code: result.batchCode,
            productName: result.productName,
            freshnessScore: result.freshnessScore,
            quantityKg: batch.quantityKg,
            warehouse: batch.warehouse,
          },
          result.status,
        );
      }
    }

    revalidate([
      "/dashboard",
      "/dashboard/batches",
      `/dashboard/batches/${batch.id}`,
      "/marketplace",
      "/rescue-deals",
      "/feed",
      "/residue",
    ]);

    return {
      ok: true,
      id: result.batchId,
      ...result,
      result,
    };
  } catch (error) {
    console.error("syncBatchStateAction", error);
    return failure("Sinkronisasi cascade gagal. Coba lagi.");
  }
}
