import { cartLineKey, type Localized } from "@brand/shared";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface CartLine {
  key: string;
  serviceSlug: string;
  tierId: string;
  quantity: number;
  /** The price the visitor saw when adding; the server flags it if it changed (W1). */
  unitPricePaise: number;
  name: Localized;
  tierLabel: Localized;
  tierCount: number;
  durationMin: number;
}

/** Plan A8 default; the server's cart price response carries the live setting. */
export const DEFAULT_MAX_QUANTITY = 3;

interface CartState {
  lines: CartLine[];
  maxQuantity: number;
  /** The unpaid booking checkout made from exactly these lines; any change to the lines forgets it. */
  heldFor?: string;
  add: (line: Omit<CartLine, "key" | "quantity">) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  hold: (bookingId: string) => void;
  /** That booking was paid somewhere other than checkout (its own page): the cart is done. */
  settle: (bookingId: string) => void;
  /** Applies the server's prices and quantity caps; drops nothing silently. */
  sync: (updates: ReadonlyArray<{ key: string; unitPricePaise: number; quantity: number; name: Localized; tierLabel: Localized }>, maxQuantity: number) => void;
}

/**
 * Client state for the cart only (ADR-0004: Zustand for client state). Persisted with a
 * versioned key so a future shape change can migrate or reset old carts safely.
 */
export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      maxQuantity: DEFAULT_MAX_QUANTITY,
      add: (line) =>
        set((state) => {
          const key = cartLineKey(line.serviceSlug, line.tierId);
          const existing = state.lines.find((item) => item.key === key);
          if (existing) {
            return { heldFor: undefined, lines: state.lines.map((item) => (item.key === key ? { ...item, quantity: Math.min(item.quantity + 1, state.maxQuantity) } : item)) };
          }
          return { heldFor: undefined, lines: [...state.lines, { ...line, key, quantity: 1 }] };
        }),
      setQuantity: (key, quantity) =>
        set((state) => ({
          heldFor: undefined,
          lines: quantity < 1 ? state.lines.filter((item) => item.key !== key) : state.lines.map((item) => (item.key === key ? { ...item, quantity: Math.min(quantity, state.maxQuantity) } : item)),
        })),
      remove: (key) => set((state) => ({ heldFor: undefined, lines: state.lines.filter((item) => item.key !== key) })),
      clear: () => set({ heldFor: undefined, lines: [] }),
      hold: (bookingId) => set({ heldFor: bookingId }),
      settle: (bookingId) => set((state) => (state.heldFor === bookingId ? { heldFor: undefined, lines: [] } : {})),
      sync: (updates, maxQuantity) =>
        set((state) => ({
          maxQuantity,
          lines: state.lines.map((item) => {
            const update = updates.find((candidate) => candidate.key === item.key);
            return update && update.unitPricePaise > 0 ? { ...item, unitPricePaise: update.unitPricePaise, quantity: update.quantity, name: update.name, tierLabel: update.tierLabel } : item;
          }),
        })),
    }),
    {
      name: "cart:v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ lines: state.lines, maxQuantity: state.maxQuantity, heldFor: state.heldFor }),
    },
  ),
);

export const cartCount = (lines: ReadonlyArray<CartLine>): number => lines.reduce((sum, line) => sum + line.quantity, 0);
export const cartEstimatePaise = (lines: ReadonlyArray<CartLine>): number => lines.reduce((sum, line) => sum + line.unitPricePaise * line.quantity, 0);
