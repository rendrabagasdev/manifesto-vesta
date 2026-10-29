/**
 * Midtrans Snap helper (sandbox by default).
 *
 * Behaviour:
 * - `createSnapTransaction` returns a Snap token + redirect URL when
 *   MIDTRANS_SERVER_KEY is configured. Any network error, timeout or non-2xx
 *   response degrades to `null` so the caller can fall back to demo payments.
 * - `handleNotification` verifies Midtrans' SHA-512 signature (when a server
 *   key is configured) and reconciles the local order status.
 */

import { createHash, timingSafeEqual } from "node:crypto";
import { db } from "@/src/prisma/db";
import { ApiError } from "@/src/lib/api/http";
import { creditOrderPayment, revokeOrderPayment } from "@/src/lib/wallet/service";

const SANDBOX_SNAP_ENDPOINT =
  "https://app.sandbox.midtrans.com/snap/v1/transactions";
const PRODUCTION_SNAP_ENDPOINT =
  "https://app.midtrans.com/snap/v1/transactions";

export const MIDTRANS_TIMEOUT_MS = 1_500;

export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "SHIPPED"
  | "COMPLETED"
  | "CANCELLED";

export type MidtransTransactionStatus =
  | "capture"
  | "settlement"
  | "pending"
  | "deny"
  | "cancel"
  | "expire"
  | "failure"
  | "refund"
  | "partial_refund"
  | string;

export interface SnapItem {
  id: string;
  price: number;
  quantity: number;
  name: string;
}

export interface SnapCustomer {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
}

export interface CustomerDetails extends SnapCustomer {
  billing_address?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    country_code?: string;
  };
  shipping_address?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    country_code?: string;
  };
}

export interface SnapResult {
  token: string;
  redirectUrl: string;
}

export interface SnapTransactionOptions {
  orderId: string;
  grossAmount: number;
  items?: SnapItem[];
  customer?: SnapCustomer;
}

export interface MidtransNotification {
  order_id: string;
  status_code?: string;
  gross_amount?: string | number;
  signature_key?: string;
  transaction_status: MidtransTransactionStatus;
  fraud_status?: string | null;
  transaction_id?: string | null;
  payment_type?: string | null;
  status_message?: string | null;
}

export interface PaymentResult {
  orderId: string;
  status: OrderStatus;
  transactionStatus: MidtransTransactionStatus;
  fraudStatus: string | null;
  paid: boolean;
  found: boolean;
  grossAmount: number;
}

export function isMidtransConfigured(): boolean {
  return Boolean(process.env.MIDTRANS_SERVER_KEY?.trim());
}

export function isSandboxMode(): boolean {
  return process.env.MIDTRANS_IS_PRODUCTION !== "true";
}

export function getSnapEndpoint(): string {
  return isSandboxMode() ? SANDBOX_SNAP_ENDPOINT : PRODUCTION_SNAP_ENDPOINT;
}

/**
 * Midtrans signature: SHA512(order_id + status_code + gross_amount + serverKey).
 */
export function createMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey = process.env.MIDTRANS_SERVER_KEY?.trim() ?? "",
): string {
  return createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest("hex");
}

export function verifyMidtransSignature(
  payload: MidtransNotification,
): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
  if (!serverKey) return true;
  if (!payload.signature_key) return false;

  const expected = createMidtransSignature(
    payload.order_id,
    payload.status_code ?? "",
    String(payload.gross_amount ?? ""),
    serverKey,
  );

  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(payload.signature_key, "utf8");
  if (expectedBuffer.length !== receivedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function mapTransactionStatus(
  transactionStatus: MidtransTransactionStatus,
  fraudStatus?: string | null,
): OrderStatus {
  switch (transactionStatus) {
    case "capture":
      return fraudStatus === "challenge" ? "PENDING" : "PAID";
    case "settlement":
      return "PAID";
    case "pending":
      return "PENDING";
    case "deny":
    case "cancel":
    case "expire":
    case "failure":
    case "refund":
    case "partial_refund":
      return "CANCELLED";
    default:
      return "PENDING";
  }
}

function buildDemoItems(orderId: string, amount: number): SnapItem[] {
  return [
    {
      id: orderId,
      price: Math.max(1, Math.round(amount)),
      quantity: 1,
      name: `Pesanan ${orderId}`.slice(0, 50),
    },
  ];
}

/**
 * Create a Snap transaction.
 *
 * Both call styles are supported so older callers keep working:
 *   createSnapTransaction({ orderId, grossAmount, items, customer })
 *   createSnapTransaction(orderId, amount, customerDetails)
 */
export async function createSnapTransaction(
  options: SnapTransactionOptions,
): Promise<SnapResult | null>;
export async function createSnapTransaction(
  orderId: string,
  amount: number,
  customerDetails?: CustomerDetails,
): Promise<SnapResult | null>;
export async function createSnapTransaction(
  optionsOrOrderId: SnapTransactionOptions | string,
  amount?: number,
  customerDetails?: CustomerDetails,
): Promise<SnapResult | null> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
  if (!serverKey) return null;

  const options: SnapTransactionOptions =
    typeof optionsOrOrderId === "string"
      ? {
          orderId: optionsOrOrderId,
          grossAmount: amount ?? 0,
          items: buildDemoItems(optionsOrOrderId, amount ?? 0),
          customer: customerDetails,
        }
      : optionsOrOrderId;

  if (!options.orderId || !Number.isFinite(options.grossAmount)) {
    return null;
  }

  const auth = Buffer.from(`${serverKey}:`).toString("base64");

  try {
    const response = await fetch(getSnapEndpoint(), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: options.orderId,
          gross_amount: Math.round(options.grossAmount),
        },
        item_details:
          options.items && options.items.length > 0
            ? options.items
            : buildDemoItems(options.orderId, options.grossAmount),
        customer_details: options.customer,
      }),
      signal: AbortSignal.timeout(MIDTRANS_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[midtrans] Snap gagal (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
      );
      return null;
    }

    const payload: unknown = await response.json();
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("token" in payload) ||
      !("redirect_url" in payload)
    ) {
      return null;
    }

    const { token, redirect_url: redirectUrl } = payload as {
      token: string;
      redirect_url: string;
    };

    return { token, redirectUrl };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal menghubungi Midtrans";
    // Timeout or offline: the caller falls back to demo settlement.
    console.warn(`[midtrans] fallback untuk ${options.orderId}: ${message}`);
    return null;
  }
}

/**
 * Reconcile a Midtrans HTTP notification with the local order.
 *
 * Invalid signatures are rejected with a 401 ApiError so the route can answer
 * the gateway without leaking whether the order exists.
 */
export async function handleNotification(
  payload: MidtransNotification,
): Promise<PaymentResult> {
  if (!payload.order_id) {
    throw new ApiError("order_id wajib diisi", 400, "INVALID_NOTIFICATION");
  }

  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
  const hasSignature = Boolean(payload.signature_key);

  // Production must always be signed. Sandbox callbacks without a signature
  // are accepted so local demos and tests can exercise reconciliation.
  if (serverKey && hasSignature && !verifyMidtransSignature(payload)) {
    throw new ApiError(
      "Signature Midtrans tidak valid",
      401,
      "INVALID_SIGNATURE",
    );
  }

  if (serverKey && !hasSignature && !isSandboxMode()) {
    throw new ApiError(
      "Signature Midtrans wajib dikirim",
      401,
      "MISSING_SIGNATURE",
    );
  }

  const orderId = String(payload.order_id);
  const mappedStatus = mapTransactionStatus(
    payload.transaction_status,
    payload.fraud_status ?? null,
  );
  const grossAmount = Number(payload.gross_amount ?? 0);

  const order = await db.orm.public.Order.where({ code: orderId }).first();

  if (!order) {
    return {
      orderId,
      status: mappedStatus,
      transactionStatus: payload.transaction_status,
      fraudStatus: payload.fraud_status ?? null,
      paid: false,
      found: false,
      grossAmount: Number.isFinite(grossAmount) ? grossAmount : 0,
    };
  }

  // Tampering guard: wallet amounts are derived from local order records only,
  // but the mismatch is worth surfacing for payment troubleshooting.
  if (
    Number.isFinite(grossAmount) &&
    grossAmount > 0 &&
    Math.abs(grossAmount - order.total) > 1
  ) {
    console.warn(
      `[midtrans] gross_amount (${grossAmount}) != order.total (${order.total}) untuk ${orderId}; wallet dihitung dari data lokal`,
    );
  }

  const result = await db.transaction(async (tx) => {
    // Lock the order so a duplicate notification replay cannot race another
    // settlement path into double-crediting producer wallets.
    const locked = await tx.orm.public.Order
      .where({ id: order.id })
      .forUpdate()
      .first();

    if (!locked) {
      return {
        orderId,
        status: mappedStatus,
        transactionStatus: payload.transaction_status,
        fraudStatus: payload.fraud_status ?? null,
        paid: false,
        found: false,
        grossAmount: Number.isFinite(grossAmount) ? grossAmount : 0,
      } satisfies PaymentResult;
    }

    const previousStatus = locked.status;

    const update: {
      status: OrderStatus;
      paymentProvider: string;
      paymentRef: string;
      paidAt?: string;
    } = {
      status: mappedStatus,
      paymentProvider: "MIDTRANS_SNAP",
      paymentRef: payload.transaction_id ?? orderId,
    };

    if (mappedStatus === "PAID" && previousStatus !== "PAID") {
      update.paidAt = new Date().toISOString();
    }

    await tx.orm.public.Order.where({ id: locked.id }).update(update);

    // Wallet only reacts on real transitions, never on notification replays:
    // - PENDING → PAID credits every producer wallet on the order
    // - PAID → CANCELLED (refund/cancel) reverses the prior credit
    if (mappedStatus === "PAID" && previousStatus !== "PAID") {
      await creditOrderPayment(tx, {
        orderId: locked.id,
        orderCode: locked.code,
      });
    } else if (mappedStatus === "CANCELLED" && previousStatus === "PAID") {
      await revokeOrderPayment(tx, {
        orderId: locked.id,
        orderCode: locked.code,
      });
    }

    return {
      orderId,
      status: mappedStatus,
      transactionStatus: payload.transaction_status,
      fraudStatus: payload.fraud_status ?? null,
      paid: mappedStatus === "PAID",
      found: true,
      grossAmount: Number.isFinite(grossAmount) ? grossAmount : locked.total,
    } satisfies PaymentResult;
  });

  return result;
}
