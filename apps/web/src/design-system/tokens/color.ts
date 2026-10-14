// Colour tokens (plan B2). Every value here is checked for contrast in
// design-system/foundations/contrast.test.ts, so change them only with the test passing.

/** Warm grey ramp. Text uses 600+ on white; input borders use 500 (>= 3:1). */
export const neutral = {
  0: "#FFFFFF",
  25: "#FCFBFA",
  50: "#F7F6F4",
  100: "#EFEDEA",
  200: "#E2DFDA",
  300: "#CCC8C1",
  400: "#A8A29A",
  500: "#8A847B",
  600: "#6B655D",
  700: "#4F4A43",
  800: "#36322D",
  900: "#1F1C19",
} as const;

/** The two brand directions shown to the client (decision D1). 600 is the action colour. */
export const accentRamps = {
  berry: {
    50: "#FBEFF4",
    100: "#F5D9E5",
    200: "#EBB3CB",
    600: "#9E1F55",
    700: "#84184A",
    800: "#6A123B",
  },
  teal: {
    50: "#E8F4F3",
    100: "#CDE7E5",
    200: "#9FD0CC",
    600: "#0F6B66",
    700: "#0B5652",
    800: "#08423F",
  },
} as const;

export type BrandDirection = keyof typeof accentRamps;
export type AccentRamp = (typeof accentRamps)[BrandDirection];

/** Semantic tones: `fg` is text/icon on `bg` or white, `border` frames tinted surfaces. */
export const semantic = {
  success: { fg: "#1E7A45", bg: "#E7F4EC", border: "#B7DDC5", strong: "#1E7A45" },
  warning: { fg: "#8A5A00", bg: "#FFF4D6", border: "#F1D58C", strong: "#B7791F" },
  danger: { fg: "#B42318", bg: "#FDECEA", border: "#F5C2BC", strong: "#B42318" },
  info: { fg: "#1D5FBF", bg: "#EAF1FB", border: "#BCD3F2", strong: "#1D5FBF" },
} as const;

export type Tone = keyof typeof semantic;

/** Darker shades used only for hover/pressed states of the danger button. */
export const dangerInteractive = { hover: "#912018", pressed: "#7A1A13" } as const;

export const overlay = {
  scrim: "rgba(31, 28, 25, 0.48)",
} as const;
