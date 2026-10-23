"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/src/prisma/db";
import {
  BATCH_CREATE_ROLES,
  BATCH_DELETE_ROLES,
  BATCH_UPDATE_ROLES,
} from "@/src/lib/auth/roles";
import { requireRole } from "@/src/lib/auth/session";
import {
  calculateBatchPrice,
  calculateFreshnessScore,
  DEFAULT_PRICE_COSTS,
  STATUS_META,
  statusFromScore,
} from "@/src/lib/batches/freshness";
import { dateCompact } from "@/src/lib/batches/format";
import {
  getProducerForUser,
} from "@/src/lib/batches/queries";
import {
  createBatchSchema,
  updateBatchSchema,
  type BatchFormState,
} from "@/src/lib/batches/validation";

function toFieldErrors(
  error: z.ZodError,
): Record<string, string[] | undefined> {
  return error.flatten().fieldErrors;
}

function createBatchCode(): string {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase();
  return `VST-${dateCompact()}-${suffix}`;
}

export async function createBatchAction(
  _previousState: BatchFormState,
  formData: FormData,
): Promise<BatchFormState> {
  const user = await requireRole(BATCH_CREATE_ROLES);
  const parsed = createBatchSchema.safeParse({
    productId: formData.get("productId"),
    warehouseId: formData.get("warehouseId"),
    harvestDate: formData.get("harvestDate"),
    quantityKg: formData.get("quantityKg"),
    storageTempC: formData.get("storageTempC"),
    qualityNote: formData.get("qualityNote") ?? undefined,
  });

  if (!parsed.success) {
    return {
      error: "Periksa kembali data batch.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const product = await db.orm.public.Product.where({
    id: parsed.data.productId,
  })
    .select(
      "id",
      "name",
      "producerId",
      "shelfLifeDays",
      "idealTempC",
      "basePricePerKg",
    )
    .first();

  if (!product) {
    return { error: "Produk tidak ditemukan." };
  }

  if (user.role === "PRODUCER") {
    const producer = await getProducerForUser(user.id);
    if (!producer || producer.id !== product.producerId) {
      return { error: "Anda hanya dapat mencatat produk milik sendiri." };
    }
  }

  const warehouse = await db.orm.public.Warehouse.where({
    id: parsed.data.warehouseId,
  }).first();

  if (!warehouse) {
    return { error: "Gudang tidak ditemukan." };
  }

  const now = new Date();
  const freshnessScore = calculateFreshnessScore({
    harvestDate: parsed.data.harvestDate,
    receivedAt: now,
    storageTempC: parsed.data.storageTempC,
    idealTempC: product.idealTempC,
    shelfLifeDays: product.shelfLifeDays,
    now,
  });
  const status = statusFromScore(freshnessScore);
  const price = calculateBatchPrice({
    basePricePerKg: product.basePricePerKg,
    status,
  });

  let batchId: number;

  try {
    batchId = await db.transaction(async (tx) => {
      const batch = await tx.orm.public.Batch.create({
        code: createBatchCode(),
        productId: product.id,
        warehouseId: warehouse.id,
        harvestDate: parsed.data.harvestDate,
        receivedAt: now.toISOString(),
        storageTempC: parsed.data.storageTempC,
        quantityKg: parsed.data.quantityKg,
        freshnessScore,
        status,
        qualityNote: parsed.data.qualityNote ?? null,
      });

      await tx.orm.public.PriceBreakdown.create({
        batchId: batch.id,
        ...price,
      });

      await tx.orm.public.CascadeEvent.create({
        batchId: batch.id,
        actorId: Number(user.id),
        fromStatus: null,
        toStatus: status,
        freshnessScore,
        reason: "Batch diterima dan dihitung otomatis oleh sistem.",
      });

      return batch.id;
    });
  } catch (error) {
    console.error("createBatchAction", error);
    return {
      error: "Batch gagal disimpan. Coba lagi tanpa mengubah data.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/batches");
  redirect(`/dashboard/batches/${batchId}`);
}

export async function updateBatchAction(
  _previousState: BatchFormState,
  formData: FormData,
): Promise<BatchFormState> {
  const user = await requireRole(BATCH_UPDATE_ROLES);
  const parsed = updateBatchSchema.safeParse({
    batchId: formData.get("batchId"),
    storageTempC: formData.get("storageTempC"),
    qualityNote: formData.get("qualityNote") ?? undefined,
  });

  if (!parsed.success) {
    return {
      error: "Periksa kembali suhu dan catatan kualitas.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const batch = await db.orm.public.Batch.where({
    id: parsed.data.batchId,
  })
    .include("product", (product) =>
      product.select("id", "shelfLifeDays", "idealTempC", "basePricePerKg"),
    )
    .include("warehouse", (warehouse) =>
      warehouse.select("id", "managerId"),
    )
    .include("priceBreakdown")
    .first();

  if (!batch || !batch.product || !batch.warehouse) {
    return { error: "Batch atau relasinya tidak ditemukan." };
  }

  if (
    user.role === "WAREHOUSE" &&
    batch.warehouse.managerId !== Number(user.id)
  ) {
    return { error: "Batch ini bukan tanggung jawab gudang Anda." };
  }

  const now = new Date();
  const freshnessScore = calculateFreshnessScore({
    harvestDate: batch.harvestDate,
    receivedAt: batch.receivedAt,
    storageTempC: parsed.data.storageTempC,
    idealTempC: batch.product.idealTempC,
    shelfLifeDays: batch.product.shelfLifeDays,
    now,
  });
  const status = statusFromScore(freshnessScore);
  const previousStatus = batch.status;
  const price = calculateBatchPrice({
    basePricePerKg: batch.product.basePricePerKg,
    status,
    costs: batch.priceBreakdown
      ? {
          warehouseCostPerKg: batch.priceBreakdown.warehouseCostPerKg,
          logisticsCostPerKg: batch.priceBreakdown.logisticsCostPerKg,
          marginPerKg: batch.priceBreakdown.marginPerKg,
        }
      : DEFAULT_PRICE_COSTS,
  });

  try {
    await db.transaction(async (tx) => {
      await tx.orm.public.Batch.where({ id: batch.id }).update({
        storageTempC: parsed.data.storageTempC,
        qualityNote: parsed.data.qualityNote ?? null,
        freshnessScore,
        status,
      });

      if (batch.priceBreakdown) {
        await tx.orm.public.PriceBreakdown.where({
          batchId: batch.id,
        }).update(price);
      } else {
        await tx.orm.public.PriceBreakdown.create({
          batchId: batch.id,
          ...price,
        });
      }

      if (previousStatus !== status) {
        await tx.orm.public.CascadeEvent.create({
          batchId: batch.id,
          actorId: Number(user.id),
          fromStatus: previousStatus,
          toStatus: status,
          freshnessScore,
          reason: `Status berubah setelah pembaruan suhu oleh ${
            user.name ?? "petugas gudang"
          }.`,
        });
      }
    });
  } catch (error) {
    console.error("updateBatchAction", error);
    return { error: "Perubahan gagal disimpan. Coba lagi." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/batches");
  revalidatePath(`/dashboard/batches/${batch.id}`);

  return {
    success:
      previousStatus === status
        ? `Batch diperbarui. Skor tetap di tahap ${STATUS_META[status].label}.`
        : `Batch berpindah ke tahap ${STATUS_META[status].label}.`,
  };
}

export async function deleteBatchAction(
  _previousState: BatchFormState,
  formData: FormData,
): Promise<BatchFormState> {
  const user = await requireRole(BATCH_DELETE_ROLES);
  const parsed = z.coerce.number().int().positive().safeParse(
    formData.get("batchId"),
  );

  if (!parsed.success) {
    return { error: "Batch tidak valid." };
  }

  const batch = await db.orm.public.Batch.where({ id: parsed.data })
    .include("product", (product) => product.select("id", "producerId"))
    .include("orderItems", (items) => items.select("id"))
    .include("impactLogs", (logs) => logs.select("id"))
    .first();

  if (!batch || !batch.product) {
    return { error: "Batch atau produknya tidak ditemukan." };
  }

  if (user.role === "PRODUCER") {
    const producer = await getProducerForUser(user.id);
    if (!producer || producer.id !== batch.product.producerId) {
      return { error: "Anda hanya dapat menghapus batch milik sendiri." };
    }
  }

  if (batch.orderItems.length > 0) {
    return {
      error: "Batch sudah dipesan. Batalkan pesanan sebelum menghapusnya.",
    };
  }

  if (batch.impactLogs.length > 0) {
    return {
      error: "Batch memiliki catatan dampak dan tidak dapat dihapus.",
    };
  }

  try {
    await db.orm.public.Batch.where({ id: batch.id }).delete();
  } catch (error) {
    console.error("deleteBatchAction", error);
    return { error: "Batch gagal dihapus. Coba lagi." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/batches");
  redirect("/dashboard/batches?dihapus=1");
}
