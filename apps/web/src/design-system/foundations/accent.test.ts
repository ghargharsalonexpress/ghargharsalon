import { COLOR_PRESETS } from "@brand/shared";
import { describe, expect, it } from "vitest";
import { accentRamps } from "../tokens/color";
import { accentAdjusted, accentRampFromHex } from "./accent";
import { contrastRatio } from "./contrast";

const WHITE = "#FFFFFF";

// Any colour an admin can pick, including ones that are far too light or dark for text.
const samples = [...COLOR_PRESETS.map((preset) => preset.hex), "#FFD400", "#00FF00", "#FF69B4", "#87CEEB", "#111111", "#7F7F7F", "#E91E63", "#0057B8", "#FFFFFF"];

describe("accentRampFromHex", () => {
  it("returns the hand-made ramps for the colours they were tuned from", () => {
    expect(accentRampFromHex("#F26522")).toBe(accentRamps.orange);
    expect(accentRampFromHex("#c42a6b")).toBe(accentRamps.berry);
  });

  it("falls back to orange for something that isn't a colour", () => {
    expect(accentRampFromHex("orange")).toBe(accentRamps.orange);
  });

  it.each(samples)("%s meets the design system's contrast rules", (hex) => {
    const ramp = accentRampFromHex(hex);
    for (const step of [600, 700, 800] as const) expect(contrastRatio(WHITE, ramp[step])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(ramp[700], ramp[50])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(ramp[500], WHITE)).toBeGreaterThanOrEqual(3);
    for (const value of Object.values(ramp)) expect(value).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it("keeps a colour that is already readable, and reports one it had to darken", () => {
    expect(accentRampFromHex("#2F5BD3")[500]).toBe("#2F5BD3");
    expect(accentAdjusted("#2F5BD3")).toBe(false);
    expect(accentAdjusted("#FFD400")).toBe(true);
  });
});
