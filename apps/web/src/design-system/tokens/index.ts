import { accentRamps, type BrandDirection, neutral, overlay, semantic } from "./color";
import { breakpoints, container, elevation, grid, layer, motion, radius, touchTarget } from "./layout";
import { fontFamily, typeScale } from "./typography";

export * from "./color";
export * from "./layout";
export * from "./typography";

/** Everything components need, attached to the MUI theme as `theme.tokens`. */
export function buildTokens(direction: BrandDirection) {
  return {
    direction,
    neutral,
    accent: accentRamps[direction],
    semantic,
    overlay,
    radius,
    elevation,
    layer,
    motion,
    breakpoints,
    grid,
    container,
    touchTarget,
    fontFamily,
    typeScale,
  } as const;
}

export type AppTokens = ReturnType<typeof buildTokens>;
