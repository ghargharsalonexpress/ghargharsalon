// Spacing, layout, shape, elevation, layering and motion tokens (plan B4, B5, B7).

/** theme.spacing(n) = n * 4px. The allowed steps are listed in `spaceScale`. */
export const SPACING_UNIT = 4;
export const spaceScale = [0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96] as const;

export const breakpoints = { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1440 } as const;

export const grid = {
  xs: { columns: 4, margin: 16, gutter: 16 },
  sm: { columns: 8, margin: 24, gutter: 16 },
  md: { columns: 12, margin: 32, gutter: 24 },
  lg: { columns: 12, margin: 32, gutter: 24 },
  xl: { columns: 12, margin: 32, gutter: 24 },
} as const;

export const container = {
  marketing: 1200,
  app: 1120,
  reading: 720,
  form: 560,
  authCard: 400,
  admin: 1600,
} as const;

/** The only radii allowed. Never multiply theme.shape.borderRadius. */
export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  full: 9999,
} as const;

export const elevation = {
  e0: "none",
  e2: "0 6px 20px rgba(31, 28, 25, 0.12)",
  e3: "0 16px 40px rgba(31, 28, 25, 0.18)",
} as const;

/** Layering follows MUI's z-index scale so its own components stay consistent. */
export const layer = {
  sticky: 1050,
  appBar: 1100,
  actionBar: 1110,
  drawer: 1200,
  modal: 1300,
  toast: 1400,
  tooltip: 1500,
} as const;

export const motion = {
  duration: { fast: 100, base: 160, enter: 220, exit: 160 },
  easing: {
    enter: "cubic-bezier(0.2, 0, 0, 1)",
    exit: "cubic-bezier(0.4, 0, 1, 1)",
  },
} as const;

/** Minimum touch target; the professional panel uses the larger value (plan A6 principle 4). */
export const touchTarget = { default: 44, pro: 48 } as const;
