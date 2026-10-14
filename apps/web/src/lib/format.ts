// Locale-aware formatting (plan B10). Western digits in both languages; Indian digit grouping.

export type Lang = "en" | "hi";

/** BCP-47 locale with Latin numerals forced for Hindi ("-u-nu-latn"). */
export function localeFor(lang: string): string {
  return lang === "hi" ? "hi-IN-u-nu-latn" : "en-IN";
}

/** Money is stored in integer paise. Whole rupees by default; invoices pass `decimals: true`. */
export function formatMoney(paise: number, lang: string, options: { decimals?: boolean } = {}): string {
  if (!Number.isInteger(paise)) throw new Error(`formatMoney expects integer paise, got ${paise}`);
  const digits = options.decimals ? 2 : 0;
  return new Intl.NumberFormat(localeFor(lang), {
    style: "currency",
    currency: "INR",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(paise / 100);
}

export function formatNumber(value: number, lang: string): string {
  return new Intl.NumberFormat(localeFor(lang)).format(value);
}

/** "4:30 pm" in English; Hindi names the time of day instead ("शाम 4:30"), as people say it (plan B10). */
export function formatTime(date: Date, lang: string): string {
  const options: Intl.DateTimeFormatOptions =
    lang === "hi" ? { hour: "numeric", minute: "2-digit", dayPeriod: "short" } : { hour: "numeric", minute: "2-digit", hour12: true };
  return new Intl.DateTimeFormat(localeFor(lang), options).format(date);
}

export function formatDate(date: Date, lang: string): string {
  return new Intl.DateTimeFormat(localeFor(lang), { day: "numeric", month: "short", year: "numeric" }).format(date);
}

/** "1.2 km" / "800 m". */
export function formatDistance(meters: number, lang: string): string {
  if (meters < 1000) {
    return new Intl.NumberFormat(localeFor(lang), { style: "unit", unit: "meter", maximumFractionDigits: 0 }).format(Math.round(meters / 10) * 10);
  }
  return new Intl.NumberFormat(localeFor(lang), { style: "unit", unit: "kilometer", maximumFractionDigits: 1 }).format(meters / 1000);
}

/**
 * "2 minutes ago" style text for live data. A time slightly ahead of `now` (a server clock a
 * little ahead of the phone's, or a clock that ticks every few seconds) reads "now", never "in 3 seconds".
 */
export function formatRelativeFromNow(date: Date, lang: string, now: Date = new Date()): string {
  const seconds = Math.min(0, Math.round((date.getTime() - now.getTime()) / 1000));
  const rtf = new Intl.RelativeTimeFormat(localeFor(lang), { numeric: "auto" });
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(Math.round(seconds), "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  return rtf.format(Math.round(seconds / 3600), "hour");
}
