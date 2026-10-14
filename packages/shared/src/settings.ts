import { z } from "zod";
import { V } from "./validation";

const int = (min: number, max: number) => z.number(V.invalid).int(V.invalid).min(min, V.invalid).max(max, V.invalid);
const paise = int(0, 1_00_000_00);
const time = z.string(V.time).regex(/^([01]\d|2[0-3]):[0-5]\d$/, V.time);

/**
 * Admin-editable business settings (plan A8). Money is integer paise and rates are
 * basis points (5% = 500), so no float ever reaches a price.
 */
export const settingsSchema = z
  .strictObject({
    pricing: z.strictObject({
      gstRateBps: int(0, 2_800),
      pricesIncludeGst: z.boolean(),
      platformFeePaise: paise,
      commissionBps: int(0, 10_000),
      maxQuantityPerLine: int(1, 10),
    }),
    matching: z.strictObject({
      radiusKm: int(1, 25),
      offersPerRound: int(1, 5),
      acceptWindowSeconds: int(10, 120),
      searchTimeoutSeconds: int(30, 600),
      stalePresenceSeconds: int(20, 600),
    }),
    operations: z.strictObject({
      serviceHours: z.strictObject({ open: time, close: time }),
      unpaidExpiryMinutes: int(5, 60),
      lateThresholdMinutes: int(5, 60),
      noShowWaitMinutes: int(5, 30),
      otpAttempts: int(3, 10),
      /** Where bookings are accepted (plan A12): closed rings of [lng, lat]; empty means anywhere. */
      activeAreas: z
        .array(
          z.strictObject({
            name: z.string(V.required).trim().min(1, V.required).max(80, V.invalid),
            polygon: z.array(z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])).min(4, V.areaPolygon).max(500, V.invalid),
          }),
        )
        .max(20),
    }),
    fees: z.strictObject({
      cancelAfterAcceptPaise: paise,
      noShowPaise: paise,
      cancelWhileSearchingPaise: paise,
      freeCancelWhenProfessionalLate: z.boolean(),
    }),
  })
  .superRefine((settings, ctx) => {
    if (settings.matching.acceptWindowSeconds >= settings.matching.searchTimeoutSeconds) {
      ctx.addIssue({ code: "custom", path: ["matching", "acceptWindowSeconds"], message: V.acceptWindowTooLong });
    }
    if (settings.operations.serviceHours.open >= settings.operations.serviceHours.close) {
      ctx.addIssue({ code: "custom", path: ["operations", "serviceHours", "close"], message: V.hoursOrder });
    }
  });

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  pricing: { gstRateBps: 500, pricesIncludeGst: true, platformFeePaise: 1_100, commissionBps: 2_500, maxQuantityPerLine: 3 },
  matching: { radiusKm: 5, offersPerRound: 3, acceptWindowSeconds: 30, searchTimeoutSeconds: 120, stalePresenceSeconds: 60 },
  operations: {
    serviceHours: { open: "08:00", close: "21:00" },
    unpaidExpiryMinutes: 15,
    lateThresholdMinutes: 10,
    noShowWaitMinutes: 10,
    otpAttempts: 5,
    // A placeholder launch area (Delhi NCR) until the client draws the real one (decision D4).
    activeAreas: [
      {
        name: "Delhi NCR",
        polygon: [
          [76.84, 28.35],
          [77.56, 28.35],
          [77.56, 28.9],
          [76.84, 28.9],
          [76.84, 28.35],
        ],
      },
    ],
  },
  fees: { cancelAfterAcceptPaise: 9_900, noShowPaise: 19_900, cancelWhileSearchingPaise: 0, freeCancelWhenProfessionalLate: true },
};

/** PUT /v1/admin/settings: the version guards against two admins overwriting each other. */
export const updateSettingsSchema = z.strictObject({ version: int(1, Number.MAX_SAFE_INTEGER), settings: settingsSchema });

export interface SettingsResponse {
  version: number;
  settings: Settings;
  updatedAt: string;
}

/** GET /v1/info: the settings visitors may see (hours, fees, limits), for pages and policies. */
export interface PublicInfo {
  serviceHours: { open: string; close: string };
  platformFeePaise: number;
  maxQuantityPerLine: number;
  searchTimeoutSeconds: number;
  /** After the arrival range plus this, the professional counts as late (free cancellation). */
  lateThresholdMinutes: number;
  /** How long a professional waits at the door before "customer not reachable" (the no-show fee). */
  noShowWaitMinutes: number;
  fees: Settings["fees"];
}

export const publicInfo = (settings: Settings): PublicInfo => ({
  serviceHours: settings.operations.serviceHours,
  platformFeePaise: settings.pricing.platformFeePaise,
  maxQuantityPerLine: settings.pricing.maxQuantityPerLine,
  searchTimeoutSeconds: settings.matching.searchTimeoutSeconds,
  lateThresholdMinutes: settings.operations.lateThresholdMinutes,
  noShowWaitMinutes: settings.operations.noShowWaitMinutes,
  fees: settings.fees,
});
