import { type AccentRamp, accentRamps } from "../tokens/color";
import { contrastRatio } from "./contrast";

// Builds a full accent ramp from the one brand colour an admin picks (ADR-0021), keeping the
// rules contrast.test.ts checks for the hand-made ramps: white text on 600/700/800 passes AA,
// 700 is readable on the 50 tint, and 500 clears 3:1 on white.

const WHITE = "#FFFFFF";

type Hsl = [number, number, number];

function toHsl(hex: string): Hsl {
  const value = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16) / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s * 100, l * 100];
}

function toHex([h, s, l]: Hsl): string {
  const sat = Math.min(100, Math.max(0, s)) / 100;
  const light = Math.min(100, Math.max(0, l)) / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return `#${[f(0), f(8), f(4)]
    .map((channel) =>
      Math.round(channel * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .toUpperCase()}`;
}

/** Darkens until `test` passes (or black is reached). */
function darkenUntil([h, s, l]: Hsl, test: (hex: string) => boolean): Hsl {
  let lightness = l;
  while (lightness > 0 && !test(toHex([h, s, lightness]))) lightness -= 0.5;
  return [h, s, Math.max(0, lightness)];
}

const isHex = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);

/**
 * The ramp for a brand colour. The colours the design system was tuned with return their
 * hand-made ramps exactly; any other colour gets a generated one that meets the same rules.
 */
export function accentRampFromHex(hex: string): AccentRamp {
  const known = Object.values(accentRamps).find((ramp) => ramp[500].toLowerCase() === hex.toLowerCase());
  if (known) return known;
  if (!isHex(hex)) return accentRamps.orange;

  const [h, s] = toHsl(hex);
  // Bright display shade: the colour as picked, darkened only if it can't reach 3:1 on white.
  const bright = darkenUntil(toHsl(hex), (value) => contrastRatio(value, WHITE) >= 3);
  // Action colour: a little more than 4.5:1 with white text, so rounding never drops below.
  const action = darkenUntil(bright, (value) => contrastRatio(WHITE, value) >= 4.7);
  const hover: Hsl = [h, action[1], Math.max(0, action[2] - 7)];
  const pressed: Hsl = [h, action[1], Math.max(0, action[2] - 13)];
  const tintSaturation = Math.min(100, s * 0.9);

  const ramp = {
    50: toHex([h, tintSaturation, 96.5]),
    100: toHex([h, tintSaturation, 91.5]),
    200: toHex([h, tintSaturation, 82]),
    500: contrastRatio(hex, WHITE) >= 3 ? hex.toUpperCase() : toHex(bright),
    600: toHex(action),
    700: toHex(darkenUntil(hover, (value) => contrastRatio(value, toHex([h, tintSaturation, 96.5])) >= 4.7)),
    800: toHex(pressed),
  };
  return ramp;
}

/** True when the picked colour had to be darkened to stay readable (the editor says so). */
export const accentAdjusted = (hex: string): boolean => isHex(hex) && accentRampFromHex(hex)[500].toLowerCase() !== hex.toLowerCase();
