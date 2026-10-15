import { DEFAULT_SETTINGS, type Settings } from "@brand/shared";
import { Types } from "mongoose";
import { describe, expect, it } from "vitest";
import { etaRange, etaRangeFromSeconds, searchRadiusKm } from "../src/modules/availability/geo";
import { rank, type RankedProfessional } from "../src/modules/matching/matching.service";

const matching = (over: Partial<Settings["matching"]> = {}): Settings["matching"] => ({ ...DEFAULT_SETTINGS.matching, ...over });

describe("searchRadiusKm", () => {
  it("holds at the normal radius until the widening starts", () => {
    const m = matching({ radiusKm: 5, maxRadiusKm: 8, widenAfterSeconds: 40, searchTimeoutSeconds: 120 });
    expect(searchRadiusKm(0, m)).toBe(5);
    expect(searchRadiusKm(39, m)).toBe(5);
    expect(searchRadiusKm(40, m)).toBe(5);
  });

  it("grows to the maximum by the deadline and never past it", () => {
    const m = matching({ radiusKm: 5, maxRadiusKm: 8, widenAfterSeconds: 40, searchTimeoutSeconds: 120 });
    // Half way through the widening window: half the extra distance.
    expect(searchRadiusKm(80, m)).toBeCloseTo(6.5, 5);
    expect(searchRadiusKm(120, m)).toBe(8);
    // A search that overruns its deadline must not keep growing.
    expect(searchRadiusKm(600, m)).toBe(8);
  });

  it("stays put when widening is switched off by the settings", () => {
    const same = matching({ radiusKm: 5, maxRadiusKm: 5 });
    expect(searchRadiusKm(0, same)).toBe(5);
    expect(searchRadiusKm(300, same)).toBe(5);
  });
});

describe("etaRangeFromSeconds", () => {
  it("adds the 3 minutes to set off and shows a 6-minute band", () => {
    // 9 minutes of driving + 3 to leave = 12, already on a 3-minute step.
    expect(etaRangeFromSeconds(9 * 60)).toEqual({ min: 12, max: 18 });
  });

  it("never promises under 5 minutes", () => {
    expect(etaRangeFromSeconds(0)).toEqual({ min: 5, max: 11 });
  });

  it("beats the straight-line guess when the road is longer than the crow flies", () => {
    // 2 km as the crow flies, but 14 minutes by road: the honest answer is the bigger one.
    const guessed = etaRange(2_000);
    const measured = etaRangeFromSeconds(14 * 60);
    expect(measured.min).toBeGreaterThan(guessed.min);
  });
});

describe("rank", () => {
  const candidate = (over: Partial<RankedProfessional> = {}): RankedProfessional => ({
    userId: new Types.ObjectId(),
    distance: 1_000,
    location: { lat: 28.4, lng: 77.3 },
    gender: "female",
    rating: 4.5,
    jobsToday: 0,
    lastCompletedAt: null,
    ...over,
  });

  it("puts the nearest first", () => {
    const near = candidate({ distance: 200 });
    const far = candidate({ distance: 3_000 });
    expect(rank([far, near])[0]).toBe(near);
  });

  it("treats distances inside the same 500 m band as equal, and breaks the tie on rating", () => {
    const worse = candidate({ distance: 100, rating: 4.0 });
    const better = candidate({ distance: 400, rating: 4.9 });
    // Both sit in the first band, so the rating decides even though the lower-rated
    // professional is strictly closer.
    expect(rank([worse, better])[0]).toBe(better);
  });

  it("spreads work: equal distance and rating go to whoever has done fewer jobs today", () => {
    const busy = candidate({ jobsToday: 4 });
    const quiet = candidate({ jobsToday: 0 });
    expect(rank([busy, quiet])[0]).toBe(quiet);
  });

  it("then to whoever has been idle longest", () => {
    const justFinished = candidate({ lastCompletedAt: new Date("2026-10-15T10:00:00Z") });
    const longIdle = candidate({ lastCompletedAt: new Date("2026-10-15T06:00:00Z") });
    expect(rank([justFinished, longIdle])[0]).toBe(longIdle);
  });

  it("orders by road distance once Routes has answered, not by the map", () => {
    // Across a river: 400 m apart on the map, but a 9 km drive round the bridge.
    const acrossTheRiver = candidate({ distance: 400, road: { meters: 9_000, seconds: 20 * 60 } });
    const sameSide = candidate({ distance: 2_000, road: { meters: 2_400, seconds: 7 * 60 } });
    expect(rank([acrossTheRiver, sameSide])[0]).toBe(sameSide);
  });

  it("falls back to straight-line for anyone Routes could not answer for", () => {
    const noRoute = candidate({ distance: 300, road: null });
    const routed = candidate({ distance: 5_000, road: { meters: 5_200, seconds: 15 * 60 } });
    expect(rank([routed, noRoute])[0]).toBe(noRoute);
  });
});
