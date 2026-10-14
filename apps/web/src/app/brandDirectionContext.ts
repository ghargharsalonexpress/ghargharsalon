import { createContext, useContext } from "react";
import type { BrandDirection } from "@/design-system";

export interface BrandDirectionValue {
  direction: BrandDirection;
  setDirection: (direction: BrandDirection) => void;
}

export const BrandDirectionContext = createContext<BrandDirectionValue | null>(null);

export function useBrandDirection(): BrandDirectionValue {
  const value = useContext(BrandDirectionContext);
  if (!value) throw new Error("useBrandDirection must be used inside <BrandDirectionProvider>");
  return value;
}
