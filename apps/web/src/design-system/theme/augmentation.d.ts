import type { CSSProperties } from "react";
import type { AppTokens } from "../tokens";

declare module "@mui/material/styles" {
  interface Theme {
    tokens: AppTokens;
  }
  interface ThemeOptions {
    tokens?: AppTokens;
  }
  interface TypographyVariants {
    display: CSSProperties;
    bodyLg: CSSProperties;
    label: CSSProperties;
    numericXl: CSSProperties;
  }
  interface TypographyVariantsOptions {
    display?: CSSProperties;
    bodyLg?: CSSProperties;
    label?: CSSProperties;
    numericXl?: CSSProperties;
  }
}

// Only the tokens from plan B3 may be used as Typography variants.
declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    display: true;
    bodyLg: true;
    label: true;
    numericXl: true;
    h4: false;
    h5: false;
    h6: false;
    subtitle1: false;
    subtitle2: false;
    overline: false;
    button: false;
  }
}
