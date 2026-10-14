import { describe, expect, it } from "vitest";
import { computeTotals, discountPercent } from "./pricing";

const inclusive = { platformFeePaise: 1_100, gstRateBps: 500, pricesIncludeGst: true };

describe("computeTotals", () => {
  it("takes 5% GST out of an inclusive total, with the platform fee as its own line", () => {
    const totals = computeTotals(
      [
        { unitPricePaise: 64_900, quantity: 1 },
        { unitPricePaise: 39_000, quantity: 1 },
      ],
      inclusive,
    );
    expect(totals).toEqual({ itemsPaise: 103_900, platformFeePaise: 1_100, taxablePaise: 100_000, gstPaise: 5_000, totalPaise: 105_000 });
  });

  it("multiplies by quantity and rounds GST half-up to whole paise", () => {
    const totals = computeTotals([{ unitPricePaise: 19_900, quantity: 2 }], inclusive);
    expect(totals.totalPaise).toBe(40_900);
    expect(totals.taxablePaise + totals.gstPaise).toBe(totals.totalPaise);
    expect(totals.taxablePaise).toBe(38_952); // 40,900 × 100/105 = 38,952.38…
  });

  it("adds GST on top when prices exclude it", () => {
    const totals = computeTotals([{ unitPricePaise: 100_000, quantity: 1 }], { ...inclusive, pricesIncludeGst: false, platformFeePaise: 0 });
    expect(totals).toEqual({ itemsPaise: 100_000, platformFeePaise: 0, taxablePaise: 100_000, gstPaise: 5_000, totalPaise: 105_000 });
  });

  it("charges no platform fee on an empty cart", () => {
    expect(computeTotals([], inclusive).totalPaise).toBe(0);
  });

  it("refuses fractional paise", () => {
    expect(() => computeTotals([{ unitPricePaise: 649.5, quantity: 1 }], inclusive)).toThrow();
  });
});

describe("discountPercent", () => {
  it("recomputes the discount from the two prices", () => {
    expect(discountPercent(79_900, 159_800)).toBe(50);
    expect(discountPercent(99_900, 179_900)).toBe(44);
  });

  it("has no discount without a higher before-price", () => {
    expect(discountPercent(79_900, null)).toBeNull();
    expect(discountPercent(79_900, 79_900)).toBeNull();
  });
});
