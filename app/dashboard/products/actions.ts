"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/src/prisma/db";
import { PRODUCT_MANAGE_ROLES } from "@/src/lib/auth/roles";
import { requireRole } from "@/src/lib/auth/session";
import { getProducerForUser } from "@/src/lib/batches/queries";
import {
  createProductSchema,
  productIdSchema,
  updateProductSchema,
  type ProductFormState,
} from "@/src/lib/products/validation";

function toFieldErrors(
  error: z.ZodError,
): Record<string, string[] | undefined> {
  return error.flatten().fieldErrors;
}

function revalidateProductViews() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/batches/new");
  revalidatePath("/dashboard/producer");
  revalidatePath("/marketplace");
}

export async function createProductAction(
  _previousState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const user = await requireRole(PRODUCT_MANAGE_ROLES);

  const parsed = createProductSchema.safeParse({
    producerId: formData.get("producerId") || undefined,
    name: formData.get("name"),
    category: formData.get("category"),
    unit: formData.get("unit"),
    shelfLifeDays: formData.get("shelfLifeDays"),
    idealTempC: formData.get("idealTempC"),
    basePricePerKg: formData.get("basePricePerKg"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    return {
      error: "Periksa kembali data produk.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  let producerId: number;

  if (user.role === "PRODUCER") {
    const producer = await getProducerForUser(user.id);
    if (!producer) {
      return { error: "Akun produsen ini belum terhubung ke data kebun." };
    }
    producerId = producer.id;
  } else {
    if (!parsed.data.producerId) {
      return {
        error: "Pilih produsen pemilik produk.",
        fieldErrors: { producerId: ["Produsen wajib dipilih."] },
      };
    }

    const producer = await db.orm.public.Producer.where({
      id: parsed.data.producerId,
    }).first();
    if (!producer) {
      return {
        error: "Produsen tidak ditemukan.",
        fieldErrors: { producerId: ["Pilih produsen yang valid."] },
      };
    }
    producerId = producer.id;
  }

  try {
    await db.orm.public.Product.create({
      producerId,
      name: parsed.data.name,
      category: parsed.data.category,
      unit: parsed.data.unit,
      shelfLifeDays: parsed.data.shelfLifeDays,
      idealTempC: parsed.data.idealTempC,
      basePricePerKg: parsed.data.basePricePerKg,
      description: parsed.data.description ?? null,
    });
  } catch (error) {
    console.error("createProductAction", error);
    return { error: "Produk gagal disimpan. Coba lagi." };
  }

  revalidateProductViews();
  return { success: `Produk ${parsed.data.name} berhasil ditambahkan.` };
}

export async function updateProductAction(
  _previousState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const user = await requireRole(PRODUCT_MANAGE_ROLES);

  const parsed = updateProductSchema.safeParse({
    productId: formData.get("productId"),
    name: formData.get("name"),
    category: formData.get("category"),
    unit: formData.get("unit"),
    shelfLifeDays: formData.get("shelfLifeDays"),
    idealTempC: formData.get("idealTempC"),
    basePricePerKg: formData.get("basePricePerKg"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    return {
      error: "Periksa kembali data produk.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const product = await db.orm.public.Product.where({
    id: parsed.data.productId,
  }).first();

  if (!product) {
    return { error: "Produk tidak ditemukan." };
  }

  if (user.role === "PRODUCER") {
    const producer = await getProducerForUser(user.id);
    if (!producer || product.producerId !== producer.id) {
      return { error: "Anda hanya dapat mengubah produk kebun sendiri." };
    }
  }

  try {
    await db.orm.public.Product.where({ id: product.id }).update({
      name: parsed.data.name,
      category: parsed.data.category,
      unit: parsed.data.unit,
      shelfLifeDays: parsed.data.shelfLifeDays,
      idealTempC: parsed.data.idealTempC,
      basePricePerKg: parsed.data.basePricePerKg,
      description: parsed.data.description ?? null,
    });
  } catch (error) {
    console.error("updateProductAction", error);
    return { error: "Perubahan produk gagal disimpan. Coba lagi." };
  }

  revalidateProductViews();
  return { success: `Produk ${parsed.data.name} diperbarui.` };
}

export async function deleteProductAction(
  _previousState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const user = await requireRole(PRODUCT_MANAGE_ROLES);

  const parsed = productIdSchema.safeParse(formData.get("productId"));
  if (!parsed.success) {
    return { error: "Produk tidak valid." };
  }

  const product = await db.orm.public.Product.where({ id: parsed.data })
    .include("batches", (batches) => batches.select("id"))
    .first();

  if (!product) {
    return { error: "Produk tidak ditemukan." };
  }

  if (user.role === "PRODUCER") {
    const producer = await getProducerForUser(user.id);
    if (!producer || product.producerId !== producer.id) {
      return { error: "Anda hanya dapat menghapus produk kebun sendiri." };
    }
  }

  if (product.batches.length > 0) {
    return {
      error: `Produk masih dipakai ${product.batches.length} batch. Hapus batch terlebih dahulu.`,
    };
  }

  try {
    await db.orm.public.Product.where({ id: product.id }).delete();
  } catch (error) {
    console.error("deleteProductAction", error);
    return { error: "Produk gagal dihapus. Coba lagi." };
  }

  revalidateProductViews();
  return { success: `Produk ${product.name} dihapus.` };
}
