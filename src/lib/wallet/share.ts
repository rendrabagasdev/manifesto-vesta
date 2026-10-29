/**
 * Pure money-split rules for the producer wallet.
 *
 * Split model (agreed with product spec):
 * - The producer earns the product's base price (`basePricePerKg`).
 * - The warehouse/platform side keeps the logistics cost and margin.
 * - Cascade discounts cut the producer's share proportionally, so a rescue
 *   deal never leaves the producer earning more per kg than listing FRESH.
 */

export function clampDiscountPct(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value >= 100) return 100;
  return value;
}

/**
 * Rupiah the producer earns per kg for one order item, after the cascade
 * discount. Rounding (mathematically, e.g. `800 × (1 − 0.35) = 520`) so the
 * credit is always an integer rupiah and can never be inflated by fractions.
 */
export function calculateProducerSharePerKg({
  basePricePerKg,
  rescueDiscountPct,
}: {
  basePricePerKg: number;
  rescueDiscountPct: number;
}): number {
  const base = Number.isFinite(basePricePerKg) ? Math.max(0, basePricePerKg) : 0;
  const discount = clampDiscountPct(rescueDiscountPct);
  return Math.round(base * (1 - discount / 100));
}

/** Producer earning for one order item line. */
export function calculateProducerShareForItem({
  basePricePerKg,
  rescueDiscountPct,
  quantityKg,
}: {
  basePricePerKg: number;
  rescueDiscountPct: number;
  quantityKg: number;
}): number {
  if (!Number.isFinite(quantityKg) || quantityKg <= 0) return 0;
  return Math.round(calculateProducerSharePerKg({ basePricePerKg, rescueDiscountPct }) * quantityKg);
}

/** Wallet idempotency reference for an order payment credit. */
export function orderPaymentReference(orderCode: string): string {
  return `ORDER:${orderCode}`;
}

/** Wallet idempotency reference for storing refunds of an order credit. */
export function orderRevokeReference(orderCode: string): string {
  return `REVOKE:${orderCode}`;
}

/** Wallet idempotency reference for an approved withdrawal debit. */
export function withdrawalReference(withdrawalId: number): string {
  return `WDR:${withdrawalId}`;
}
