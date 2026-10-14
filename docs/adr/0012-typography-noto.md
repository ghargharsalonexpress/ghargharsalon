# ADR-0012: Noto Sans + Noto Sans Devanagari
- Status: Accepted
- Date: 2026-10-05

## Context
- **Scripts:** customer and professional screens are bilingual (Latin and Devanagari) and often appear side by side.
- **Today:** the theme names Poppins, but the font is never loaded, so users see system fonts.
- **Admin needs density and tabular figures**, and professionals need legibility on low-end phones in sunlight.

## Decision
- **Fonts:** Noto Sans for Latin and Noto Sans Devanagari for Hindi.
- **Loading:**
  - self-hosted through Fontsource variable fonts;
  - split by `unicode-range`, so the Devanagari file loads only when Hindi text appears;
  - `font-display: swap` with a size-adjusted Arial fallback, to avoid layout shift.
- **Type rules (plan B3):**
  - +4 px line height for Devanagari;
  - no letter-spacing tricks, all-caps or italics;
  - tabular numbers for prices, timers and tables.

## Alternatives considered
- **Poppins:** it covers Devanagari, but it is geometric and wide, which hurts density in admin, and it is strongly associated with templates.
- **Inter + a separate Devanagari face:** the two families' heights and weights don't match, so mixed lines look uneven.
- **Mukta or Hind:** good Hindi, but a narrower weight range and fewer numeric features.

## Consequences
- **Font budget:** about 60 KB per Latin weight file; only weights 400, 500 and 600 ship.
- **Pages without Hindi** never download the Devanagari file.
