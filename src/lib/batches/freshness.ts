export const BATCH_STATUSES = [
  "FRESH",
  "RESCUE",
  "FEED",
  "RESIDUE",
  "DISPOSED",
] as const;

export type BatchStatusValue = (typeof BATCH_STATUSES)[number];

const DAY_MS = 24 * 60 * 60 * 1000;

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
    label: "Fresh",
    description: "Layak dijual dengan harga normal.",
    className: "bg-brand-soft text-brand-strong",
    dotClassName: "bg-brand",
  },
  RESCUE: {
    label: "Rescue",
    description: "Diskon penyelamatan sebelum kualitas turun lagi.",
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

export function isBatchStatus(value: string): value is BatchStatusValue {
  return (BATCH_STATUSES as readonly string[]).includes(value);
}

export function statusFromScore(score: number): BatchStatusValue {
  if (score >= 70) return "FRESH";
  if (score >= 30) return "RESCUE";
  if (score >= 10) return "FEED";
  if (score > 0) return "RESIDUE";
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

export type FreshnessInput = {
  harvestDate: string;
  receivedAt: Date | string;
  storageTempC: number;
  idealTempC: number;
  shelfLifeDays: number;
  now?: Date;
};

export function calculateFreshnessScore({
  harvestDate,
  receivedAt,
  storageTempC,
  idealTempC,
  shelfLifeDays,
  now = new Date(),
}: FreshnessInput): number {
  const harvest = new Date(`${harvestDate}T00:00:00.000Z`);
  const received =
    receivedAt instanceof Date ? receivedAt : new Date(receivedAt);

  if (
    Number.isNaN(harvest.getTime()) ||
    Number.isNaN(received.getTime()) ||
    !Number.isFinite(storageTempC) ||
    !Number.isFinite(idealTempC) ||
    shelfLifeDays <= 0
  ) {
    return 0;
  }

  const storageDays = Math.max(
    0,
    (now.getTime() - received.getTime()) / DAY_MS,
  );
  const transitDays = Math.max(
    0,
    (received.getTime() - harvest.getTime()) / DAY_MS,
  );
  const temperaturePenalty =
    1 + Math.max(0, Math.abs(storageTempC - idealTempC) - 2) * 0.08;
  const loss =
    (storageDays * temperaturePenalty + transitDays) / Math.max(1, shelfLifeDays);

  return Math.max(0, Math.min(100, Math.round((1 - loss) * 100)));
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
