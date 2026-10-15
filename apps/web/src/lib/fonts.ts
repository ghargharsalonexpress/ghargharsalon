import { SITE_FONTS, type SiteFont } from "@brand/shared";
import { fontStack } from "@/design-system";

const loaded = new Set<string>();

/**
 * Adds the Google Fonts stylesheet for a font the admin chose (ADR-0021). Noto Sans and
 * Poppins ship with the app, so the default site never waits for an outside font.
 */
export function loadSiteFont(font: SiteFont): void {
  const spec = SITE_FONTS[font].google;
  if (!spec || loaded.has(spec) || typeof document === "undefined") return;
  loaded.add(spec);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${spec}&display=swap`;
  document.head.append(link);
}

/** The CSS font stack for a site font, with Hindi and system fallbacks. */
export const siteFontStack = (font: SiteFont): string => fontStack(SITE_FONTS[font].family, !SITE_FONTS[font].body);
