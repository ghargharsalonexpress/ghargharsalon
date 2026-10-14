import { createTheme, type Shadows, type Theme } from "@mui/material/styles";
import { type BrandDirection, buildTokens } from "../tokens";
import { breakpoints, elevation, radius, SPACING_UNIT } from "../tokens/layout";
import { buildComponents } from "./components";
import { buildTypography } from "./typography";

/**
 * Elevation policy (plan B5): surfaces are flat; menus, popovers and toasts use e2;
 * drawers and dialogs use e3. MUI picks shadows by index, so the array is filled to match.
 */
function buildShadows(): Shadows {
  return Array.from({ length: 25 }, (_, index) => {
    if (index < 6) return "none";
    if (index < 13) return elevation.e2;
    return elevation.e3;
  }) as Shadows;
}

export function createAppTheme(direction: BrandDirection = "berry"): Theme {
  const tokens = buildTokens(direction);
  const { neutral: n, accent: a, semantic: s, motion } = tokens;

  return createTheme({
    tokens,
    breakpoints: { values: { ...breakpoints } },
    spacing: SPACING_UNIT,
    shape: { borderRadius: radius.sm },
    palette: {
      mode: "light",
      primary: { main: a[600], dark: a[700], light: a[100], contrastText: n[0] },
      secondary: { main: n[900], dark: n[800], light: n[200], contrastText: n[0] },
      error: { main: s.danger.fg, light: s.danger.bg, dark: s.danger.fg, contrastText: n[0] },
      warning: { main: s.warning.fg, light: s.warning.bg, dark: s.warning.fg, contrastText: n[0] },
      success: { main: s.success.fg, light: s.success.bg, dark: s.success.fg, contrastText: n[0] },
      info: { main: s.info.fg, light: s.info.bg, dark: s.info.fg, contrastText: n[0] },
      text: { primary: n[900], secondary: n[600], disabled: n[400] },
      divider: n[200],
      background: { default: n[0], paper: n[0] },
      grey: { 50: n[50], 100: n[100], 200: n[200], 300: n[300], 400: n[400], 500: n[500], 600: n[600], 700: n[700], 800: n[800], 900: n[900] },
      action: {
        hover: n[50],
        selected: a[50],
        disabled: n[400],
        disabledBackground: n[100],
        focus: n[100],
      },
    },
    typography: buildTypography(),
    shadows: buildShadows(),
    transitions: {
      duration: {
        shortest: motion.duration.fast,
        shorter: motion.duration.base,
        short: motion.duration.base,
        standard: motion.duration.enter,
        complex: motion.duration.enter,
        enteringScreen: motion.duration.enter,
        leavingScreen: motion.duration.exit,
      },
      easing: {
        easeInOut: motion.easing.enter,
        easeOut: motion.easing.enter,
        easeIn: motion.easing.exit,
        sharp: motion.easing.exit,
      },
    },
    components: buildComponents(tokens),
  });
}
