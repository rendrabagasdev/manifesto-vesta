import { randomUUID } from "node:crypto";
import { db } from "@/src/prisma/db";
import { ApiError } from "@/src/lib/api/http";
import { dateCompact } from "@/src/lib/batches/format";
import { STATUS_META } from "@/src/lib/batches/freshness";
import { createSaleImpactLog } from "@/src/lib/impact/ledger";
import { addNormalSpend, consumeRescueQuota, getOrCreateBuyerTier } from "@/src/lib/loyalty/tiers";
import { getDealAccess, type RescueDealWindow } from "@/src/lib/pricing/rescue";
import {
  resolveDeliverySelection,
  type DeliveryMethodId,
} from "@/src/lib/delivery/shipping";
import {
  createSnapTransaction,
  isMidtransConfigured,
  type SnapCustomer,
  type SnapItem,
} from "@/src/lib/payment/midtrans";

type QueryClient = Pick<typeof db, "orm">;
type TxClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface CartLineInput {
  batchId: number;
  quantityKg: number;
}

export interface PurchaseResult {
  code: string;
  paid: boolean;
  paymentUrl: string | null;
}

function createOrderCode(): string {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 5).toUpperCase();
  return `ORD-${dateCompact()}-${suffix}`;
}

async function loadPurchasableBatch(
  client: QueryClient,
  batchId: number,
  options: { forUpdate?: boolean } = {},
) {
  if (options.forUpdate) {
    // Locking clauses cannot be combined with relation includes, so lock the
    // batch row first and reuse this transaction's snapshot for the relations.
    await client.orm.public.Batch.where({ id: batchId }).forUpdate().first();
  }

  const batch = await client.orm.public.Batch
    .where({ id: batchId })
    .include("product", (product) =>
      product.select("id", "name", "category", "unit", "basePricePerKg"),
    )
    .include("warehouse", (warehouse) =>
      warehouse.select("id", "name", "city"),
    )
    .include("priceBreakdown")
    .first();

  if (!batch || !batch.product || !batch.priceBreakdown || !batch.warehouse) {
    throw new ApiError("Batch tidak ditemukan atau belum memiliki harga.", 404, "BATCH_NOT_FOUND");
  }
  return batch as typeof batch & {
    product: NonNullable<typeof batch.product>;
    priceBreakdown: NonNullable<typeof batch.priceBreakdown>;
    warehouse: NonNullable<typeof batch.warehouse>;
  };
}

/**
 * Finalises a freshly created order: asks Midtrans Snap for a payment page when
 * configured, otherwise marks the order PAID right away (demo mode).
 */
async function settleOrder(
  tx: TxClient,
  options: {
    orderId: number;
    code: string;
    total: number;
    items: SnapItem[];
    customer?: SnapCustomer;
  },
): Promise<Pick<PurchaseResult, "paid" | "paymentUrl">> {
  if (!isMidtransConfigured()) {
    await tx.orm.public.Order.where({ id: options.orderId }).update({
      status: "PAID",
      paymentProvider: "DEMO",
      paymentRef: `DEMO-${options.code}`,
      paidAt: new Date().toISOString(),
    });
    return { paid: true, paymentUrl: null };
  }

  const snap = await createSnapTransaction({
    orderId: options.code,
    grossAmount: options.total,
    items: options.items,
    customer: options.customer,
  });

  if (!snap) {
    await tx.orm.public.Order.where({ id: options.orderId }).update({
      status: "PAID",
      paymentProvider: "DEMO",
      paymentRef: `DEMO-${options.code}`,
      paidAt: new Date().toISOString(),
    });
    return { paid: true, paymentUrl: null };
  }

  await tx.orm.public.Order.where({ id: options.orderId }).update({
    paymentProvider: "MIDTRANS_SNAP",
    paymentRef: snap.token,
    paymentUrl: snap.redirectUrl,
  });
  return { paid: false, paymentUrl: snap.redirectUrl };
}

/** Checkout for the marketplace cart: several FRESH batches at normal price. */
export async function createOrderFromCart(options: {
  buyerId: number;
  buyerName?: string | null;
  buyerEmail?: string | null;
  lines: CartLineInput[];
  deliveryAddress: string;
  deliveryCity?: string;
  deliveryMethod?: DeliveryMethodId;
  contactPhone: string;
  notes?: string;
}): Promise<PurchaseResult> {
  if (options.lines.length === 0) {
    throw new ApiError("Keranjang kosong.", 400, "EMPTY_CART");
  }

  const now = new Date();
  const code = createOrderCode();

  const quantities = new Map<number, number>();
  for (const line of options.lines) {
    if (!Number.isFinite(line.quantityKg) || line.quantityKg <= 0) {
      throw new ApiError("Jumlah pembelian tidak valid.", 400, "INVALID_QTY");
    }
    quantities.set(
      line.batchId,
      (quantities.get(line.batchId) ?? 0) + line.quantityKg,
    );
  }

  // Lock rows in a stable order so concurrent carts cannot deadlock.
  const requestedLines = [...quantities.entries()]
    .map(([batchId, quantityKg]) => ({ batchId, quantityKg }))
    .sort((a, b) => a.batchId - b.batchId);

  const result = await db.transaction(async (tx) => {
    let subtotal = 0;
    const prepared: Array<{
      batch: Awaited<ReturnType<typeof loadPurchasableBatch>>;
      quantityKg: number;
      pricePerKg: number;
      lineTotal: number;
    }> = [];

    for (const line of requestedLines) {
      const batch = await loadPurchasableBatch(tx, line.batchId, {
        forUpdate: true,
      });
      const availableKg = Math.max(0, batch.quantityKg - batch.reservedKg);

      if (batch.status !== "FRESH") {
        throw new ApiError(
          `${batch.product.name} tidak lagi dijual dengan harga normal.`,
          409,
          "BATCH_NOT_FRESH",
        );
      }
      if (line.quantityKg > availableKg) {
        throw new ApiError(
          `Stok ${batch.product.name} tersisa ${availableKg} ${batch.product.unit}.`,
          409,
          "INSUFFICIENT_STOCK",
        );
      }

      const pricePerKg = batch.priceBreakdown!.finalPricePerKg;
      const lineTotal = Math.round(pricePerKg * line.quantityKg);
      subtotal += lineTotal;
      prepared.push({ batch, quantityKg: line.quantityKg, pricePerKg, lineTotal });
    }

    const delivery =
      options.deliveryCity || options.deliveryMethod
        ? resolveDeliverySelection({
            cityId: options.deliveryCity,
            methodId: options.deliveryMethod,
            warehouseCities: prepared.map((line) => line.batch.warehouse.city),
            now,
          })
        : null;

    if (delivery && !delivery.ok) {
      throw new ApiError(
        delivery.message,
        delivery.code === "INVALID_CITY" ? 400 : 409,
        delivery.code,
      );
    }

    const deliverySelection = delivery?.ok ? delivery : null;

    const order = await tx.orm.public.Order.create({
      code,
      buyerId: options.buyerId,
      kind: "REGULAR",
      status: "PENDING",
      subtotal,
      discount: 0,
      total: subtotal,
      deliveryAddress: options.deliveryAddress,
      deliveryCity: deliverySelection?.city.label ?? null,
      deliveryMethod: deliverySelection?.method ?? null,
      estimatedDeliveryAt:
        deliverySelection?.estimatedDeliveryAt.toISOString() ?? null,
      contactPhone: options.contactPhone,
      notes: options.notes ?? null,
    });

    for (const line of prepared) {
      await tx.orm.public.OrderItem.create({
        orderId: order.id,
        batchId: line.batch.id,
        quantityKg: line.quantityKg,
        pricePerKg: line.pricePerKg,
        lineTotal: line.lineTotal,
        stage: "FRESH",
      });

      await tx.orm.public.Batch.where({ id: line.batch.id }).update({
        reservedKg: line.batch.reservedKg + line.quantityKg,
      });

      await createSaleImpactLog(tx, {
        batchId: line.batch.id,
        orderId: order.id,
        quantityKg: line.quantityKg,
        category: line.batch.product.category,
        stage: "FRESH",
      });
    }

    // Loyalty points only come from normal-price purchases.
    await addNormalSpend(tx, {
      userId: options.buyerId,
      amount: subtotal,
      orderId: order.id,
      description: `Belanja marketplace ${code}`,
      at: now,
      lockTier: true,
    });

    const settle = await settleOrder(tx, {
      orderId: order.id,
      code,
      total: subtotal,
      items: prepared.map((line) => ({
        id: String(line.batch.id),
        price: line.pricePerKg,
        quantity: line.quantityKg,
        name: line.batch.product.name.slice(0, 50),
      })),
      customer: {
        first_name: options.buyerName ?? undefined,
        email: options.buyerEmail ?? undefined,
        phone: options.contactPhone,
      },
    });

    return { code, ...settle };
  });

  return result;
}

/** Direct purchase of one rescue deal, feed listing or residue listing. */
export async function createSinglePurchase(options: {
  buyerId: number;
  buyerName?: string | null;
  buyerEmail?: string | null;
  batchId: number;
  quantityKg: number;
  source: "RESCUE" | "FEED" | "RESIDUE";
  contactPhone?: string;
}): Promise<PurchaseResult> {
  const qty = options.quantityKg;
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new ApiError("Jumlah pembelian tidak valid.", 400, "INVALID_QTY");
  }

  const now = new Date();
  const stage: "RESCUE" | "FEED" | "RESIDUE" = options.source;
  const code = createOrderCode();

  const result = await db.transaction(async (tx) => {
    const batch = await loadPurchasableBatch(tx, options.batchId, {
      forUpdate: true,
    });
    const availableKg = Math.max(0, batch.quantityKg - batch.reservedKg);

    if (qty > availableKg) {
      throw new ApiError(
        `Stok tersisa ${availableKg} ${batch.product.unit}.`,
        409,
        "INSUFFICIENT_STOCK",
      );
    }

    const tier = await getOrCreateBuyerTier(tx, options.buyerId, {
      forUpdate: true,
    });

    let pricePerKg: number;

    if (options.source === "RESCUE") {
      if (batch.status !== "RESCUE") {
        throw new ApiError("Penawaran ini sudah tidak aktif.", 409, "DEAL_INACTIVE");
      }
      const deal = await tx.orm.public.RescueDeal
        .where({ batchId: batch.id, isActive: true })
        .forUpdate()
        .first();
      if (!deal) {
        throw new ApiError("Penawaran ini sudah tidak aktif.", 409, "DEAL_INACTIVE");
      }

      const access = getDealAccess(
        {
          startsAt: deal.startsAt,
          endsAt: deal.endsAt,
          earlyAccessHours: deal.earlyAccessHours,
        } satisfies RescueDealWindow,
        tier.earlyAccessHours ?? 0,
        now,
        deal.isActive,
      );
      if (!access.accessible) {
        throw new ApiError(
          "Penawaran ini belum bisa Anda akses. Tunggu akses awal tier Anda terbuka.",
          403,
          "DEAL_LOCKED",
        );
      }

      await consumeRescueQuota(tx, options.buyerId, now, 1, {
        lockTier: true,
      });
      pricePerKg = deal.rescuePricePerKg;
    } else {
      const listing = options.source === "FEED"
        ? await tx.orm.public.FeedListing.where({ batchId: batch.id, isActive: true }).first()
        : await tx.orm.public.ResidueListing.where({ batchId: batch.id, isActive: true }).first();
      if (!listing) {
        throw new ApiError("Listing tidak aktif.", 409, "LISTING_INACTIVE");
      }
      pricePerKg = listing.pricePerKg;
    }

    const lineTotal = Math.round(pricePerKg * qty);

    const order = await tx.orm.public.Order.create({
      code,
      buyerId: options.buyerId,
      kind: "REGULAR",
      status: "PENDING",
      subtotal: lineTotal,
      discount: 0,
      total: lineTotal,
      tierAtPurchase: tier.tier,
      contactPhone: options.contactPhone ?? null,
      notes: `Pembelian langsung tahap ${STATUS_META[stage].label}`,
    });

    await tx.orm.public.OrderItem.create({
      orderId: order.id,
      batchId: batch.id,
      quantityKg: qty,
      pricePerKg,
      lineTotal,
      stage,
    });

    await tx.orm.public.Batch.where({ id: batch.id }).update({
      reservedKg: batch.reservedKg + qty,
    });

    await createSaleImpactLog(tx, {
      batchId: batch.id,
      orderId: order.id,
      quantityKg: qty,
      category: batch.product.category,
      stage,
    });

    const settle = await settleOrder(tx, {
      orderId: order.id,
      code,
      total: lineTotal,
      items: [
        {
          id: String(batch.id),
          price: pricePerKg,
          quantity: qty,
          name: batch.product.name.slice(0, 50),
        },
      ],
      customer: {
        first_name: options.buyerName ?? undefined,
        email: options.buyerEmail ?? undefined,
      },
    });

    return { code, ...settle };
  });

  return result;
}

/** B2B bulk / pre-order: recorded as a PENDING order for warehouse confirmation. */
export async function createPreorder(options: {
  buyerId: number;
  buyerName?: string | null;
  buyerEmail?: string | null;
  batchId: number;
  quantityKg: number;
  scheduledFor: string;
  recurrence: string;
  notes?: string;
}): Promise<{ code: string }> {
  if (!Number.isFinite(options.quantityKg) || options.quantityKg <= 0) {
    throw new ApiError("Jumlah pesanan tidak valid.", 400, "INVALID_QTY");
  }

  const code = createOrderCode();

  await db.transaction(async (tx) => {
    const batch = await loadPurchasableBatch(tx, options.batchId, {
      forUpdate: true,
    });
    const availableKg = Math.max(0, batch.quantityKg - batch.reservedKg);
    if (options.quantityKg > availableKg) {
      throw new ApiError(
        `Stok tersisa ${availableKg} ${batch.product.unit}.`,
        409,
        "INSUFFICIENT_STOCK",
      );
    }

    const pricePerKg = batch.priceBreakdown!.finalPricePerKg;
    const lineTotal = Math.round(pricePerKg * options.quantityKg);

    const order = await tx.orm.public.Order.create({
      code,
      buyerId: options.buyerId,
      kind: "PREORDER",
      status: "PENDING",
      subtotal: lineTotal,
      discount: 0,
      total: lineTotal,
      deliveryAddress: null,
      scheduledFor: options.scheduledFor,
      notes: [
        options.recurrence !== "NONE" ? `Pesanan berulang: ${options.recurrence}` : null,
        options.notes ?? null,
      ]
        .filter(Boolean)
        .join(" · ") || null,
    });

    await tx.orm.public.OrderItem.create({
      orderId: order.id,
      batchId: batch.id,
      quantityKg: options.quantityKg,
      pricePerKg,
      lineTotal,
      stage: "FRESH",
    });

    await tx.orm.public.Batch.where({ id: batch.id }).update({
      reservedKg: batch.reservedKg + options.quantityKg,
    });
  });

  return { code };
}
