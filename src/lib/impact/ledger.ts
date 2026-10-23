import { db } from "@/src/prisma/db";

export interface ImpactFactors {
  co2ePerKg: number;
  waterLitersPerKg: number;
}

/**
 * Public, widely-cited order-of-magnitude estimates. The UI labels these as
 * estimates; third-party verification is post-MVP.
 */
export const IMPACT_FACTORS: Record<string, ImpactFactors> = {
  VEGETABLE: { co2ePerKg: 1.4, waterLitersPerKg: 220 },
  FRUIT: { co2ePerKg: 1.1, waterLitersPerKg: 180 },
  PROTEIN: { co2ePerKg: 6.2, waterLitersPerKg: 1_540 },
  STAPLE: { co2ePerKg: 0.9, waterLitersPerKg: 1_100 },
  HERB: { co2ePerKg: 1.2, waterLitersPerKg: 160 },
  OTHER: { co2ePerKg: 1.3, waterLitersPerKg: 200 },
};

const STAGE_MULTIPLIER: Record<string, number> = {
  FRESH: 0.35,
  RESCUE: 1,
  FEED: 0.7,
  RESIDUE: 0.35,
  DISPOSED: 0,
};

export interface ImpactEstimate {
  rescuedKg: number;
  co2eSavedKg: number;
  waterSavedLiters: number;
  wasteDivertedKg: number;
}

export function estimateImpact(
  quantityKg: number,
  category: string,
  stage: string,
): ImpactEstimate {
  const qty = Math.max(0, quantityKg);
  const factors = IMPACT_FACTORS[category] ?? IMPACT_FACTORS.OTHER;
  const multiplier = STAGE_MULTIPLIER[stage] ?? 0;

  return {
    rescuedKg: round(qty, 3),
    co2eSavedKg: round(qty * factors.co2ePerKg * multiplier, 3),
    waterSavedLiters: round(qty * factors.waterLitersPerKg * multiplier, 1),
    wasteDivertedKg: round(qty, 3),
  };
}

type QueryClient = Pick<typeof db, "orm">;

export async function createSaleImpactLog(
  client: QueryClient,
  options: {
    batchId: number;
    orderId: number;
    quantityKg: number;
    category: string;
    stage: string;
  },
) {
  const estimate = estimateImpact(
    options.quantityKg,
    options.category,
    options.stage,
  );

  return client.orm.public.ImpactLog.create({
    batchId: options.batchId,
    orderId: options.orderId,
    rescuedKg: estimate.rescuedKg,
    co2eSavedKg: estimate.co2eSavedKg,
    waterSavedLiters: estimate.waterSavedLiters,
    wasteDivertedKg: estimate.wasteDivertedKg,
  });
}

export async function getCascadeStats(client: QueryClient) {
  const grouped = await client.orm.public.Batch
    .groupBy("status")
    .aggregate((aggregate) => ({ count: aggregate.count() }));

  const statusCounts = {
    FRESH: 0,
    RESCUE: 0,
    FEED: 0,
    RESIDUE: 0,
    DISPOSED: 0,
  } as Record<string, number>;

  for (const row of grouped) {
    statusCounts[row.status] = row.count;
  }

  const totalBatches = Object.values(statusCounts).reduce(
    (sum, count) => sum + count,
    0,
  );
  const disposed = statusCounts.DISPOSED ?? 0;
  const wasteDiversionRate =
    totalBatches > 0
      ? Math.round(((totalBatches - disposed) / totalBatches) * 1000) / 10
      : 100;

  return { statusCounts, totalBatches, wasteDiversionRate };
}

export interface ImpactSummary {
  totalRescuedKg: number;
  totalCo2eSavedKg: number;
  totalWaterSavedLiters: number;
  totalWasteDivertedKg: number;
  wasteDiversionRate: number;
  totalBatchesProcessed: number;
  totalTransactions: number;
  statusCounts: Record<string, number>;
}

export async function getImpactSummary(
  client: QueryClient,
  userId?: number,
): Promise<ImpactSummary> {
  const logs = userId
    ? (
        await client.orm.public.Order
          .where({ buyerId: userId })
          .include("impactLogs")
          .all()
      ).flatMap((order) => order.impactLogs)
    : await client.orm.public.ImpactLog.all();

  const cascade = await getCascadeStats(client);

  return {
    totalRescuedKg: round(
      logs.reduce((sum, log) => sum + log.rescuedKg, 0),
      3,
    ),
    totalCo2eSavedKg: round(
      logs.reduce((sum, log) => sum + log.co2eSavedKg, 0),
      3,
    ),
    totalWaterSavedLiters: round(
      logs.reduce((sum, log) => sum + log.waterSavedLiters, 0),
      1,
    ),
    totalWasteDivertedKg: round(
      logs.reduce((sum, log) => sum + log.wasteDivertedKg, 0),
      3,
    ),
    wasteDiversionRate: cascade.wasteDiversionRate,
    totalBatchesProcessed: cascade.totalBatches,
    totalTransactions: logs.length,
    statusCounts: cascade.statusCounts,
  };
}

export function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
