import { db } from "@/src/prisma/db";
import { ApiError } from "@/src/lib/api/http";

export const TIER_NAMES = [
  "STARTER",
  "SILVER",
  "GOLD",
  "PLATINUM",
] as const;

export type TierName = (typeof TIER_NAMES)[number];

export interface TierBenefit {
  tier: TierName;
  label: string;
  minimumSpend: number;
  rescueQuotaPerWeek: number;
  earlyAccessHours: number;
}

export const TIER_BENEFITS: Record<TierName, TierBenefit> = {
  STARTER: {
    tier: "STARTER",
    label: "Starter",
    minimumSpend: 0,
    rescueQuotaPerWeek: 2,
    earlyAccessHours: 0,
  },
  SILVER: {
    tier: "SILVER",
    label: "Silver",
    minimumSpend: 500_000,
    rescueQuotaPerWeek: 5,
    earlyAccessHours: 2,
  },
  GOLD: {
    tier: "GOLD",
    label: "Gold",
    minimumSpend: 2_000_000,
    rescueQuotaPerWeek: 12,
    earlyAccessHours: 6,
  },
  PLATINUM: {
    tier: "PLATINUM",
    label: "Platinum",
    minimumSpend: 5_000_000,
    rescueQuotaPerWeek: 25,
    earlyAccessHours: 12,
  },
};

export const POINTS_PER_RUPIAH = 1 / 1_000;

export function isTierName(value: string): value is TierName {
  return (TIER_NAMES as readonly string[]).includes(value);
}

export function computeTier(totalSpend30d: number): TierName {
  if (totalSpend30d >= TIER_BENEFITS.PLATINUM.minimumSpend) return "PLATINUM";
  if (totalSpend30d >= TIER_BENEFITS.GOLD.minimumSpend) return "GOLD";
  if (totalSpend30d >= TIER_BENEFITS.SILVER.minimumSpend) return "SILVER";
  return "STARTER";
}

export function getTierBenefit(tier: string | null | undefined): TierBenefit {
  return isTierName(tier ?? "") ? TIER_BENEFITS[tier as TierName] : TIER_BENEFITS.STARTER;
}

export function getNextTier(tier: TierName): {
  nextTier: TierName | null;
  threshold: number | null;
} {
  const index = TIER_NAMES.indexOf(tier);
  const next = TIER_NAMES[index + 1];
  return next
    ? { nextTier: next, threshold: TIER_BENEFITS[next].minimumSpend }
    : { nextTier: null, threshold: null };
}

export function progressToNextTier(
  tier: TierName,
  totalSpend30d: number,
): number {
  const { threshold } = getNextTier(tier);
  if (!threshold) return 100;
  return Math.min(100, Math.max(0, Math.round((totalSpend30d / threshold) * 100)));
}

const JAKARTA_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function jakartaDateValue(date = new Date()): string {
  return JAKARTA_DATE_FORMATTER.format(date);
}

/**
 * Weekly quota windows start on Monday in Asia/Jakarta. A new key every week
 * guarantees unused quotas never stack across weeks.
 */
export function getWeekStart(date = new Date()): string {
  const today = jakartaDateValue(date);
  const cursor = new Date(`${today}T00:00:00.000Z`);
  const daysSinceMonday = (cursor.getUTCDay() + 6) % 7;
  cursor.setUTCDate(cursor.getUTCDate() - daysSinceMonday);
  return cursor.toISOString().slice(0, 10);
}

export function getWeekEnd(date = new Date()): string {
  const start = new Date(`${getWeekStart(date)}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() + 7);
  return start.toISOString().slice(0, 10);
}

type QueryClient = Pick<typeof db, "orm">;

export type BuyerTierRow = Awaited<
  ReturnType<typeof getOrCreateBuyerTier>
>;

export async function getOrCreateBuyerTier(
  client: QueryClient,
  userId: number,
  options: { forUpdate?: boolean } = {},
) {
  const query = client.orm.public.BuyerTier.where({ userId });
  const existing = options.forUpdate
    ? await query.forUpdate().first()
    : await query.first();
  if (existing) return existing;

  const tier = "STARTER";
  const benefit = TIER_BENEFITS[tier];

  try {
    return await client.orm.public.BuyerTier.create({
      userId,
      tier,
      totalSpend30d: 0,
      points: 0,
      rescueQuotaPerWeek: benefit.rescueQuotaPerWeek,
      earlyAccessHours: benefit.earlyAccessHours,
    });
  } catch {
    // A concurrent request may have created the row first.
    const created = await client.orm.public.BuyerTier.where({ userId }).first();
    if (created) return created;
    throw new ApiError(
      "Gagal menyiapkan data tier pembeli",
      500,
      "TIER_BOOTSTRAP_FAILED",
    );
  }
}

export async function getQuotaStatus(
  client: QueryClient,
  userId: number,
  at = new Date(),
) {
  const tier = await getOrCreateBuyerTier(client, userId);
  const benefit = getTierBenefit(tier.tier);
  const weekStart = getWeekStart(at);

  const usage = await client.orm.public.RescueQuotaUsage.where({
    userId,
    weekStart,
  }).first();

  const used = usage?.used ?? 0;
  const limit = tier.rescueQuotaPerWeek ?? benefit.rescueQuotaPerWeek;

  return {
    tier: tier.tier,
    tierLabel: benefit.label,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    weekStart,
    resetsAt: getWeekEnd(at),
    earlyAccessHours: tier.earlyAccessHours ?? benefit.earlyAccessHours,
    points: tier.points,
    totalSpend30d: tier.totalSpend30d,
  };
}

export type QuotaStatus = Awaited<ReturnType<typeof getQuotaStatus>>;

export async function consumeRescueQuota(
  client: QueryClient,
  userId: number,
  at = new Date(),
  count = 1,
  options: { lockTier?: boolean } = {},
) {
  if (!Number.isInteger(count) || count <= 0) {
    throw new ApiError("Jumlah kuota tidak valid", 400, "INVALID_QUOTA_COUNT");
  }

  const tier = await getOrCreateBuyerTier(client, userId, {
    forUpdate: options.lockTier,
  });
  const benefit = getTierBenefit(tier.tier);
  const limit = tier.rescueQuotaPerWeek ?? benefit.rescueQuotaPerWeek;
  const weekStart = getWeekStart(at);

  const usage = await client.orm.public.RescueQuotaUsage.where({
    userId,
    weekStart,
  }).first();

  const used = usage?.used ?? 0;
  if (used + count > limit) {
    throw new ApiError(
      `Kuota Rescue mingguan Anda habis (${used}/${limit}). Kuota baru tersedia ${getWeekEnd(at)}.`,
      409,
      "RESCUE_QUOTA_EXHAUSTED",
      { limit, used, remaining: Math.max(0, limit - used) },
    );
  }

  if (usage) {
    await client.orm.public.RescueQuotaUsage.where({ id: usage.id }).update({
      used: used + count,
    });
  } else {
    await client.orm.public.RescueQuotaUsage.create({
      userId,
      weekStart,
      used: count,
    });
  }

  return {
    limit,
    used: used + count,
    remaining: Math.max(0, limit - (used + count)),
    weekStart,
    resetsAt: getWeekEnd(at),
  };
}

export async function addNormalSpend(
  client: QueryClient,
  options: {
    userId: number;
    amount: number;
    orderId?: number;
    description?: string;
    at?: Date;
    lockTier?: boolean;
  },
) {
  const { userId, amount, orderId, description, at = new Date() } = options;
  const safeAmount = Math.max(0, Math.round(amount));
  const tier = await getOrCreateBuyerTier(client, userId, {
    forUpdate: options.lockTier,
  });
  const pointsDelta = Math.floor(safeAmount * POINTS_PER_RUPIAH);
  const totalSpend30d = tier.totalSpend30d + safeAmount;
  const nextTier = computeTier(totalSpend30d);
  const nextBenefit = TIER_BENEFITS[nextTier];

  await client.orm.public.BuyerTier.where({ id: tier.id }).update({
    totalSpend30d,
    points: tier.points + pointsDelta,
    tier: nextTier,
    rescueQuotaPerWeek: nextBenefit.rescueQuotaPerWeek,
    earlyAccessHours: nextBenefit.earlyAccessHours,
  });

  if (safeAmount > 0) {
    await client.orm.public.LoyaltyLedger.create({
      userId,
      orderId: orderId ?? null,
      type: "EARN",
      amount: safeAmount,
      pointsDelta,
      description:
        description ??
        `Belanja harga normal ${new Intl.DateTimeFormat("id-ID").format(at)}`,
    });
  }

  return {
    previousTier: tier.tier,
    tier: nextTier,
    totalSpend30d,
    points: tier.points + pointsDelta,
    pointsDelta,
    tierChanged: tier.tier !== nextTier,
  };
}

export async function expireLoyaltySpend(
  client: QueryClient,
  userId: number,
  at = new Date(),
) {
  const cutoff = new Date(at.getTime() - 30 * 24 * 60 * 60 * 1000);
  const entries = await client.orm.public.LoyaltyLedger.where({
    userId,
    type: "EARN",
  }).all();

  const spend30d = entries
    .filter((entry) => new Date(entry.createdAt).getTime() >= cutoff.getTime())
    .reduce((sum, entry) => sum + entry.amount, 0);

  const tier = await getOrCreateBuyerTier(client, userId);
  const nextTier = computeTier(spend30d);
  const benefit = TIER_BENEFITS[nextTier];

  await client.orm.public.BuyerTier.where({ id: tier.id }).update({
    totalSpend30d: spend30d,
    tier: nextTier,
    rescueQuotaPerWeek: benefit.rescueQuotaPerWeek,
    earlyAccessHours: benefit.earlyAccessHours,
  });

  return { totalSpend30d: spend30d, tier: nextTier };
}

export interface LoyaltyExpiryResult {
  processedUsers: number;
  downgradedUsers: number;
  expiredSpend: number;
}

function tierRank(tier: string): number {
  return isTierName(tier) ? TIER_NAMES.indexOf(tier) : 0;
}

/**
 * Recomputes the rolling 30-day spend for every buyer so old purchases stop
 * counting. Runs hourly with the cascade tick; locking the tier row keeps a
 * concurrent checkout from writing stale totals.
 */
export async function runLoyaltyExpiry(
  now = new Date(),
): Promise<LoyaltyExpiryResult> {
  const tiers = await db.orm.public.BuyerTier.all();
  let processedUsers = 0;
  let downgradedUsers = 0;
  let expiredSpend = 0;

  for (const tier of tiers) {
    if (tier.totalSpend30d <= 0) continue;

    const outcome = await db.transaction(async (tx) => {
      const before = await getOrCreateBuyerTier(tx, tier.userId, {
        forUpdate: true,
      });
      if (before.totalSpend30d <= 0) return null;

      const result = await expireLoyaltySpend(tx, tier.userId, now);
      if (result.totalSpend30d === before.totalSpend30d) return null;

      return {
        previousTier: before.tier,
        tier: result.tier,
        expiredSpend: Math.max(0, before.totalSpend30d - result.totalSpend30d),
      };
    });

    if (!outcome) continue;
    processedUsers += 1;
    expiredSpend += outcome.expiredSpend;
    if (tierRank(outcome.tier) < tierRank(outcome.previousTier)) {
      downgradedUsers += 1;
    }
  }

  return { processedUsers, downgradedUsers, expiredSpend };
}
