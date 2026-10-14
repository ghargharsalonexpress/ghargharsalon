import { type ReactNode, useCallback, useMemo, useState } from "react";
import { type BrandDirection, accentRamps } from "@/design-system";
import { BrandDirectionContext } from "./brandDirectionContext";

const STORAGE_KEY = "brandDirection";

function isDirection(value: unknown): value is BrandDirection {
  return typeof value === "string" && value in accentRamps;
}

function readStoredDirection(): BrandDirection {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("brand");
    if (isDirection(fromUrl)) return fromUrl;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (isDirection(saved)) return saved;
  } catch {
    // Storage unavailable: fall back to the brand colour.
  }
  return "orange";
}

/**
 * The client chose orange, so that is the default. Berry and teal stay reachable behind
 * `?brand=` so the earlier directions can still be compared; once orange has settled this
 * collapses to a single constant.
 */
export function BrandDirectionProvider({ children }: { children: ReactNode }) {
  const [direction, setDirectionState] = useState<BrandDirection>(readStoredDirection);

  const setDirection = useCallback((next: BrandDirection) => {
    setDirectionState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not critical.
    }
  }, []);

  const value = useMemo(() => ({ direction, setDirection }), [direction, setDirection]);
  return <BrandDirectionContext.Provider value={value}>{children}</BrandDirectionContext.Provider>;
}
