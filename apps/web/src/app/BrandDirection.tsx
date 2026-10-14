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
    // Storage unavailable: fall back to the recommended direction.
  }
  return "berry";
}

/**
 * Phase 1 shows two brand directions to the client (decision D1). The choice is a
 * preview setting only; after D1 is decided this collapses to a single constant.
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
