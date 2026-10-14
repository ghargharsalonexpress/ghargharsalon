import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, settingsSchema } from "./settings";

describe("settingsSchema", () => {
  it("accepts the plan's defaults", () => {
    expect(settingsSchema.safeParse(DEFAULT_SETTINGS).success).toBe(true);
  });

  it("rejects an accept window that is not shorter than the search timeout", () => {
    const result = settingsSchema.safeParse({ ...DEFAULT_SETTINGS, matching: { ...DEFAULT_SETTINGS.matching, acceptWindowSeconds: 120 } });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("validation.acceptWindowTooLong");
  });

  it("rejects closing time before opening time", () => {
    const result = settingsSchema.safeParse({
      ...DEFAULT_SETTINGS,
      operations: { ...DEFAULT_SETTINGS.operations, serviceHours: { open: "21:00", close: "08:00" } },
    });
    expect(result.error?.issues[0]?.message).toBe("validation.hoursOrder");
  });

  it("rejects fractional paise", () => {
    const result = settingsSchema.safeParse({ ...DEFAULT_SETTINGS, pricing: { ...DEFAULT_SETTINGS.pricing, platformFeePaise: 11.5 } });
    expect(result.success).toBe(false);
  });
});
