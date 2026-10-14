import { describe, expect, it } from "vitest";
import { accentRamps, neutral, semantic } from "../tokens/color";
import { contrastRatio } from "./contrast";

const WHITE = neutral[0];
const TEXT_AA = 4.5;
const UI_AA = 3;

describe("contrast helper", () => {
  it("matches known reference values", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
    expect(contrastRatio("#F26522", "#FFFFFF")).toBeCloseTo(3.15, 1); // legacy orange, fails AA
  });
});

describe("neutral tokens", () => {
  it.each([600, 700, 800, 900] as const)("neutral-%s is readable text on white", (step) => {
    expect(contrastRatio(neutral[step], WHITE)).toBeGreaterThanOrEqual(TEXT_AA);
  });

  it("secondary text stays readable on the subtle surfaces", () => {
    expect(contrastRatio(neutral[600], neutral[50])).toBeGreaterThanOrEqual(TEXT_AA);
    expect(contrastRatio(neutral[600], neutral[25])).toBeGreaterThanOrEqual(TEXT_AA);
  });

  it("input borders meet the 3:1 non-text rule", () => {
    expect(contrastRatio(neutral[500], WHITE)).toBeGreaterThanOrEqual(UI_AA);
  });
});

describe.each(Object.keys(accentRamps) as Array<keyof typeof accentRamps>)("accent ramp: %s", (direction) => {
  const ramp = accentRamps[direction];

  it("white text on the action colour and its hover/pressed shades passes AA", () => {
    for (const step of [600, 700, 800] as const) {
      expect(contrastRatio(WHITE, ramp[step])).toBeGreaterThanOrEqual(TEXT_AA);
    }
  });

  it("accent text on white and on its tint passes AA", () => {
    expect(contrastRatio(ramp[600], WHITE)).toBeGreaterThanOrEqual(TEXT_AA);
    expect(contrastRatio(ramp[700], ramp[50])).toBeGreaterThanOrEqual(TEXT_AA);
  });

  it("the focus ring is visible against white", () => {
    expect(contrastRatio(ramp[600], WHITE)).toBeGreaterThanOrEqual(UI_AA);
  });
});

describe.each(Object.keys(semantic) as Array<keyof typeof semantic>)("semantic tone: %s", (tone) => {
  it("text passes AA on white and on its own tinted background", () => {
    expect(contrastRatio(semantic[tone].fg, WHITE)).toBeGreaterThanOrEqual(TEXT_AA);
    expect(contrastRatio(semantic[tone].fg, semantic[tone].bg)).toBeGreaterThanOrEqual(TEXT_AA);
  });
});
