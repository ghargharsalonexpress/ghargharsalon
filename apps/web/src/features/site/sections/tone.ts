import type { Section, SectionTone } from "@brand/shared";
import { useTheme } from "@mui/material/styles";

/** Colours for a section's tone; `inverse` means light text on a dark background. */
export function useTone(tone: SectionTone) {
  const { tokens } = useTheme();
  const n = tokens.neutral;
  if (tone === "dark") return { bg: n[900], fg: n[0], muted: "rgba(255,255,255,0.8)", eyebrow: tokens.accent[200], border: "rgba(255,255,255,0.14)", card: "rgba(255,255,255,0.06)", inverse: true };
  if (tone === "accent") return { bg: tokens.accent[50], fg: n[900], muted: n[700], eyebrow: tokens.accent[700], border: tokens.accent[100], card: n[0], inverse: false };
  if (tone === "soft") return { bg: n[25], fg: n[900], muted: n[600], eyebrow: tokens.accent[700], border: n[200], card: n[0], inverse: false };
  return { bg: n[0], fg: n[900], muted: n[600], eyebrow: tokens.accent[700], border: n[200], card: n[0], inverse: false };
}
export type ToneColors = ReturnType<typeof useTone>;

/** Ids for aria-labelledby, unique per section on a page. */
export const titleId = (section: Pick<Section, "id">) => `section-${section.id}-title`;
