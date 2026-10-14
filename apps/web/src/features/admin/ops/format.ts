import { formatMoney } from "@/lib/format";

/** "6 Oct 2026, 4:32 pm" in India time, for admin tables and timelines (the admin reads English). */
export const when = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) : "";

/** "4:32:10 pm" for timelines within one day. */
export const clock = (iso: string): string => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "Asia/Kolkata" });

export const rupees = (paise: number): string => formatMoney(paise, "en");

/** "₹1,049.50" with paise, for refunds and payments. */
export const rupeesExact = (paise: number): string => formatMoney(paise, "en", { decimals: true });

/** Today in India as YYYY-MM-DD (for date filters). */
export const istToday = (): string => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);

/** URL-synced filters: always build from the current address so quick changes don't overwrite each other. */
export function nextParams(changes: Record<string, string | null>): URLSearchParams {
  const next = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(changes)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  return next;
}
