import { describe, expect, it } from "vitest";
import { formatDistance, formatMoney, formatNumber, formatRelativeFromNow, formatTime, localeFor } from "./format";

describe("formatMoney", () => {
  it("uses Indian digit grouping and the rupee symbol", () => {
    expect(formatMoney(12_345_600, "en")).toBe("₹1,23,456");
  });

  it("keeps Western digits in Hindi", () => {
    const hindi = formatMoney(104_900, "hi");
    expect(hindi).toContain("1,049");
    expect(hindi).not.toMatch(/[०-९]/);
  });

  it("shows paise only when asked (invoices)", () => {
    expect(formatMoney(97_640, "en", { decimals: true })).toBe("₹976.40");
  });

  it("rejects non-integer paise so money never becomes a float", () => {
    expect(() => formatMoney(10.5, "en")).toThrow();
  });
});

describe("formatNumber and locales", () => {
  it("forces Latin numerals for Hindi", () => {
    expect(localeFor("hi")).toBe("hi-IN-u-nu-latn");
    expect(formatNumber(1_234_567, "hi")).toBe("12,34,567");
  });
});

describe("formatDistance", () => {
  it("uses metres below a kilometre and one decimal above", () => {
    expect(formatDistance(830, "en")).toMatch(/830\s?m/);
    expect(formatDistance(1_240, "en")).toMatch(/1\.2\s?km/);
  });
});

describe("formatTime", () => {
  const evening = new Date(2026, 9, 5, 16, 30);
  it("uses am/pm in English and the time-of-day word in Hindi (plan B10)", () => {
    expect(formatTime(evening, "en")).toBe("4:30 pm");
    expect(formatTime(evening, "hi")).toBe("शाम 4:30");
    expect(formatTime(new Date(2026, 9, 5, 8, 0), "hi")).toBe("सुबह 8:00");
  });
});

describe("formatRelativeFromNow", () => {
  const now = new Date(2026, 9, 5, 16, 30, 0);
  it("says how long ago, in seconds, minutes or hours", () => {
    expect(formatRelativeFromNow(new Date(2026, 9, 5, 16, 29, 52), "en", now)).toBe("8 seconds ago");
    expect(formatRelativeFromNow(new Date(2026, 9, 5, 16, 28, 0), "en", now)).toBe("2 minutes ago");
  });

  it("reads a time a little ahead of the clock as now, never in the future", () => {
    expect(formatRelativeFromNow(new Date(2026, 9, 5, 16, 30, 3), "en", now)).toBe("now");
  });
});
