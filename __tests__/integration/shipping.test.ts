import { describe, expect, it } from "vitest";
import {
  formatDeliveryEstimate,
  getDeliveryOptions,
  matchDeliveryCity,
  resolveDeliverySelection,
} from "@/src/lib/delivery/shipping";

const option = (
  options: ReturnType<typeof getDeliveryOptions>,
  id: string,
) => options.find((entry) => entry.id === id)!;

describe("getDeliveryOptions", () => {
  it("offers instan, kilat and reguler within the Bandung metro before the cutoff", () => {
    const now = new Date("2026-10-24T03:00:00.000Z"); // 10.00 WIB
    const options = getDeliveryOptions("bandung", ["Bandung", "Cimahi"], now);

    expect(option(options, "INSTANT").available).toBe(true);
    expect(option(options, "INSTANT").etaLabel).toBe("Hari ini, 12.00");
    expect(option(options, "SAME_DAY").etaLabel).toBe("Hari ini, 21.00");
    expect(option(options, "REGULAR").etaLabel).toBe("Besok, 18.00");
  });

  it("disables kilat after 15.00 WIB", () => {
    const now = new Date("2026-10-24T09:00:00.000Z"); // 16.00 WIB
    const options = getDeliveryOptions("bandung", ["Bandung"], now);

    expect(option(options, "SAME_DAY").available).toBe(false);
    expect(option(options, "REGULAR").etaLabel).toBe("Besok, 18.00");
  });

  it("only offers reguler outside the warehouse island", () => {
    const now = new Date("2026-10-24T03:00:00.000Z");
    const options = getDeliveryOptions("makassar", ["Bandung"], now);

    expect(option(options, "INSTANT").available).toBe(false);
    expect(option(options, "SAME_DAY").available).toBe(false);
    expect(option(options, "REGULAR").etaLabel).toBe("Rab, 28 Okt, 18.00");
  });

  it("falls back to a longer reguler estimate when the warehouse city is unknown", () => {
    const now = new Date("2026-10-24T03:00:00.000Z");
    const options = getDeliveryOptions("bandung", [null], now);

    expect(option(options, "INSTANT").available).toBe(false);
    expect(option(options, "SAME_DAY").available).toBe(false);
    expect(option(options, "REGULAR").etaLabel).toBe("Rab, 28 Okt, 18.00");
  });

  it("returns no options for an unknown destination", () => {
    expect(getDeliveryOptions("atlantis", ["Bandung"])).toEqual([]);
  });
});

describe("matchDeliveryCity", () => {
  it("matches profile city text with or without the Kota/Kab. prefix", () => {
    expect(matchDeliveryCity("Kota Bandung")?.id).toBe("bandung");
    expect(matchDeliveryCity("Bandung")?.id).toBe("bandung");
    expect(matchDeliveryCity("Kab. Bandung Barat")?.id).toBe("bandung-barat");
    expect(matchDeliveryCity("bandung barat")?.id).toBe("bandung-barat");
  });

  it("returns null for empty or unknown cities", () => {
    expect(matchDeliveryCity(null)).toBeNull();
    expect(matchDeliveryCity("  ")).toBeNull();
    expect(matchDeliveryCity("Atlantis")).toBeNull();
  });
});

describe("resolveDeliverySelection", () => {
  it("accepts a servable city and method", () => {
    const result = resolveDeliverySelection({
      cityId: "bandung",
      methodId: "SAME_DAY",
      warehouseCities: ["Cimahi"],
      now: new Date("2026-10-24T03:00:00.000Z"),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.city.label).toBe("Kota Bandung");
      expect(result.method).toBe("SAME_DAY");
      expect(result.estimatedDeliveryAt.toISOString()).toBe(
        "2026-10-24T14:00:00.000Z",
      );
    }
  });

  it("rejects unknown cities and unavailable methods", () => {
    expect(
      resolveDeliverySelection({
        cityId: "atlantis",
        methodId: "REGULAR",
        warehouseCities: ["Bandung"],
      }),
    ).toMatchObject({ ok: false, code: "INVALID_CITY" });

    expect(
      resolveDeliverySelection({
        cityId: "makassar",
        methodId: "INSTANT",
        warehouseCities: ["Bandung"],
      }),
    ).toMatchObject({ ok: false, code: "METHOD_UNAVAILABLE" });
  });
});

describe("formatDeliveryEstimate", () => {
  it("labels today, tomorrow and later dates in WIB", () => {
    const now = new Date("2026-10-24T03:00:00.000Z"); // 10.00 WIB

    expect(formatDeliveryEstimate("2026-10-24T11:00:00.000Z", now)).toBe(
      "Hari ini, 18.00",
    );
    expect(formatDeliveryEstimate("2026-10-25T11:00:00.000Z", now)).toBe(
      "Besok, 18.00",
    );
    expect(formatDeliveryEstimate("2026-10-27T11:00:00.000Z", now)).toBe(
      "Sel, 27 Okt, 18.00",
    );
  });

  it("returns a dash for invalid dates", () => {
    expect(formatDeliveryEstimate("not-a-date")).toBe("-");
  });
});
