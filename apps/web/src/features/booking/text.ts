import { type BookingAddressDto, type Localized, pick } from "@brand/shared";
import type { TFunction } from "i18next";
import { formatDate, formatTime } from "@/lib/format";

/** "Flat 12, Green Towers, Sector 15, Faridabad 121007". The landmark is shown on its own line. */
export const addressLine = (address: Pick<BookingAddressDto, "house" | "building" | "street" | "city" | "pincode">): string =>
  [address.house, address.building, address.street, `${address.city} ${address.pincode}`].map((part) => part.trim()).filter(Boolean).join(", ");

/** "Fruit facial" or "Fruit facial + 2 more", in the reader's language. */
export function itemsTitle(t: TFunction, items: ReadonlyArray<{ name: Localized }>, lang: string): string {
  const first = pick(items[0]?.name, lang);
  return items.length > 1 ? t("booking:items.andMore", { first, count: items.length - 1 }) : first;
}

const dayNumber = (date: Date) => Math.floor((date.getTime() - date.getTimezoneOffset() * 60_000) / 86_400_000);

/** "today at 8:00 am", "tomorrow at 8:00 am" or "on 7 Oct 2026 at 8:00 am". */
export function whenText(t: TFunction, iso: string, lang: string, now = new Date()): string {
  const date = new Date(iso);
  const time = formatTime(date, lang);
  const days = dayNumber(date) - dayNumber(now);
  if (days <= 0) return t("booking:when.today", { time });
  if (days === 1) return t("booking:when.tomorrow", { time });
  return t("booking:when.onDate", { time, date: formatDate(date, lang) });
}

/** "4:32 pm, 6 Oct 2026" for timelines and receipts. */
export const dateTimeText = (iso: string, lang: string): string => `${formatTime(new Date(iso), lang)}, ${formatDate(new Date(iso), lang)}`;
