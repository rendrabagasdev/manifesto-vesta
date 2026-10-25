/**
 * Fonnte WhatsApp gateway wrapper.
 *
 * All calls are best-effort: a missing token, a slow gateway or a network
 * failure must never block checkout, a cascade transition or a dashboard
 * action. Every request is capped at {@link FONNTE_TIMEOUT_MS}; callers get a
 * structured result they can log instead of an exception.
 */

import { STATUS_META, isBatchStatus } from "@/src/lib/batches/freshness";

const FONNTE_ENDPOINT = "https://api.fonnte.com/send";

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu bayar",
  PAID: "Lunas",
  SHIPPED: "Dikirim",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

/** Fonnte sometimes takes a few seconds; 1.5s keeps the demo responsive. */
export const FONNTE_TIMEOUT_MS = 1_500;

const idrFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 1,
});

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

export type NotificationProvider = "FONNTE" | "DISABLED";

export interface NotificationResult {
  ok: boolean;
  provider: NotificationProvider;
  /** True when the message was intentionally not sent (no token / bad phone). */
  skipped?: boolean;
  status?: number;
  error?: string;
  target?: string;
}

export interface RescueDealNotification {
  rescuePricePerKg: number;
  discountPct?: number;
  startsAt?: string | Date;
  endsAt?: string | Date;
  earlyAccessHours?: number;
  batch?:
    | {
        code?: string;
        productName?: string;
        quantityKg?: number;
        product?: { name?: string | null } | null;
        warehouse?: { name?: string | null; city?: string | null } | null;
      }
    | null;
}

export interface OrderNotification {
  code: string;
  total?: number;
  subtotal?: number;
  status?: string;
  deliveryAddress?: string | null;
  items?: Array<{
    quantityKg?: number;
    pricePerKg?: number;
    lineTotal?: number;
    batch?: {
      code?: string;
      product?: { name?: string | null } | null;
    } | null;
  }>;
}

export interface CascadeBatchNotification {
  code: string;
  status?: string;
  freshnessScore?: number;
  quantityKg?: number;
  productName?: string;
  product?: { name?: string | null } | null;
  warehouse?: { name?: string | null; city?: string | null } | null;
}

/** Short aliases for callers that mirror the domain model names. */
export type RescueDeal = RescueDealNotification;
export type Order = OrderNotification;
export type Batch = CascadeBatchNotification;

export function isFonnteConfigured(): boolean {
  return Boolean(process.env.FONNTE_API_TOKEN?.trim());
}

/**
 * Fonnte expects an international target. Accept the formats operators type in
 * the dashboard: `0812...`, `+62 812...`, `62812...`, `812...`.
 */
export function normalizePhoneNumber(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("62")) {
    return digits.length >= 10 && digits.length <= 15 ? digits : null;
  }
  if (digits.startsWith("0")) {
    const normalized = `62${digits.slice(1)}`;
    return normalized.length >= 10 && normalized.length <= 15 ? normalized : null;
  }
  if (digits.startsWith("8")) {
    const normalized = `62${digits}`;
    return normalized.length >= 10 && normalized.length <= 15 ? normalized : null;
  }

  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

function formatIdr(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return idrFormatter.format(Math.round(value));
}

function formatKg(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${numberFormatter.format(value)} kg`;
}

function formatDateTime(value: string | Date | undefined | null): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return dateTimeFormatter.format(date);
}

function productNameOf(
  value: RescueDealNotification | CascadeBatchNotification,
): string {
  if ("productName" in value && value.productName) return value.productName;
  if ("product" in value && value.product?.name) return value.product.name;
  if ("batch" in value) return value.batch?.product?.name ?? "Komoditas segar";
  return "Komoditas segar";
}

export function buildRescueDealMessage(deal: RescueDealNotification): string {
  const batch = deal.batch ?? null;
  const name = productNameOf(deal);
  const code = batch?.code ?? "-";
  const warehouse = batch?.warehouse
    ? [batch.warehouse.name, batch.warehouse.city].filter(Boolean).join(", ")
    : null;

  return [
    "*Vesta — Penawaran Diskon baru*",
    `${name} (${code})`,
    `Harga diskon: ${formatIdr(deal.rescuePricePerKg)}/kg`,
    `Diskon: ${numberFormatter.format(deal.discountPct ?? 0)}%`,
    `Stok tersisa: ${formatKg(batch?.quantityKg)}`,
    warehouse ? `Lokasi: ${warehouse}` : null,
    `Berlaku sampai: ${formatDateTime(deal.endsAt)}`,
    "Balas pesan ini untuk dibantu tim Vesta.",
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

export function buildOrderConfirmationMessage(order: OrderNotification): string {
  const total = order.total ?? order.subtotal ?? 0;
  const itemCount = order.items?.length ?? 0;

  return [
    `*Vesta — Konfirmasi pesanan ${order.code}*`,
    `Status: ${ORDER_STATUS_LABELS[order.status ?? "PENDING"] ?? order.status ?? "PENDING"}`,
    itemCount > 0 ? `${itemCount} jenis komoditas` : null,
    `Total: ${formatIdr(total)}`,
    order.deliveryAddress ? `Kirim ke: ${order.deliveryAddress}` : null,
    "Terima kasih telah menyelamatkan pangan bersama Vesta.",
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

export function buildCascadeAlertMessage(
  batch: CascadeBatchNotification,
  newStatus: string,
): string {
  const name = productNameOf(batch);
  const score =
    typeof batch.freshnessScore === "number"
      ? `${numberFormatter.format(batch.freshnessScore)}/100`
      : "-";
  const warehouse = batch.warehouse?.name
    ? ` di ${batch.warehouse.name}`
    : "";

  return [
    "*Vesta — Peringatan cascade*",
    `Batch ${batch.code} (${name})${warehouse}`,
    `Tahap baru: *${isBatchStatus(newStatus) ? STATUS_META[newStatus].label : newStatus}*`,
    `Skor kesegaran: ${score}`,
    `Stok: ${formatKg(batch.quantityKg)}`,
    newStatus === "RESCUE"
      ? "Penawaran diskon sudah dibuka di marketplace."
      : newStatus === "FEED"
        ? "Batch dialihkan ke pakan ternak."
        : newStatus === "RESIDUE"
          ? "Batch dialihkan ke residu organik."
          : newStatus === "DISPOSED"
            ? "Batch tidak lagi memiliki nilai guna."
            : "Batch tetap layak dijual dengan harga normal.",
  ].join("\n");
}

/**
 * Low-level sender. Never throws: all failures are converted into a result.
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string,
): Promise<NotificationResult> {
  const token = process.env.FONNTE_API_TOKEN?.trim();
  if (!token) {
    return {
      ok: false,
      provider: "DISABLED",
      skipped: true,
      error: "FONNTE_API_TOKEN belum dikonfigurasi",
    };
  }

  const target = normalizePhoneNumber(to);
  if (!target) {
    return {
      ok: false,
      provider: "FONNTE",
      skipped: true,
      error: "Nomor WhatsApp tidak valid",
    };
  }

  const body = new URLSearchParams();
  body.set("target", target);
  body.set("message", message);
  body.set("countryCode", "62");

  try {
    const response = await fetch(FONNTE_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: token,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: AbortSignal.timeout(FONNTE_TIMEOUT_MS),
      cache: "no-store",
    });

    const payload: unknown = await response.json().catch(() => null);
    const providerRejected =
      typeof payload === "object" &&
      payload !== null &&
      "status" in payload &&
      (payload as { status?: unknown }).status === false;

    if (!response.ok || providerRejected) {
      const detail =
        typeof payload === "object" && payload !== null && "reason" in payload
          ? String((payload as { reason?: unknown }).reason ?? "")
          : "";
      console.warn(
        `[fonnte] gagal mengirim ke ${target} (${response.status})${detail ? `: ${detail}` : ""}`,
      );
      return {
        ok: false,
        provider: "FONNTE",
        status: response.status,
        target,
        error: detail || `Fonnte membalas ${response.status}`,
      };
    }

    return { ok: true, provider: "FONNTE", status: response.status, target };
  } catch (error) {
    const messageText =
      error instanceof Error ? error.message : "Gagal menghubungi Fonnte";
    // Timeout and offline are expected in the demo; the caller keeps working.
    console.warn(`[fonnte] fallback untuk ${target}: ${messageText}`);
    return {
      ok: false,
      provider: "FONNTE",
      target,
      error: messageText,
    };
  }
}

export async function sendRescueDealNotification(
  to: string,
  deal: RescueDealNotification,
): Promise<NotificationResult> {
  return sendWhatsAppMessage(to, buildRescueDealMessage(deal));
}

export async function sendOrderConfirmation(
  to: string,
  order: OrderNotification,
): Promise<NotificationResult> {
  return sendWhatsAppMessage(to, buildOrderConfirmationMessage(order));
}

export async function sendCascadeAlert(
  to: string,
  batch: CascadeBatchNotification,
  newStatus: string,
): Promise<NotificationResult> {
  return sendWhatsAppMessage(to, buildCascadeAlertMessage(batch, newStatus));
}
