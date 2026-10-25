export const DAY_MS = 24 * 60 * 60 * 1000;

export interface CommodityProfile {
  category: string;
  baseDegradationRate: number;
  tempSensitivity: number;
  tempToleranceC: number;
  rescueDiscountCurve: number[];
  minShelfLifeDays: number;
  maxShelfLifeDays: number;
}

export const COMMODITY_PROFILES: Record<string, CommodityProfile> = {
  VEGETABLE: {
    category: "VEGETABLE",
    baseDegradationRate: 1.0,
    tempSensitivity: 0.08,
    tempToleranceC: 2,
    rescueDiscountCurve: [0, 25, 50, 75, 90, 100],
    minShelfLifeDays: 3,
    maxShelfLifeDays: 14,
  },
  FRUIT: {
    category: "FRUIT",
    baseDegradationRate: 0.85,
    tempSensitivity: 0.06,
    tempToleranceC: 3,
    rescueDiscountCurve: [0, 20, 45, 70, 85, 100],
    minShelfLifeDays: 5,
    maxShelfLifeDays: 21,
  },
  PROTEIN: {
    category: "PROTEIN",
    baseDegradationRate: 1.3,
    tempSensitivity: 0.12,
    tempToleranceC: 1,
    rescueDiscountCurve: [0, 30, 55, 80, 95, 100],
    minShelfLifeDays: 2,
    maxShelfLifeDays: 7,
  },
  STAPLE: {
    category: "STAPLE",
    baseDegradationRate: 0.3,
    tempSensitivity: 0.02,
    tempToleranceC: 5,
    rescueDiscountCurve: [0, 10, 25, 50, 75, 100],
    minShelfLifeDays: 30,
    maxShelfLifeDays: 365,
  },
  HERB: {
    category: "HERB",
    baseDegradationRate: 1.5,
    tempSensitivity: 0.1,
    tempToleranceC: 2,
    rescueDiscountCurve: [0, 35, 60, 85, 95, 100],
    minShelfLifeDays: 2,
    maxShelfLifeDays: 10,
  },
  OTHER: {
    category: "OTHER",
    baseDegradationRate: 1.0,
    tempSensitivity: 0.08,
    tempToleranceC: 2,
    rescueDiscountCurve: [0, 25, 50, 75, 90, 100],
    minShelfLifeDays: 7,
    maxShelfLifeDays: 30,
  },
};

export interface FreshnessInput {
  harvestDate: string | Date;
  receivedAt: string | Date;
  storageTempC: number;
  idealTempC: number;
  shelfLifeDays: number;
  category: string;
  now?: Date;
}

export interface FreshnessResult {
  score: number;
  status: "FRESH" | "RESCUE" | "FEED" | "RESIDUE" | "DISPOSED";
  daysRemaining: number;
  degradationRate: number;
}

export function calculateFreshnessScore(input: FreshnessInput): FreshnessResult {
  const {
    harvestDate,
    receivedAt,
    storageTempC,
    idealTempC,
    shelfLifeDays,
    category,
    now = new Date(),
  } = input;

  const harvest = harvestDate instanceof Date ? harvestDate : new Date(`${harvestDate}T00:00:00.000Z`);
  const received = receivedAt instanceof Date ? receivedAt : new Date(receivedAt);

  if (
    Number.isNaN(harvest.getTime()) ||
    Number.isNaN(received.getTime()) ||
    !Number.isFinite(storageTempC) ||
    !Number.isFinite(idealTempC) ||
    shelfLifeDays <= 0
  ) {
    return {
      score: 0,
      status: "DISPOSED",
      daysRemaining: 0,
      degradationRate: 0,
    };
  }

  const profile = COMMODITY_PROFILES[category] ?? COMMODITY_PROFILES.OTHER;

  const storageDays = Math.max(0, (now.getTime() - received.getTime()) / DAY_MS);
  const transitDays = Math.max(0, (received.getTime() - harvest.getTime()) / DAY_MS);

  const tempDiff = Math.abs(storageTempC - idealTempC);
  const tempPenalty = Math.max(0, tempDiff - profile.tempToleranceC) * profile.tempSensitivity;
  const temperatureFactor = 1 + tempPenalty;

  const effectiveDegradation = profile.baseDegradationRate * temperatureFactor;
  const totalEffectiveDays = storageDays * effectiveDegradation + transitDays;

  const loss = totalEffectiveDays / Math.max(1, shelfLifeDays);
  const score = Math.max(0, Math.min(100, Math.round((1 - loss) * 100)));

  let status: FreshnessResult["status"];
  if (score >= 70) status = "FRESH";
  else if (score >= 30) status = "RESCUE";
  else if (score >= 10) status = "FEED";
  else if (score > 0) status = "RESIDUE";
  else status = "DISPOSED";

  const daysRemaining = Math.max(0, Math.ceil(shelfLifeDays - totalEffectiveDays));

  return {
    score,
    status,
    daysRemaining,
    degradationRate: effectiveDegradation,
  };
}

export interface PricingInput {
  basePricePerKg: number;
  status: FreshnessResult["status"];
  category: string;
  freshnessScore?: number;
  warehouseCostPerKg?: number;
  logisticsCostPerKg?: number;
  marginPerKg?: number;
  rescueBounds?: RescuePriceBounds;
}

export interface PricingResult {
  basePricePerKg: number;
  warehouseCostPerKg: number;
  logisticsCostPerKg: number;
  marginPerKg: number;
  grossPricePerKg: number;
  rescueDiscountPct: number;
  finalPricePerKg: number;
  status: FreshnessResult["status"];
  category: string;
}

export interface RescuePriceBounds {
  fresh: number;
  rescue: number;
}

export const DEFAULT_RESCUE_PRICE_BOUNDS: RescuePriceBounds = {
  fresh: 70,
  rescue: 30,
};

/**
 * Discount is gradual inside the RESCUE band: ~8% when the score is just
 * below the FRESH threshold and up to ~58% as it approaches the RESCUE
 * threshold. This avoids a cliff at the stage boundary and discourages
 * waiting for a batch to become almost waste.
 */
export function calculateRescueDiscountPct(
  freshnessScore: number,
  category: string,
  bounds: RescuePriceBounds = DEFAULT_RESCUE_PRICE_BOUNDS,
): number {
  const profile = COMMODITY_PROFILES[category] ?? COMMODITY_PROFILES.OTHER;
  const maxDiscount = Math.max(45, profile.rescueDiscountCurve[2] ?? 55);
  const span = Math.max(1, bounds.fresh - bounds.rescue);
  const score = Math.max(
    bounds.rescue,
    Math.min(bounds.fresh - 0.001, freshnessScore),
  );
  const depth = (bounds.fresh - score) / span;
  const discount = 8 + depth * (maxDiscount - 8);
  return Math.round(Math.min(60, Math.max(8, discount)) * 10) / 10;
}

export function calculateDynamicPricing(input: PricingInput): PricingResult {
  const {
    basePricePerKg,
    status,
    category,
    freshnessScore,
    warehouseCostPerKg = 1000,
    logisticsCostPerKg = 1500,
    marginPerKg = 2000,
    rescueBounds = DEFAULT_RESCUE_PRICE_BOUNDS,
  } = input;

  const gross =
    basePricePerKg + warehouseCostPerKg + logisticsCostPerKg + marginPerKg;

  let discountPct = 0;
  switch (status) {
    case "FRESH":
      discountPct = 0;
      break;
    case "RESCUE":
      discountPct = calculateRescueDiscountPct(
        freshnessScore ?? 50,
        category,
        rescueBounds,
      );
      break;
    case "FEED":
      discountPct = 80;
      break;
    case "RESIDUE":
      discountPct = 95;
      break;
    case "DISPOSED":
      discountPct = 100;
      break;
  }

  const finalPrice = Math.max(0, Math.round(gross * (1 - discountPct / 100)));

  return {
    basePricePerKg,
    warehouseCostPerKg,
    logisticsCostPerKg,
    marginPerKg,
    grossPricePerKg: gross,
    rescueDiscountPct: discountPct,
    finalPricePerKg: finalPrice,
    status,
    category,
  };
}

export function getRescueDiscountLabel(freshnessScore: number): string {
  if (freshnessScore >= 55) return "Diskon Ringan";
  if (freshnessScore >= 35) return "Diskon Sedang";
  return "Diskon Darurat";
}

export function getCommodityProfile(category: string): CommodityProfile {
  return COMMODITY_PROFILES[category] ?? COMMODITY_PROFILES.OTHER;
}

export function getAllCommodityProfiles(): CommodityProfile[] {
  return Object.values(COMMODITY_PROFILES);
}