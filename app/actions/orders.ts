"use server";

/**
 * Checkout + rescue mutations as Server Actions.
 *
 * The heavy lifting (pricing, stock reservation, loyalty points, impact ledger,
 * Midtrans settlement) stays in `src/lib/orders/service.ts`; this layer adds
 * RBAC, Zod validation, quota pre-checks and WhatsApp confirmations.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/src/prisma/db";
import { ApiError } from "@/src/lib/api/http";
import { requireRole, type SessionUser } from "@/src/lib/auth/session";
import { getQuotaStatus, type QuotaStatus } from "@/src/lib/loyalty/tiers";
import {
  createOrderFromCart,
  createPreorder,
  createSinglePurchase,
} from "@/src/lib/orders/service";
import { sendOrderConfirmation } from "@/src/lib/notifications/fonnte";
import { getDealAccess } from "@/src/lib/pricing/rescue";

const BUYER_ROLES = ["CONSUMER", "BUSINESS", "ADMIN"] as const;

export type PurchaseSource = "FRESH" | "RESCUE" | "FEED" | "RESIDUE";

export interface OrderItemInput {
  batchId: number | string;
  quantityKg: number | string;
  /** Defaults to FRESH. A non-FRESH line is a direct single-batch purchase. */
  source?: PurchaseSource;
}

export interface PlaceOrderOptions {
  deliveryAddress?: string;
  contactPhone?: string;
  notes?: string;
  kind?: "REGULAR" | "PREORDER";
  scheduledFor?: string;
  recurrence?: "NONE" | "WEEKLY" | "BIWEEKLY" | "MONTHLY";
}

export interface OrderActionResult {
  ok: boolean;
  error?: string;
  errorCode?: string;
  code?: string;
  paid?: boolean;
  paymentUrl?: string | null;
  message?: string;
  quota?: QuotaStatus;
  quotaRemaining?: number;
}

const orderItemSchema = z.object({
  batchId: z.coerce
    .number({ error: "Batch tidak valid." })
    .int("Batch tidak valid.")
    .positive("Batch tidak valid."),
  quantityKg: z.coerce
    .number({ error: "Jumlah tidak valid." })
    .positive("Jumlah pembelian harus lebih dari 0 kg.")
    .max(100_000, "Jumlah pembelian maksimal 100.000 kg."),
  source: z.enum(["FRESH", "RESCUE", "FEED", "RESIDUE"]).optional(),
});

const orderItemsSchema = z
  .array(orderItemSchema)
  .min(1, "Keranjang kosong.")
  .max(50, "Maksimal 50 item per pesanan.");

const placeOrderOptionsSchema = z
  .object({
    deliveryAddress: z.string().trim().min(1).max(300).optional(),
    contactPhone: z.string().trim().min(8).max(20).optional(),
    notes: z.string().trim().max(300).optional(),
    kind: z.enum(["REGULAR", "PREORDER"]).optional(),
    scheduledFor: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal pengiriman tidak valid.")
      .optional(),
    recurrence: z.enum(["NONE", "WEEKLY", "BIWEEKLY", "MONTHLY"]).optional(),
  })
  .partial();

const claimSchema = z.object({
  dealId: z.coerce
    .number({ error: "Penawaran tidak valid." })
    .int("Penawaran tidak valid.")
    .positive("Penawaran tidak valid."),
  quantityKg: z.coerce
    .number({ error: "Jumlah tidak valid." })
    .positive("Jumlah pembelian layu harus lebih dari 0 kg.")
    .max(100_000, "Jumlah pembelian layu maksimal 100.000 kg."),
});

const DEFAULT_ADDRESS = "Diambil langsung di gudang";
const DEFAULT_PHONE = "081200000000";

function revalidate(paths: readonly string[]): void {
  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch {
      // Unit tests run outside a Next.js request context.
    }
  }
}

function tomorrow(): string {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function userIdOf(user: SessionUser): number {
  const id = Number(user.id);
  if (!Number.isFinite(id) || id <= 0) {
    throw new ApiError("Sesi pengguna tidak valid", 401, "INVALID_SESSION");
  }
  return id;
}

function mapError(error: unknown, fallback: string): OrderActionResult {
  if (error instanceof ApiError) {
    return { ok: false, error: error.message, errorCode: error.code };
  }
  console.error("orderAction", error);
  return { ok: false, error: fallback };
}

async function notifyOrder(
  code: string,
  contactPhone: string | undefined,
): Promise<void> {
  const phone = contactPhone?.trim();
  if (!phone) return;

  const order = await db.orm.public.Order.where({ code })
    .include("items", (items) =>
      items.include("batch", (batch) =>
        batch.include("product", (product) => product.select("id", "name")),
      ),
    )
    .first();

  if (!order) return;

  await sendOrderConfirmation(phone, {
    code: order.code,
    total: order.total,
    subtotal: order.subtotal,
    status: order.status,
    deliveryAddress: order.deliveryAddress,
    items: order.items.map((item) => ({
      quantityKg: item.quantityKg,
      pricePerKg: item.pricePerKg,
      lineTotal: item.lineTotal,
      batch: item.batch
        ? {
            code: item.batch.code,
            product: item.batch.product
              ? { name: item.batch.product.name }
              : null,
          }
        : null,
    })),
  });
}

export interface PlaceOrderPayload extends PlaceOrderOptions {
  items: OrderItemInput[];
}

/**
 * Place a marketplace order (FRESH cart) or a direct stage purchase.
 */
export async function placeOrderAction(
  itemsOrPayload: OrderItemInput[] | OrderItemInput | PlaceOrderPayload,
  options: PlaceOrderOptions = {},
): Promise<OrderActionResult> {
  const user = await requireRole(BUYER_ROLES);

  let items: OrderItemInput[] | OrderItemInput =
    itemsOrPayload as OrderItemInput[] | OrderItemInput;
  let effectiveOptions = options;

  if (
    !Array.isArray(itemsOrPayload) &&
    "items" in itemsOrPayload &&
    Array.isArray(itemsOrPayload.items)
  ) {
    const { items: payloadItems, ...payloadOptions } = itemsOrPayload;
    items = payloadItems;
    effectiveOptions = { ...payloadOptions, ...options };
  }

  const parsedItems = orderItemsSchema.safeParse(
    Array.isArray(items) ? items : [items],
  );
  if (!parsedItems.success) {
    return {
      ok: false,
      error:
        parsedItems.error.issues[0]?.message ?? "Periksa kembali item pesanan.",
      errorCode: "VALIDATION_ERROR",
    };
  }

  const parsedOptions = placeOrderOptionsSchema.safeParse(effectiveOptions);
  if (!parsedOptions.success) {
    return {
      ok: false,
      error:
        parsedOptions.error.issues[0]?.message ?? "Periksa kembali data pesanan.",
      errorCode: "VALIDATION_ERROR",
    };
  }

  const lines = parsedItems.data;
  const config = parsedOptions.data;
  const buyerId = userIdOf(user);
  const deliveryAddress = config.deliveryAddress ?? DEFAULT_ADDRESS;
  const contactPhone = config.contactPhone ?? DEFAULT_PHONE;

  const directLines = lines.filter(
    (line) => line.source !== undefined && line.source !== "FRESH",
  );

  if (directLines.length > 0) {
    if (lines.length !== 1) {
      return {
        ok: false,
        error:
          "Pembelian Layu/Pakan/Residu hanya dapat dilakukan satu batch per pesanan.",
        errorCode: "MIXED_SOURCES",
      };
    }

    const line = directLines[0];
    try {
      const result = await createSinglePurchase({
        buyerId,
        buyerName: user.name,
        buyerEmail: user.email,
        batchId: line.batchId,
        quantityKg: line.quantityKg,
        source: line.source as "RESCUE" | "FEED" | "RESIDUE",
        contactPhone,
      });

      await notifyOrder(result.code, contactPhone);
      revalidate(["/marketplace", "/rescue-deals", "/feed", "/residue", "/orders"]);

      return {
        ok: true,
        code: result.code,
        paid: result.paid,
        paymentUrl: result.paymentUrl,
        message: result.paid
          ? "Pembelian berhasil — pembayaran demo lunas."
          : "Mengarahkan ke halaman pembayaran Midtrans...",
      };
    } catch (error) {
      return mapError(error, "Pembelian gagal. Coba lagi.");
    }
  }

  if (config.kind === "PREORDER") {
    if (lines.length !== 1) {
      return {
        ok: false,
        error: "Pre-order hanya dapat dilakukan untuk satu batch.",
        errorCode: "INVALID_PREORDER",
      };
    }

    try {
      const result = await createPreorder({
        buyerId,
        buyerName: user.name,
        buyerEmail: user.email,
        batchId: lines[0].batchId,
        quantityKg: lines[0].quantityKg,
        scheduledFor: config.scheduledFor ?? tomorrow(),
        recurrence: config.recurrence ?? "NONE",
        notes: config.notes,
      });

      revalidate(["/marketplace/bulk", "/orders"]);

      return {
        ok: true,
        code: result.code,
        paid: false,
        paymentUrl: null,
        message: `Pre-order ${result.code} tercatat. Tim gudang akan mengonfirmasi ketersediaan.`,
      };
    } catch (error) {
      return mapError(error, "Pre-order gagal. Coba lagi.");
    }
  }

  try {
    const result = await createOrderFromCart({
      buyerId,
      buyerName: user.name,
      buyerEmail: user.email,
      lines: lines.map((line) => ({
        batchId: line.batchId,
        quantityKg: line.quantityKg,
      })),
      deliveryAddress,
      contactPhone,
      notes: config.notes,
    });

    await notifyOrder(result.code, contactPhone);
    revalidate(["/marketplace", "/cart", "/orders"]);

    return {
      ok: true,
      code: result.code,
      paid: result.paid,
      paymentUrl: result.paymentUrl,
      message: result.paid
        ? "Pembayaran demo berhasil — pesanan ditandai lunas."
        : "Mengarahkan ke halaman pembayaran Midtrans...",
    };
  } catch (error) {
    return mapError(error, "Checkout gagal. Coba lagi.");
  }
}

/**
 * Claim one active Rescue Deal with the buyer's weekly quota and tier-based
 * early access enforced by the order service.
 */
export async function claimRescueDealAction(
  dealId: number | string,
  quantityKg: number | string,
): Promise<OrderActionResult> {
  const user = await requireRole(BUYER_ROLES);

  const parsed = claimSchema.safeParse({ dealId, quantityKg });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Penawaran tidak valid.",
      errorCode: "VALIDATION_ERROR",
    };
  }

  const buyerId = userIdOf(user);

  const deal = await db.orm.public.RescueDeal.where({ id: parsed.data.dealId })
    .include("batch", (batch) =>
      batch
        .include("product", (product) =>
          product.select("id", "name", "category", "unit"),
        )
        .include("warehouse", (warehouse) =>
          warehouse.select("id", "name", "city"),
        ),
    )
    .first();

  if (!deal || !deal.batch || !deal.batch.product) {
    return {
      ok: false,
      error: "Penawaran tidak ditemukan.",
      errorCode: "DEAL_NOT_FOUND",
    };
  }

  if (!deal.isActive || deal.batch.status !== "RESCUE") {
    return {
      ok: false,
      error: "Penawaran ini sudah tidak aktif.",
      errorCode: "DEAL_INACTIVE",
    };
  }

  const quotaBefore = await getQuotaStatus(db, buyerId);
  if (quotaBefore.remaining < 1) {
    return {
      ok: false,
      error: `Kuota layu mingguan Anda habis (${quotaBefore.used}/${quotaBefore.limit}). Kuota baru tersedia ${quotaBefore.resetsAt}.`,
      errorCode: "RESCUE_QUOTA_EXHAUSTED",
      quota: quotaBefore,
      quotaRemaining: 0,
    };
  }

  const access = getDealAccess(
    {
      startsAt: deal.startsAt,
      endsAt: deal.endsAt,
      earlyAccessHours: deal.earlyAccessHours,
    },
    quotaBefore.earlyAccessHours,
    new Date(),
    deal.isActive,
  );

  if (!access.accessible) {
    return {
      ok: false,
      error:
        access.reason === "EARLY_ACCESS_LOCKED"
          ? "Penawaran ini belum bisa Anda akses. Tunggu akses awal tier Anda terbuka."
          : access.reason === "EXPIRED"
            ? "Penawaran ini sudah berakhir."
            : "Penawaran ini belum tersedia.",
      errorCode: access.reason,
      quota: quotaBefore,
      quotaRemaining: quotaBefore.remaining,
    };
  }

  const availableKg = Math.max(
    0,
    deal.batch.quantityKg - deal.batch.reservedKg,
  );

  try {
    const result = await createSinglePurchase({
      buyerId,
      buyerName: user.name,
      buyerEmail: user.email,
      batchId: deal.batch.id,
      quantityKg: parsed.data.quantityKg,
      source: "RESCUE",
    });

    const quotaAfter = await getQuotaStatus(db, buyerId);

    await notifyOrder(result.code, undefined);
    revalidate(["/rescue-deals", "/orders", "/marketplace"]);

    return {
      ok: true,
      code: result.code,
      paid: result.paid,
      paymentUrl: result.paymentUrl,
      quota: quotaAfter,
      quotaRemaining: quotaAfter.remaining,
      message: result.paid
        ? `Penawaran layu berhasil diklaim (${quantityKg} kg dari ${availableKg} kg tersedia).`
        : "Mengarahkan ke halaman pembayaran Midtrans...",
    };
  } catch (error) {
    const mapped = mapError(error, "Pembelian layu gagal. Coba lagi.");
    if (mapped.errorCode === "RESCUE_QUOTA_EXHAUSTED") {
      mapped.quota = await getQuotaStatus(db, buyerId).catch(() => quotaBefore);
      mapped.quotaRemaining = mapped.quota?.remaining ?? 0;
    }
    return mapped;
  }
}
