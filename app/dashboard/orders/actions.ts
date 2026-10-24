"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ApiError } from "@/src/lib/api/http";
import { ORDER_FULFILL_ROLES } from "@/src/lib/auth/roles";
import { requireRole } from "@/src/lib/auth/session";
import { completeOrder, shipOrder } from "@/src/lib/orders/fulfillment";

export interface FulfillmentActionState {
  error?: string;
  success?: string;
}

const orderIdSchema = z.coerce.number().int().positive();

function revalidateFulfillmentViews() {
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/warehouse");
  revalidatePath("/orders");
}

export async function shipOrderAction(
  _previousState: FulfillmentActionState,
  formData: FormData,
): Promise<FulfillmentActionState> {
  const user = await requireRole(ORDER_FULFILL_ROLES);

  const parsed = orderIdSchema.safeParse(formData.get("orderId"));
  if (!parsed.success) {
    return { error: "Pesanan tidak valid." };
  }

  try {
    const result = await shipOrder(user, parsed.data);
    revalidateFulfillmentViews();
    return { success: `Pesanan ${result.code} ditandai dikirim.` };
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    console.error("shipOrderAction", error);
    return { error: "Pesanan gagal dikirim. Coba lagi." };
  }
}

export async function completeOrderAction(
  _previousState: FulfillmentActionState,
  formData: FormData,
): Promise<FulfillmentActionState> {
  const user = await requireRole(ORDER_FULFILL_ROLES);

  const parsed = orderIdSchema.safeParse(formData.get("orderId"));
  if (!parsed.success) {
    return { error: "Pesanan tidak valid." };
  }

  try {
    const result = await completeOrder(user, parsed.data);
    revalidateFulfillmentViews();
    return { success: `Pesanan ${result.code} diselesaikan.` };
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    console.error("completeOrderAction", error);
    return { error: "Pesanan gagal diselesaikan. Coba lagi." };
  }
}
