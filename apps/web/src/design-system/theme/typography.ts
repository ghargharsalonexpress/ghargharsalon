import type { CSSProperties } from "react";
import type { TypographyVariantsOptions } from "@mui/material/styles";
import { breakpoints } from "../tokens/layout";
import { fontFamily, HINDI_EXTRA_LINE_HEIGHT_PX, type TypeToken, typeScale } from "../tokens/typography";

export const rem = (px: number) => `${px / 16}rem`;

/** Line heights grow by --hi-extra-lh wherever the content language is Hindi. */
const lineHeight = (px: number) => `calc(${rem(px)} + var(--hi-extra-lh, 0rem))`;

export const HINDI_EXTRA_LH = rem(HINDI_EXTRA_LINE_HEIGHT_PX);

/** CSS for one type token, responsive at the md breakpoint. */
export function typeStyle(token: TypeToken): CSSProperties {
  const spec = typeScale[token];
  const style: Record<string, unknown> = {
    fontFamily,
    fontSize: rem(spec.mobile[0]),
    lineHeight: lineHeight(spec.mobile[1]),
    fontWeight: spec.weight,
    letterSpacing: 0,
  };
  if (spec.tabular) style.fontVariantNumeric = "tabular-nums";
  const [mSize, mLine] = spec.mobile;
  const [dSize, dLine] = spec.desktop;
  if (mSize !== dSize || mLine !== dLine) {
    style[`@media (min-width:${breakpoints.md}px)`] = {
      fontSize: rem(dSize),
      lineHeight: lineHeight(dLine),
    };
  }
  return style as CSSProperties;
}

/** Headings balance their lines so short last lines ("minutes") don't dangle. Ignored where unsupported. */
const heading = (token: TypeToken): CSSProperties => ({ ...typeStyle(token), textWrap: "balance" });

export function buildTypography(): TypographyVariantsOptions {
  return {
    fontFamily,
    htmlFontSize: 16,
    fontWeightLight: 400,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    display: heading("display"),
    h1: heading("h1"),
    h2: heading("h2"),
    h3: heading("h3"),
    // Not part of the scale; mapped so MUI internals that use them stay on-brand.
    h4: typeStyle("h3"),
    h5: typeStyle("h3"),
    h6: typeStyle("h3"),
    subtitle1: { ...typeStyle("body"), fontWeight: 500 },
    subtitle2: typeStyle("label"),
    overline: typeStyle("caption"),
    bodyLg: typeStyle("bodyLg"),
    body1: typeStyle("body"),
    body2: typeStyle("bodySm"),
    label: typeStyle("label"),
    caption: typeStyle("caption"),
    numericXl: typeStyle("numericXl"),
    button: { ...typeStyle("label"), textTransform: "none" },
  } as TypographyVariantsOptions;
}
