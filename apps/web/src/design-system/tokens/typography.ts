// Typography tokens (plan B3). Sizes are in px for readability and converted to rem
// in the theme, so text scales with the user's browser font size.

export const fontFamily = [
  '"Noto Sans Variable"',
  '"Noto Sans Devanagari Variable"',
  '"Noto Sans"',
  '"Noto Sans Devanagari"',
  "system-ui",
  "-apple-system",
  '"Segoe UI"',
  "Roboto",
  "Arial",
  "sans-serif",
].join(", ");

export type TypeToken =
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "bodyLg"
  | "body"
  | "bodySm"
  | "label"
  | "caption"
  | "numericXl";

export interface TypeSpec {
  /** [font size, line height] in px below the md breakpoint. */
  mobile: readonly [number, number];
  /** [font size, line height] in px from the md breakpoint up. */
  desktop: readonly [number, number];
  weight: 400 | 500 | 600;
  tabular?: boolean;
  /** Where the token is allowed; shown in the style guide. */
  use: string;
}

export const typeScale: Record<TypeToken, TypeSpec> = {
  display: { mobile: [32, 40], desktop: [44, 52], weight: 600, use: "Home hero headline only" },
  h1: { mobile: [26, 34], desktop: [32, 40], weight: 600, use: "Page title, one per page" },
  h2: { mobile: [20, 28], desktop: [24, 32], weight: 600, use: "Section title" },
  h3: { mobile: [17, 24], desktop: [18, 26], weight: 600, use: "Card or sub-section title" },
  bodyLg: { mobile: [17, 26], desktop: [18, 28], weight: 400, use: "Marketing paragraphs" },
  body: { mobile: [16, 24], desktop: [16, 24], weight: 400, use: "Default text and all inputs" },
  bodySm: { mobile: [14, 20], desktop: [14, 20], weight: 400, use: "Secondary text, table cells, help text" },
  label: { mobile: [14, 20], desktop: [14, 20], weight: 500, use: "Form labels, buttons" },
  caption: { mobile: [12, 16], desktop: [12, 16], weight: 500, use: "Meta and badges, never essential information" },
  numericXl: { mobile: [28, 32], desktop: [32, 36], weight: 600, tabular: true, use: "Arrival time, countdown, totals" },
};

/** Extra line height for Devanagari, applied through the --hi-extra-lh CSS variable. */
export const HINDI_EXTRA_LINE_HEIGHT_PX = 4;
