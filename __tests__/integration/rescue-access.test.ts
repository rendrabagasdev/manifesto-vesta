import { describe, expect, it } from "vitest";
import { getDealAccess } from "@/src/lib/pricing/rescue";
import {
  TIER_BENEFITS,
} from "@/src/lib/loyalty/tiers";

const NOW = new Date("2026-10-23T03:00:00.000Z");

function hoursFromNow(hours: number): string {
  return new Date(NOW.getTime() + hours * 60 * 60 * 1000).toISOString();
}

function deal(overrides: Partial<{
  startsAt: string;
  endsAt: string;
  earlyAccessHours: number;
}> = {}) {
  return {
    startsAt: overrides.startsAt ?? hoursFromNow(10),
    endsAt: overrides.endsAt ?? hoursFromNow(34),
    earlyAccessHours: overrides.earlyAccessHours ?? 12,
  };
}

describe("getDealAccess", () => {
  it("locks a Starter user until the public start", () => {
    const access = getDealAccess(deal(), TIER_BENEFITS.STARTER.earlyAccessHours, NOW);

    expect(access.accessible).toBe(false);
    expect(access.reason).toBe("EARLY_ACCESS_LOCKED");
    expect(access.effectiveEarlyAccessHours).toBe(0);
    expect(access.accessStartsAt).toBe(hoursFromNow(10));
    expect(access.secondsUntilAccess).toBe(10 * 60 * 60);
  });

  it("opens exactly at the public start for Starter", () => {
    const access = getDealAccess(
      deal({ startsAt: NOW.toISOString() }),
      TIER_BENEFITS.STARTER.earlyAccessHours,
      NOW,
    );

    expect(access.accessible).toBe(true);
    expect(access.reason).toBe("AVAILABLE");
    expect(access.secondsUntilAccess).toBe(0);
  });

  it("lets Gold in six hours before the public start", () => {
    const window = deal({ startsAt: hoursFromNow(6) });
    const gold = getDealAccess(window, TIER_BENEFITS.GOLD.earlyAccessHours, NOW);
    const silver = getDealAccess(window, TIER_BENEFITS.SILVER.earlyAccessHours, NOW);
    const starter = getDealAccess(window, TIER_BENEFITS.STARTER.earlyAccessHours, NOW);

    expect(gold.accessible).toBe(true);
    expect(gold.effectiveEarlyAccessHours).toBe(6);
    expect(gold.accessStartsAt).toBe(NOW.toISOString());

    expect(silver.accessible).toBe(false);
    expect(silver.reason).toBe("EARLY_ACCESS_LOCKED");
    expect(silver.secondsUntilAccess).toBe(4 * 60 * 60);

    expect(starter.accessible).toBe(false);
    expect(starter.secondsUntilAccess).toBe(6 * 60 * 60);
  });

  it("caps early access at the deal window", () => {
    const window = deal({ startsAt: hoursFromNow(20), earlyAccessHours: 3 });
    const platinum = getDealAccess(
      window,
      TIER_BENEFITS.PLATINUM.earlyAccessHours,
      NOW,
    );

    expect(platinum.effectiveEarlyAccessHours).toBe(3);
    expect(platinum.accessStartsAt).toBe(hoursFromNow(17));
    expect(platinum.accessible).toBe(false);
  });

  it("allows access inside the deal window", () => {
    const access = getDealAccess(
      deal({ startsAt: hoursFromNow(-2), endsAt: hoursFromNow(46) }),
      TIER_BENEFITS.STARTER.earlyAccessHours,
      NOW,
    );

    expect(access.accessible).toBe(true);
    expect(access.reason).toBe("AVAILABLE");
  });

  it("rejects expired deals", () => {
    const access = getDealAccess(
      deal({ startsAt: hoursFromNow(-48), endsAt: hoursFromNow(-1) }),
      TIER_BENEFITS.PLATINUM.earlyAccessHours,
      NOW,
    );

    expect(access.accessible).toBe(false);
    expect(access.reason).toBe("EXPIRED");
    expect(access.secondsUntilAccess).toBe(0);
  });

  it("rejects inactive deals even inside the window", () => {
    const access = getDealAccess(
      deal({ startsAt: hoursFromNow(-2) }),
      TIER_BENEFITS.GOLD.earlyAccessHours,
      NOW,
      false,
    );

    expect(access.accessible).toBe(false);
    expect(access.reason).toBe("INACTIVE");
  });

  it("never grants negative or non-finite early access", () => {
    const negative = getDealAccess(deal(), -5, NOW);
    const infinite = getDealAccess(deal(), Number.POSITIVE_INFINITY, NOW);

    expect(negative.effectiveEarlyAccessHours).toBe(0);
    expect(infinite.effectiveEarlyAccessHours).toBe(12);
  });

  it.each(["STARTER", "SILVER", "GOLD", "PLATINUM"] as const)(
    "computes the %s access start from its tier benefit",
    (tier) => {
      const benefit = TIER_BENEFITS[tier];
      const access = getDealAccess(deal(), benefit.earlyAccessHours, NOW);
      const expected = new Date(
        NOW.getTime() + (10 - benefit.earlyAccessHours) * 60 * 60 * 1000,
      ).toISOString();

      expect(access.accessStartsAt).toBe(expected);
      expect(access.effectiveEarlyAccessHours).toBe(benefit.earlyAccessHours);
    },
  );
});
