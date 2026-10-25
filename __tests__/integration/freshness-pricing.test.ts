import { describe, expect, it } from "vitest";
import {
  COMMODITY_PROFILES,
  calculateDynamicPricing,
  calculateFreshnessScore,
  calculateRescueDiscountPct,
  getCommodityProfile,
  getRescueDiscountLabel,
} from "@/src/lib/batches/engine";
import {
  calculateBatchPrice,
  calculateFreshnessScore as calculateSimpleFreshness,
  discountForStatus,
  statusFromScore,
} from "@/src/lib/batches/freshness";
import { DAY_MS } from "./helpers/fixtures";

const NOW = new Date("2026-10-23T00:00:00.000Z");

function receivedDaysAgo(days: number): string {
  return new Date(NOW.getTime() - days * DAY_MS).toISOString();
}

function dateDaysAgo(days: number): string {
  return new Date(NOW.getTime() - days * DAY_MS).toISOString().slice(0, 10);
}

const TOMATO = {
  harvestDate: dateDaysAgo(0),
  receivedAt: receivedDaysAgo(0),
  storageTempC: 10,
  idealTempC: 10,
  shelfLifeDays: 7,
  category: "VEGETABLE",
  now: NOW,
};

describe("calculateFreshnessScore (engine)", () => {
  it("returns 100 for a batch received today at the ideal temperature", () => {
    const result = calculateFreshnessScore(TOMATO);
    expect(result.score).toBe(100);
    expect(result.status).toBe("FRESH");
    expect(result.daysRemaining).toBe(7);
    expect(result.degradationRate).toBe(1);
  });

  it("degrades with storage time and crosses the cascade thresholds", () => {
    const threeDays = calculateFreshnessScore({
      ...TOMATO,
      receivedAt: receivedDaysAgo(3),
    });
    expect(threeDays.score).toBe(57);
    expect(threeDays.status).toBe("RESCUE");

    const fiveDays = calculateFreshnessScore({
      ...TOMATO,
      receivedAt: receivedDaysAgo(5),
    });
    expect(fiveDays.score).toBe(29);
    expect(fiveDays.status).toBe("FEED");

    const sixAndHalfDays = calculateFreshnessScore({
      ...TOMATO,
      receivedAt: receivedDaysAgo(6.5),
    });
    expect(sixAndHalfDays.score).toBe(7);
    expect(sixAndHalfDays.status).toBe("RESIDUE");

    const sevenDays = calculateFreshnessScore({
      ...TOMATO,
      receivedAt: receivedDaysAgo(7),
    });
    expect(sevenDays.score).toBe(0);
    expect(sevenDays.status).toBe("DISPOSED");
  });

  it("counts transit days between harvest and warehouse receipt", () => {
    const result = calculateFreshnessScore({
      ...TOMATO,
      harvestDate: dateDaysAgo(2),
      receivedAt: receivedDaysAgo(0),
    });
    expect(result.score).toBe(71);
    expect(result.status).toBe("FRESH");
  });

  it("penalises storage above the commodity temperature tolerance", () => {
    const ideal = calculateFreshnessScore({
      ...TOMATO,
      receivedAt: receivedDaysAgo(2),
      storageTempC: 10,
    });
    const warm = calculateFreshnessScore({
      ...TOMATO,
      receivedAt: receivedDaysAgo(2),
      storageTempC: 20,
    });

    expect(ideal.score).toBe(71);
    expect(warm.score).toBeLessThan(ideal.score);
    expect(warm.status).not.toBe("FRESH");
  });

  it("treats categories differently through their degradation profile", () => {
    const protein = calculateFreshnessScore({
      harvestDate: dateDaysAgo(2),
      receivedAt: receivedDaysAgo(2),
      storageTempC: 4,
      idealTempC: 4,
      shelfLifeDays: 5,
      category: "PROTEIN",
      now: NOW,
    });
    const staple = calculateFreshnessScore({
      harvestDate: dateDaysAgo(2),
      receivedAt: receivedDaysAgo(2),
      storageTempC: 20,
      idealTempC: 20,
      shelfLifeDays: 180,
      category: "STAPLE",
      now: NOW,
    });

    expect(protein.score).toBe(48);
    expect(protein.status).toBe("RESCUE");
    expect(staple.score).toBe(100);
  });

  it("falls back to the OTHER profile for unknown categories", () => {
    const unknown = calculateFreshnessScore({ ...TOMATO, category: "UNKNOWN" });
    const other = calculateFreshnessScore({ ...TOMATO, category: "OTHER" });
    expect(unknown.score).toBe(other.score);
  });

  it.each([
    ["zero shelf life", { shelfLifeDays: 0 }],
    ["negative shelf life", { shelfLifeDays: -1 }],
    ["NaN temperature", { storageTempC: Number.NaN }],
    ["infinite ideal temperature", { idealTempC: Number.POSITIVE_INFINITY }],
    ["invalid harvest date", { harvestDate: "not-a-date" }],
    ["invalid received date", { receivedAt: "not-a-date" }],
  ])("returns DISPOSED for %s", (_label, override) => {
    const result = calculateFreshnessScore({ ...TOMATO, ...override });
    expect(result.score).toBe(0);
    expect(result.status).toBe("DISPOSED");
    expect(result.daysRemaining).toBe(0);
  });
});

describe("calculateFreshnessScore (dashboard helper)", () => {
  it("matches the engine for ideal-temperature storage", () => {
    const engine = calculateFreshnessScore(TOMATO);
    const simple = calculateSimpleFreshness({
      harvestDate: TOMATO.harvestDate,
      receivedAt: TOMATO.receivedAt,
      storageTempC: TOMATO.storageTempC,
      idealTempC: TOMATO.idealTempC,
      shelfLifeDays: TOMATO.shelfLifeDays,
      now: NOW,
    });
    expect(simple).toBe(engine.score);
  });

  it("applies a fixed temperature penalty and guards invalid input", () => {
    const warm = calculateSimpleFreshness({
      harvestDate: dateDaysAgo(2),
      receivedAt: receivedDaysAgo(2),
      storageTempC: 20,
      idealTempC: 10,
      shelfLifeDays: 7,
      now: NOW,
    });
    expect(warm).toBe(53);

    expect(
      calculateSimpleFreshness({
        harvestDate: "invalid",
        receivedAt: receivedDaysAgo(0),
        storageTempC: 10,
        idealTempC: 10,
        shelfLifeDays: 7,
        now: NOW,
      }),
    ).toBe(0);
  });
});

describe("statusFromScore", () => {
  it.each([
    [100, "FRESH"],
    [70, "FRESH"],
    [69.999, "RESCUE"],
    [50, "RESCUE"],
    [30, "RESCUE"],
    [29.999, "FEED"],
    [10, "FEED"],
    [9.999, "RESIDUE"],
    [0.001, "RESIDUE"],
    [0, "DISPOSED"],
  ] as const)("maps score %s to %s", (score, expected) => {
    expect(statusFromScore(score)).toBe(expected);
  });
});

describe("discountForStatus", () => {
  it("uses the stage discounts shown on the dashboard", () => {
    expect(discountForStatus("FRESH")).toBe(0);
    expect(discountForStatus("RESCUE")).toBe(35);
    expect(discountForStatus("FEED")).toBe(80);
    expect(discountForStatus("RESIDUE")).toBe(95);
    expect(discountForStatus("DISPOSED")).toBe(100);
  });
});

describe("calculateBatchPrice", () => {
  const base = {
    basePricePerKg: 15000,
    costs: {
      warehouseCostPerKg: 1000,
      logisticsCostPerKg: 1500,
      marginPerKg: 2000,
    },
  };

  it("returns the full gross price for FRESH batches", () => {
    const price = calculateBatchPrice({ ...base, status: "FRESH" });
    expect(price.finalPricePerKg).toBe(19500);
    expect(price.rescueDiscountPct).toBe(0);
  });

  it.each([
    ["RESCUE", 35, 12675],
    ["FEED", 80, 3900],
    ["RESIDUE", 95, 975],
    ["DISPOSED", 100, 0],
  ] as const)("applies the %s discount", (status, discount, finalPrice) => {
    const price = calculateBatchPrice({ ...base, status });
    expect(price.rescueDiscountPct).toBe(discount);
    expect(price.finalPricePerKg).toBe(finalPrice);
  });
});

describe("calculateRescueDiscountPct", () => {
  it("starts at ~8% just below the FRESH threshold", () => {
    expect(calculateRescueDiscountPct(69.999, "VEGETABLE")).toBeCloseTo(8, 1);
    expect(calculateRescueDiscountPct(80, "VEGETABLE")).toBeCloseTo(8, 1);
  });

  it("grows gradually as the score falls", () => {
    const at69 = calculateRescueDiscountPct(69, "VEGETABLE");
    const at60 = calculateRescueDiscountPct(60, "VEGETABLE");
    const at50 = calculateRescueDiscountPct(50, "VEGETABLE");
    const at40 = calculateRescueDiscountPct(40, "VEGETABLE");
    const at30 = calculateRescueDiscountPct(30, "VEGETABLE");

    expect(at69).toBeLessThan(at60);
    expect(at60).toBeLessThan(at50);
    expect(at50).toBeLessThan(at40);
    expect(at40).toBeLessThan(at30);
    expect(at30).toBe(50);
  });

  it("respects the commodity curve but never exceeds 60%", () => {
    expect(calculateRescueDiscountPct(30, "HERB")).toBe(60);
    expect(calculateRescueDiscountPct(30, "PROTEIN")).toBe(55);
    expect(calculateRescueDiscountPct(30, "STAPLE")).toBe(45);
    expect(calculateRescueDiscountPct(30, "FRUIT")).toBe(45);
    expect(calculateRescueDiscountPct(0, "HERB")).toBe(60);
  });

  it("never returns less than 8% or more than 60%", () => {
    for (const score of [-50, 0, 15, 30, 45, 69, 69.999, 100]) {
      for (const category of Object.keys(COMMODITY_PROFILES)) {
        const discount = calculateRescueDiscountPct(score, category);
        expect(discount).toBeGreaterThanOrEqual(8);
        expect(discount).toBeLessThanOrEqual(60);
      }
    }
  });
});

describe("calculateDynamicPricing", () => {
  const base = {
    basePricePerKg: 15000,
    category: "VEGETABLE",
    warehouseCostPerKg: 1000,
    logisticsCostPerKg: 1500,
    marginPerKg: 2000,
  };

  it("keeps the gross price for FRESH", () => {
    const pricing = calculateDynamicPricing({ ...base, status: "FRESH" });
    expect(pricing.grossPricePerKg).toBe(19500);
    expect(pricing.rescueDiscountPct).toBe(0);
    expect(pricing.finalPricePerKg).toBe(19500);
  });

  it("uses the gradual curve for RESCUE", () => {
    const pricing = calculateDynamicPricing({
      ...base,
      status: "RESCUE",
      freshnessScore: 50,
    });
    expect(pricing.rescueDiscountPct).toBe(29);
    expect(pricing.finalPricePerKg).toBe(13845);
  });

  it.each([
    ["FEED", 80, 3900],
    ["RESIDUE", 95, 975],
    ["DISPOSED", 100, 0],
  ] as const)("applies the flat %s discount", (status, discount, finalPrice) => {
    const pricing = calculateDynamicPricing({ ...base, status });
    expect(pricing.rescueDiscountPct).toBe(discount);
    expect(pricing.finalPricePerKg).toBe(finalPrice);
  });

  it("uses default cost components when they are omitted", () => {
    const pricing = calculateDynamicPricing({
      basePricePerKg: 10000,
      status: "FRESH",
      category: "VEGETABLE",
    });
    expect(pricing.warehouseCostPerKg).toBe(1000);
    expect(pricing.logisticsCostPerKg).toBe(1500);
    expect(pricing.marginPerKg).toBe(2000);
    expect(pricing.grossPricePerKg).toBe(14500);
  });

  it("defaults RESCUE without a score to a mid-band discount", () => {
    const pricing = calculateDynamicPricing({ ...base, status: "RESCUE" });
    expect(pricing.rescueDiscountPct).toBe(29);
  });
});

describe("rescue labels and profiles", () => {
  it("labels the rescue bands", () => {
    expect(getRescueDiscountLabel(70)).toBe("Diskon Ringan");
    expect(getRescueDiscountLabel(55)).toBe("Diskon Ringan");
    expect(getRescueDiscountLabel(54)).toBe("Diskon Sedang");
    expect(getRescueDiscountLabel(35)).toBe("Diskon Sedang");
    expect(getRescueDiscountLabel(34)).toBe("Diskon Darurat");
  });

  it("returns a profile for every known category and a fallback", () => {
    expect(getCommodityProfile("PROTEIN").category).toBe("PROTEIN");
    expect(getCommodityProfile("UNKNOWN").category).toBe("OTHER");
  });
});
