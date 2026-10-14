import type { TFunction } from "i18next";
import { brand } from "@/brand";
import { ApiError } from "./api";

/** "45 seconds" / "2 minutes" for rate-limit messages. */
function waitTime(t: TFunction, seconds: number): string {
  return seconds < 60 ? t("common:time.seconds", { count: seconds }) : t("common:time.minutes", { count: Math.ceil(seconds / 60) });
}

/** The sentence to show for any failure: says what happened and what to do next (plan B10). */
export function errorText(t: TFunction, error: unknown): string {
  if (!(error instanceof ApiError)) return t("common:errors.internal");
  switch (error.code) {
    case "RATE_LIMITED":
      return t("common:errors.rateLimited", { time: waitTime(t, error.retryAfterSeconds ?? 60) });
    case "ACCOUNT_BLOCKED":
    case "ACCOUNT_SUSPENDED":
      return t(`common:${error.messageKey}`, { support: `${brand.supportPhone} · ${brand.supportEmail}` });
    default:
      return t(`common:${error.messageKey}`, { defaultValue: t("common:errors.internal") });
  }
}

/** Field message keys come from shared schemas and the API ("validation.email"). */
export const fieldText = (t: TFunction, key: string | undefined): string | undefined => (key ? t(`common:${key}`) : undefined);
