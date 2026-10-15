import type { CSSProperties } from "react";
import type { TypographyVariantsOptions } from "@mui/material/styles";
import { breakpoints } from "../tokens/layout";
import { fontFamily, HINDI_EXTRA_LINE_HEIGHT_PX, type TypeToken, typeScale } from "../tokens/typography";

export const rem = (px: number) => `${px / 16}rem`;

/** Line heights grow by --hi-extra-lh wherever the content language is Hindi. */
const lineHeight = (px: number) => `calc(${rem(px)} + var(--hi-extra-lh, 0rem))`;

export const HINDI_EXTRA_LH = rem(HINDI_EXTRA_LINE_HEIGHT_PX);

/** CSS for one type token, responsive at the md breakpoint. */
export function typeStyle(token: TypeToken, family: string = fontFamily): CSSProperties {
  const spec = typeScale[token];
  const style: Record<string, unknown> = {
    fontFamily: family,
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
const heading = (token: TypeToken, family: string): CSSProperties => ({ ...typeStyle(token, family), textWrap: "balance" });

export function buildTypography({ headingFamily = fontFamily, bodyFamily = fontFamily }: { headingFamily?: string; bodyFamily?: string } = {}): TypographyVariantsOptions {
  const body = (token: TypeToken) => typeStyle(token, bodyFamily);
  return {
    fontFamily: bodyFamily,
    htmlFontSize: 16,
    fontWeightLight: 400,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    display: heading("display", headingFamily),
    h1: heading("h1", headingFamily),
    h2: heading("h2", headingFamily),
    h3: heading("h3", headingFamily),
    // Not part of the scale; mapped so MUI internals that use them stay on-brand.
    h4: typeStyle("h3", headingFamily),
    h5: typeStyle("h3", headingFamily),
    h6: typeStyle("h3", headingFamily),
    subtitle1: { ...body("body"), fontWeight: 500 },
    subtitle2: body("label"),
    overline: body("caption"),
    bodyLg: body("bodyLg"),
    body1: body("body"),
    body2: body("bodySm"),
    label: body("label"),
    caption: body("caption"),
    numericXl: typeStyle("numericXl", headingFamily),
    button: { ...body("label"), textTransform: "none" },
  } as TypographyVariantsOptions;
}
