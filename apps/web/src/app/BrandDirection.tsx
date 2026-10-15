import { type ReactNode, useMemo, useState } from "react";
import { type BrandDirection, accentRamps } from "@/design-system";
import { initialBrand } from "./brandParam";
import { BrandDirectionContext } from "./brandDirectionContext";

function isDirection(value: unknown): value is BrandDirection {
  return typeof value === "string" && value in accentRamps;
}

/**
 * The website's colour comes from Admin → Website → Brand & theme (ADR-0021). The style
 * guide can still try the hand-made ramps (or `?brand=berry` on any page) for this visit
 * only; null means "the site's own colour".
 */
export function BrandDirectionProvider({ children }: { children: ReactNode }) {
  const [direction, setDirection] = useState<BrandDirection | null>(() => (isDirection(initialBrand) ? initialBrand : null));
  const value = useMemo(() => ({ direction, setDirection }), [direction]);
  return <BrandDirectionContext.Provider value={value}>{children}</BrandDirectionContext.Provider>;
}
