import {
  calculateFreshnessScore as calculateEngineFreshnessScore,
  type FreshnessInput as EngineFreshnessInput,
} from "./engine";

export const BATCH_STATUSES = [
  "FRESH",
  "RESCUE",
  "FEED",
  "RESIDUE",
  "DISPOSED",
] as const;

export type BatchStatusValue = (typeof BATCH_STATUSES)[number];

export const DEFAULT_PRICE_COSTS = {
  warehouseCostPerKg: 1000,
  logisticsCostPerKg: 1500,
  marginPerKg: 2000,
} as const;

export const STATUS_META: Record<
  BatchStatusValue,
  {
    label: string;
    description: string;
    className: string;
    dotClassName: string;
  }
> = {
  FRESH: {
    label: "Segar",
    description: "Layak dijual dengan harga normal.",
    className: "bg-brand-soft text-brand-strong",
    dotClassName: "bg-brand",
  },
  RESCUE: {
    label: "Layu",
    description: "Harga lebih murah sebelum kualitas turun lagi.",
    className: "bg-stage-rescue/25 text-ink",
    dotClassName: "bg-stage-rescue",
  },
  FEED: {
    label: "Pakan",
    description: "Dialihkan ke pakan, bukan untuk konsumsi manusia.",
    className: "bg-stage-feed/20 text-ink",
    dotClassName: "bg-stage-feed",
  },
  RESIDUE: {
    label: "Residu",
    description: "Menunggu pengolahan residu organik.",
    className: "bg-stage-residue/20 text-ink",
    dotClassName: "bg-stage-residue",
  },
  DISPOSED: {
    label: "Dibuang",
    description: "Tidak ada nilai jual atau guna yang tersisa.",
    className: "bg-stage-disposed/15 text-ink-muted",
    dotClassName: "bg-stage-disposed",
  },
};

export interface StatusThresholds {
  fresh: number;
  rescue: number;
  feed: number;
  residue: number;
}

export const DEFAULT_STATUS_THRESHOLDS: StatusThresholds = {
  fresh: 70,
  rescue: 30,
  feed: 10,
  residue: 0,
};

export function isBatchStatus(value: string): value is BatchStatusValue {
  return (BATCH_STATUSES as readonly string[]).includes(value);
}

export function statusFromScore(
  score: number,
  thresholds: StatusThresholds = DEFAULT_STATUS_THRESHOLDS,
): BatchStatusValue {
  if (score >= thresholds.fresh) return "FRESH";
  if (score >= thresholds.rescue) return "RESCUE";
  if (score >= thresholds.feed) return "FEED";
  if (score > thresholds.residue) return "RESIDUE";
  return "DISPOSED";
}

export function discountForStatus(status: BatchStatusValue): number {
  switch (status) {
    case "FRESH":
      return 0;
    case "RESCUE":
      return 35;
    case "FEED":
      return 80;
    case "RESIDUE":
      return 95;
    case "DISPOSED":
      return 100;
  }
}

export type FreshnessInput = Omit<EngineFreshnessInput, "category"> & {
  category?: string;
  receivedAt: Date | string;
};

/**
 * Compatibility wrapper for callers that only need the numeric score.
 *
 * The calculation lives in batches/engine.ts. Callers that need the status,
 * remaining days, or degradation rate should use the engine directly.
 */
export function calculateFreshnessScore(input: FreshnessInput): number {
  return calculateEngineFreshnessScore({
    ...input,
    category: input.category ?? "OTHER",
  }).score;
}

export type BatchPrice = {
  basePricePerKg: number;
  warehouseCostPerKg: number;
  logisticsCostPerKg: number;
  marginPerKg: number;
  rescueDiscountPct: number;
  finalPricePerKg: number;
};

export function calculateBatchPrice({
  basePricePerKg,
  status,
  costs = DEFAULT_PRICE_COSTS,
}: {
  basePricePerKg: number;
  status: BatchStatusValue;
  costs?: {
    warehouseCostPerKg: number;
    logisticsCostPerKg: number;
    marginPerKg: number;
  };
}): BatchPrice {
  const discount = discountForStatus(status);
  const gross =
    basePricePerKg +
    costs.warehouseCostPerKg +
    costs.logisticsCostPerKg +
    costs.marginPerKg;

  return {
    basePricePerKg,
    warehouseCostPerKg: costs.warehouseCostPerKg,
    logisticsCostPerKg: costs.logisticsCostPerKg,
    marginPerKg: costs.marginPerKg,
    rescueDiscountPct: discount,
    finalPricePerKg: Math.max(0, Math.round(gross * (1 - discount / 100))),
  };
}
