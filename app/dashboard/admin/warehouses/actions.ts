"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/src/prisma/db";
import { requireRole } from "@/src/lib/auth/session";
import {
  createWarehouseSchema,
  updateWarehouseSchema,
  warehouseIdSchema,
  type WarehouseFormState,
} from "@/src/lib/warehouses/validation";

const MANAGER_ROLE_ERROR: WarehouseFormState = {
  error: "Manajer gudang harus akun dengan peran Gudang.",
  fieldErrors: { managerId: ["Pilih akun yang berperan Gudang."] },
};

function toFieldErrors(
  error: z.ZodError,
): Record<string, string[] | undefined> {
  return error.flatten().fieldErrors;
}

async function managerIsValid(managerId: number | undefined): Promise<boolean> {
  if (managerId === undefined) return true;
  const manager = await db.orm.public.User.where({ id: managerId })
    .select("id", "role")
    .first();
  return manager?.role === "WAREHOUSE";
}

function revalidateWarehouseViews() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/warehouses");
  revalidatePath("/dashboard/batches/new");
}

export async function createWarehouseAction(
  _previousState: WarehouseFormState,
  formData: FormData,
): Promise<WarehouseFormState> {
  await requireRole(["ADMIN"]);

  const parsed = createWarehouseSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address"),
    city: formData.get("city"),
    capacityKg: formData.get("capacityKg"),
    managerId: formData.get("managerId"),
  });

  if (!parsed.success) {
    return {
      error: "Periksa kembali data gudang.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  if (!(await managerIsValid(parsed.data.managerId))) {
    return MANAGER_ROLE_ERROR;
  }

  try {
    await db.orm.public.Warehouse.create({
      name: parsed.data.name,
      address: parsed.data.address ?? null,
      city: parsed.data.city ?? null,
      capacityKg: parsed.data.capacityKg,
      managerId: parsed.data.managerId ?? null,
    });
  } catch (error) {
    console.error("createWarehouseAction", error);
    return { error: "Gudang gagal disimpan. Coba lagi." };
  }

  revalidateWarehouseViews();
  return { success: `Gudang ${parsed.data.name} berhasil ditambahkan.` };
}

export async function updateWarehouseAction(
  _previousState: WarehouseFormState,
  formData: FormData,
): Promise<WarehouseFormState> {
  await requireRole(["ADMIN"]);

  const parsed = updateWarehouseSchema.safeParse({
    warehouseId: formData.get("warehouseId"),
    name: formData.get("name"),
    address: formData.get("address"),
    city: formData.get("city"),
    capacityKg: formData.get("capacityKg"),
    managerId: formData.get("managerId"),
  });

  if (!parsed.success) {
    return {
      error: "Periksa kembali data gudang.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const existing = await db.orm.public.Warehouse.where({
    id: parsed.data.warehouseId,
  }).first();

  if (!existing) {
    return { error: "Gudang tidak ditemukan." };
  }

  if (!(await managerIsValid(parsed.data.managerId))) {
    return MANAGER_ROLE_ERROR;
  }

  try {
    await db.orm.public.Warehouse.where({ id: existing.id }).update({
      name: parsed.data.name,
      address: parsed.data.address ?? null,
      city: parsed.data.city ?? null,
      capacityKg: parsed.data.capacityKg,
      managerId: parsed.data.managerId ?? null,
    });
  } catch (error) {
    console.error("updateWarehouseAction", error);
    return { error: "Perubahan gudang gagal disimpan. Coba lagi." };
  }

  revalidateWarehouseViews();
  return { success: `Data gudang ${parsed.data.name} diperbarui.` };
}

export async function deleteWarehouseAction(
  _previousState: WarehouseFormState,
  formData: FormData,
): Promise<WarehouseFormState> {
  await requireRole(["ADMIN"]);

  const parsed = warehouseIdSchema.safeParse(formData.get("warehouseId"));

  if (!parsed.success) {
    return { error: "Gudang tidak valid." };
  }

  const warehouse = await db.orm.public.Warehouse.where({ id: parsed.data })
    .include("batches", (batches) => batches.select("id"))
    .first();

  if (!warehouse) {
    return { error: "Gudang tidak ditemukan." };
  }

  if (warehouse.batches.length > 0) {
    return {
      error: `Gudang masih menampung ${warehouse.batches.length} batch. Pindahkan atau hapus batch terlebih dahulu.`,
    };
  }

  try {
    await db.orm.public.Warehouse.where({ id: warehouse.id }).delete();
  } catch (error) {
    console.error("deleteWarehouseAction", error);
    return { error: "Gudang gagal dihapus. Coba lagi." };
  }

  revalidateWarehouseViews();
  return { success: `Gudang ${warehouse.name} dihapus.` };
}
