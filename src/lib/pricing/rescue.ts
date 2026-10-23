export interface RescueDealWindow {
  startsAt: string | Date;
  endsAt: string | Date;
  earlyAccessHours: number;
}

export interface DealAccess {
  accessible: boolean;
  publicStartsAt: string;
  accessStartsAt: string;
  endsAt: string;
  effectiveEarlyAccessHours: number;
  reason: "AVAILABLE" | "EARLY_ACCESS_LOCKED" | "NOT_STARTED" | "EXPIRED" | "INACTIVE";
  secondsUntilAccess: number;
}

/**
 * `startsAt` is the public start time. A tier's early-access benefit moves the
 * user's personal access time before that moment, capped by the deal window.
 *
 * Example: startsAt 10:00, deal window 12h, Gold benefit 6h -> Gold can buy
 * from 04:00. Starter still starts at 10:00.
 */
export function getDealAccess(
  deal: RescueDealWindow,
  tierEarlyAccessHours: number,
  now = new Date(),
  isActive = true,
): DealAccess {
  const startsAt = new Date(deal.startsAt);
  const endsAt = new Date(deal.endsAt);
  const window = Math.max(0, deal.earlyAccessHours);
  const effectiveEarlyAccessHours = Math.max(
    0,
    Math.min(tierEarlyAccessHours, window),
  );

  const accessStartsAt = new Date(
    startsAt.getTime() - effectiveEarlyAccessHours * 60 * 60 * 1000,
  );

  if (!isActive) {
    return {
      accessible: false,
      publicStartsAt: startsAt.toISOString(),
      accessStartsAt: accessStartsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      effectiveEarlyAccessHours,
      reason: "INACTIVE",
      secondsUntilAccess: 0,
    };
  }

  if (now.getTime() > endsAt.getTime()) {
    return {
      accessible: false,
      publicStartsAt: startsAt.toISOString(),
      accessStartsAt: accessStartsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      effectiveEarlyAccessHours,
      reason: "EXPIRED",
      secondsUntilAccess: 0,
    };
  }

  if (now.getTime() < accessStartsAt.getTime()) {
    return {
      accessible: false,
      publicStartsAt: startsAt.toISOString(),
      accessStartsAt: accessStartsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      effectiveEarlyAccessHours,
      reason: "EARLY_ACCESS_LOCKED",
      secondsUntilAccess: Math.ceil(
        (accessStartsAt.getTime() - now.getTime()) / 1000,
      ),
    };
  }

  return {
    accessible: true,
    publicStartsAt: startsAt.toISOString(),
    accessStartsAt: accessStartsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    effectiveEarlyAccessHours,
    reason: now.getTime() < startsAt.getTime() ? "AVAILABLE" : "AVAILABLE",
    secondsUntilAccess: 0,
  };
}
