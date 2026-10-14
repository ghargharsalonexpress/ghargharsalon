import type { TFunction } from "i18next";

/** "45 min", "1 hr", "1 hr 15 min" (and the Hindi equivalents). */
export function durationText(t: TFunction, minutes: number): string {
  if (minutes < 60) return t("common:duration.minutes", { count: minutes });
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? t("common:duration.hours", { count: hours }) : t("common:duration.hoursMinutes", { count: hours, minutes: rest });
}
