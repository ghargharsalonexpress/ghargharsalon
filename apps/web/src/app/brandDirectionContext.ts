import { createContext, useContext } from "react";
import type { BrandDirection } from "@/design-system";

export interface BrandDirectionValue {
  /** A hand-made ramp chosen for this visit, or null for the site's own colour. */
  direction: BrandDirection | null;
  setDirection: (direction: BrandDirection | null) => void;
}

export const BrandDirectionContext = createContext<BrandDirectionValue | null>(null);

export function useBrandDirection(): BrandDirectionValue {
  const value = useContext(BrandDirectionContext);
  if (!value) throw new Error("useBrandDirection must be used inside <BrandDirectionProvider>");
  return value;
}
