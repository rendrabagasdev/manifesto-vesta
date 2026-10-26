"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/src/prisma/db";
import { requireSession } from "@/src/lib/auth/session";
import { ApiError } from "@/src/lib/api/http";
import {
  createOrderFromCart,
  createPreorder,
  createSinglePurchase,
} from "@/src/lib/orders/service";
import { estimateCartRoute } from "@/src/lib/delivery/routes";

export interface PurchaseState {
  ok: boolean;
  error?: string;
  code?: string;
  paymentUrl?: string | null;
  message?: string;
}

const cartLineSchema = z.object({
  batchId: z.coerce.number().int().positive(),
  quantityKg: z.coerce.number().positive().max(100_000),
});

function optionalCoordinate(min: number, max: number) {
  return z.preprocess(
    (value) =>
      value === "" || value === null || value === undefined ? undefined : Number(value),
    z.number().min(min).max(max).optional(),
  );
}

const cartSchema = z.object({
  lines: z.array(cartLineSchema).min(1, "Keranjang kosong.").max(50),
  deliveryAddress: z.string().trim().min(10, "Alamat pengiriman minimal 10 karakter.").max(300),
  deliveryCity: z.string().trim().min(1, "Pilih lokasi pengiriman.").max(60),
  deliveryMethod: z.enum(["INSTANT", "SAME_DAY", "REGULAR"], {
    error: "Pilih metode pengiriman.",
  }),
  deliveryLatitude: optionalCoordinate(-90, 90),
  deliveryLongitude: optionalCoordinate(-180, 180),
  contactPhone: z.string().trim().min(8, "Nomor telepon tidak valid.").max(20),
  notes: z.string().trim().max(300).optional().transform((v) => v || undefined),
});

export interface DeliveryRouteState {
  ok: boolean;
  error?: string;
  distanceKm?: number;
  durationMinutes?: number;
  warehouseName?: string;
  provider?: "OSRM" | "ESTIMATE";
}

const routeEstimateSchema = z.object({
  batchIds: z.array(z.coerce.number().int().positive()).min(1).max(50),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

export async function estimateDeliveryRouteAction(input: {
  batchIds: number[];
  latitude: number;
  longitude: number;
}): Promise<DeliveryRouteState> {
  await requireSession();
  const parsed = routeEstimateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Titik pengiriman tidak valid." };
  }

  try {
    const route = await estimateCartRoute(parsed.data.batchIds, {
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
    });

    if (!route) {
      return { ok: false, error: "Rute belum bisa dihitung untuk titik ini." };
    }

    return {
      ok: true,
      distanceKm: route.distanceKm,
      durationMinutes: route.durationMinutes,
      warehouseName: route.warehouseName,
      provider: route.provider,
    };
  } catch (error) {
    console.error("estimateDeliveryRouteAction", error);
    return { ok: false, error: "Rute belum bisa dihitung." };
  }
}

export async function checkoutAction(
  _previousState: PurchaseState,
  formData: FormData,
): Promise<PurchaseState> {
  const user = await requireSession();

  let rawCart: unknown;
  try {
    rawCart = JSON.parse(String(formData.get("cart") ?? "[]"));
  } catch {
    return { ok: false, error: "Data keranjang tidak valid." };
  }

  const parsed = cartSchema.safeParse({
    lines: rawCart,
    deliveryAddress: formData.get("deliveryAddress"),
    deliveryCity: formData.get("deliveryCity"),
    deliveryMethod: formData.get("deliveryMethod"),
    deliveryLatitude: formData.get("deliveryLatitude"),
    deliveryLongitude: formData.get("deliveryLongitude"),
    contactPhone: formData.get("contactPhone") ?? undefined,
    notes: formData.get("notes") ?? undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Periksa kembali data checkout.",
    };
  }

  try {
    const result = await createOrderFromCart({
      buyerId: Number(user.id),
      buyerName: user.name,
      buyerEmail: user.email,
      lines: parsed.data.lines,
      deliveryAddress: parsed.data.deliveryAddress,
      deliveryCity: parsed.data.deliveryCity,
      deliveryMethod: parsed.data.deliveryMethod,
      deliveryLatitude: parsed.data.deliveryLatitude,
      deliveryLongitude: parsed.data.deliveryLongitude,
      contactPhone: parsed.data.contactPhone,
      notes: parsed.data.notes,
    });

    revalidatePath("/marketplace");
    revalidatePath("/cart");
    revalidatePath("/orders");

    return {
      ok: true,
      code: result.code,
      paymentUrl: null,
      message: "Pesanan COD dibuat. Bayar tunai saat pesanan tiba.",
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false, error: error.message };
    }
    console.error("checkoutAction", error);
    return { ok: false, error: "Checkout gagal. Coba lagi." };
  }
}

const directBuySchema = z.object({
  batchId: z.coerce.number().int().positive(),
  quantityKg: z.coerce.number().positive().max(100_000),
  contactPhone: z.string().trim().max(20).optional().transform((v) => v || undefined),
});

export async function buyRescueDealAction(
  _previousState: PurchaseState,
  formData: FormData,
): Promise<PurchaseState> {
  const user = await requireSession();
  const parsed = directBuySchema.safeParse({
    batchId: formData.get("batchId"),
    quantityKg: formData.get("quantityKg"),
    contactPhone: formData.get("contactPhone") ?? undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Jumlah pembelian tidak valid.",
    };
  }

  try {
    const result = await createSinglePurchase({
      buyerId: Number(user.id),
      buyerName: user.name,
      buyerEmail: user.email,
      batchId: parsed.data.batchId,
      quantityKg: parsed.data.quantityKg,
      source: "RESCUE",
      contactPhone: parsed.data.contactPhone,
    });

    revalidatePath("/rescue-deals");
    revalidatePath("/orders");

    return {
      ok: true,
      code: result.code,
      paymentUrl: result.paymentUrl,
      message: result.paid
        ? "Penawaran diskon dibeli — pembayaran demo lunas."
        : "Mengarahkan ke halaman pembayaran Midtrans...",
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false, error: error.message };
    }
    console.error("buyRescueDealAction", error);
    return { ok: false, error: "Pembelian gagal. Coba lagi." };
  }
}

const listingBuySchema = z.object({
  listingId: z.coerce.number().int().positive(),
  source: z.enum(["FEED", "RESIDUE"]),
  quantityKg: z.coerce.number().positive().max(100_000),
  contactPhone: z.string().trim().max(20).optional().transform((v) => v || undefined),
});

export async function buyListingAction(
  _previousState: PurchaseState,
  formData: FormData,
): Promise<PurchaseState> {
  const user = await requireSession();
  const parsed = listingBuySchema.safeParse({
    listingId: formData.get("listingId"),
    source: formData.get("source"),
    quantityKg: formData.get("quantityKg"),
    contactPhone: formData.get("contactPhone") ?? undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Jumlah pembelian tidak valid.",
    };
  }

  try {
    const listing = parsed.data.source === "FEED"
      ? await db.orm.public.FeedListing
          .where({ id: parsed.data.listingId })
          .select("id", "batchId")
          .first()
      : await db.orm.public.ResidueListing
          .where({ id: parsed.data.listingId })
          .select("id", "batchId")
          .first();

    if (!listing) {
      return { ok: false, error: "Listing tidak ditemukan." };
    }

    const result = await createSinglePurchase({
      buyerId: Number(user.id),
      buyerName: user.name,
      buyerEmail: user.email,
      batchId: listing.batchId,
      quantityKg: parsed.data.quantityKg,
      source: parsed.data.source,
      contactPhone: parsed.data.contactPhone,
    });

    revalidatePath(parsed.data.source === "FEED" ? "/feed" : "/residue");
    revalidatePath("/orders");

    return {
      ok: true,
      code: result.code,
      paymentUrl: result.paymentUrl,
      message: result.paid
        ? "Pembelian berhasil — pembayaran demo lunas."
        : "Mengarahkan ke halaman pembayaran Midtrans...",
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false, error: error.message };
    }
    console.error("buyListingAction", error);
    return { ok: false, error: "Pembelian gagal. Coba lagi." };
  }
}

const preorderSchema = z.object({
  batchId: z.coerce.number().int().positive(),
  quantityKg: z.coerce.number().positive().max(100_000),
  scheduledFor: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pilih tanggal pengiriman."),
  recurrence: z.enum(["NONE", "WEEKLY", "BIWEEKLY", "MONTHLY"]),
  notes: z.string().trim().max(300).optional().transform((v) => v || undefined),
});

export async function preorderAction(
  _previousState: PurchaseState,
  formData: FormData,
): Promise<PurchaseState> {
  const user = await requireSession();
  const parsed = preorderSchema.safeParse({
    batchId: formData.get("batchId"),
    quantityKg: formData.get("quantityKg"),
    scheduledFor: formData.get("scheduledFor"),
    recurrence: formData.get("recurrence"),
    notes: formData.get("notes") ?? undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Periksa kembali data pesanan.",
    };
  }

  try {
    const result = await createPreorder({
      buyerId: Number(user.id),
      buyerName: user.name,
      buyerEmail: user.email,
      batchId: parsed.data.batchId,
      quantityKg: parsed.data.quantityKg,
      scheduledFor: parsed.data.scheduledFor,
      recurrence: parsed.data.recurrence,
      notes: parsed.data.notes,
    });

    revalidatePath("/marketplace/bulk");
    revalidatePath("/orders");

    return {
      ok: true,
      code: result.code,
      message: `Pre-order ${result.code} tercatat. Tim gudang akan mengonfirmasi ketersediaan.`,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false, error: error.message };
    }
    console.error("preorderAction", error);
    return { ok: false, error: "Pre-order gagal. Coba lagi." };
  }
}

/**
 * WhatsApp notification opt-in for locked rescue deals. Fonnte (sandbox) is
 * wired by the backend; the UI records the opt-in per session for the demo.
 */
export async function notifyMeAction(
  _previousState: { ok: boolean; message?: string },
  formData: FormData,
): Promise<{ ok: boolean; message?: string }> {
  await requireSession();
  const dealId = z.coerce.number().int().positive().safeParse(formData.get("dealId"));
  if (!dealId.success) {
    return { ok: false, message: "Penawaran tidak valid." };
  }

  // Demo mode: the opt-in is acknowledged without a provider round-trip.
  return {
    ok: true,
    message:
      "Notifikasi WhatsApp diaktifkan untuk penawaran ini. Anda akan dihubungi saat penawaran dibuka.",
  };
}
