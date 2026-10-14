import { z } from "zod";
import { type Localized, slugSchema } from "./catalog";

/**
 * Money is integer paise everywhere (plan C4). These functions run identically in the
 * browser (estimates) and on the server (the authoritative price).
 */

export interface PricingSettings {
  platformFeePaise: number;
  gstRateBps: number;
  pricesIncludeGst: boolean;
}

export interface Totals {
  itemsPaise: number;
  platformFeePaise: number;
  /** Value before GST; with inclusive prices it is taken out of the total. */
  taxablePaise: number;
  gstPaise: number;
  totalPaise: number;
}

/** Half-up rounding of a non-negative fraction a/b without floating point. */
const divRound = (a: number, b: number) => Math.floor((2 * a + b) / (2 * b));

/**
 * Totals for a list of lines. With GST-inclusive prices (assumption A2) the total is what
 * the customer sees on the cards plus the platform fee, and GST is computed out of it.
 * Whether the platform fee carries GST is a CA question (A3); here it is part of the supply.
 */
export function computeTotals(lines: ReadonlyArray<{ unitPricePaise: number; quantity: number }>, settings: PricingSettings): Totals {
  for (const line of lines) {
    if (!Number.isInteger(line.unitPricePaise) || !Number.isInteger(line.quantity) || line.unitPricePaise < 0 || line.quantity < 0) {
      throw new Error("Prices and quantities must be non-negative integers (paise)");
    }
  }
  const itemsPaise = lines.reduce((sum, line) => sum + line.unitPricePaise * line.quantity, 0);
  const platformFeePaise = itemsPaise > 0 ? settings.platformFeePaise : 0;

  if (settings.pricesIncludeGst) {
    const totalPaise = itemsPaise + platformFeePaise;
    const taxablePaise = divRound(totalPaise * 10_000, 10_000 + settings.gstRateBps);
    return { itemsPaise, platformFeePaise, taxablePaise, gstPaise: totalPaise - taxablePaise, totalPaise };
  }
  const taxablePaise = itemsPaise + platformFeePaise;
  const gstPaise = divRound(taxablePaise * settings.gstRateBps, 10_000);
  return { itemsPaise, platformFeePaise, taxablePaise, gstPaise, totalPaise: taxablePaise + gstPaise };
}

/** "50% off" from the before/after prices; recomputed, never stored (audit rule 4). */
export const discountPercent = (pricePaise: number, compareAtPaise: number | null): number | null =>
  compareAtPaise && compareAtPaise > pricePaise ? Math.round(((compareAtPaise - pricePaise) * 100) / compareAtPaise) : null;

export const cartLineSchema = z.strictObject({
  serviceSlug: slugSchema,
  tierId: slugSchema,
  quantity: z.number().int().min(1).max(10),
  /** The price the visitor saw, so the server can say when it changed. */
  seenUnitPricePaise: z.number().int().min(0).optional(),
});

export const cartPriceSchema = z.strictObject({ lines: z.array(cartLineSchema).max(30) });
export type CartPriceInput = z.input<typeof cartPriceSchema>;

export type CartLineStatus = "ok" | "price_changed" | "quantity_capped" | "unavailable";

export interface PricedLine {
  key: string;
  serviceSlug: string;
  tierId: string;
  name: Localized;
  tierLabel: Localized;
  tierCount: number;
  unitPricePaise: number;
  quantity: number;
  linePaise: number;
  durationMin: number;
  status: CartLineStatus;
}

export interface CartPriceResponse extends Totals {
  lines: PricedLine[];
  gstRateBps: number;
  pricesIncludeGst: boolean;
  maxQuantityPerLine: number;
}

export const cartLineKey = (serviceSlug: string, tierId: string) => `${serviceSlug}:${tierId}`;
