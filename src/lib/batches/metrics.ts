import {
  BATCH_STATUSES,
  type BatchStatusValue,
} from "@/src/lib/batches/freshness";

export type BatchMetricRow = {
  status: BatchStatusValue;
  freshnessScore: number;
  quantityKg: number;
  reservedKg: number;
};

export type BatchSummary = {
  total: number;
  statusCounts: Record<BatchStatusValue, number>;
  totalKg: number;
  availableKg: number;
  needingAction: number;
  averageScore: number;
};

export function summarizeBatches(
  batches: readonly BatchMetricRow[],
): BatchSummary {
  const statusCounts = Object.fromEntries(
    BATCH_STATUSES.map((status) => [status, 0]),
  ) as Record<BatchStatusValue, number>;

  let totalKg = 0;
  let availableKg = 0;
  let scoreTotal = 0;

  for (const batch of batches) {
    statusCounts[batch.status] += 1;
    totalKg += batch.quantityKg;
    availableKg += Math.max(0, batch.quantityKg - batch.reservedKg);
    scoreTotal += batch.freshnessScore;
  }

  return {
    total: batches.length,
    statusCounts,
    totalKg,
    availableKg,
    needingAction:
      statusCounts.RESCUE + statusCounts.FEED + statusCounts.RESIDUE,
    averageScore: batches.length ? Math.round(scoreTotal / batches.length) : 0,
  };
}
