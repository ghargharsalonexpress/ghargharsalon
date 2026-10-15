import { type AccentRamp, accentRamps, neutral, overlay, semantic } from "./color";
import { breakpoints, container, type CornerStyle, elevation, grid, layer, motion, radiusFor, touchTarget } from "./layout";
import { fontFamily, typeScale } from "./typography";

export * from "./color";
export * from "./layout";
export * from "./typography";

export interface TokenOptions {
  /** The brand colour's shades (the site's theme colour, or a hand-made ramp). */
  accent?: AccentRamp;
  corners?: CornerStyle;
  /** CSS font stacks for headings and for everything else. */
  headingFamily?: string;
  bodyFamily?: string;
}

/** Everything components need, attached to the MUI theme as `theme.tokens`. */
export function buildTokens({ accent = accentRamps.orange, corners = "standard", headingFamily = fontFamily, bodyFamily = fontFamily }: TokenOptions = {}) {
  return {
    neutral,
    accent,
    semantic,
    overlay,
    radius: radiusFor(corners),
    elevation,
    layer,
    motion,
    breakpoints,
    grid,
    container,
    touchTarget,
    fontFamily: bodyFamily,
    headingFamily,
    typeScale,
  } as const;
}

export type AppTokens = ReturnType<typeof buildTokens>;
