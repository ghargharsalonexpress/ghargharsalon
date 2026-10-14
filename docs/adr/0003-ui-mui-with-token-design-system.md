# ADR-0003: Keep MUI v7 behind a token-driven design system
- Status: Accepted. The MUI version and the admin table library are superseded by [ADR-0017](0017-frontend-versions-and-browser-floor.md) (MUI 9; in-memory DataTable until Phase 8).
- Date: 2026-10-05

## Context
The current UI looks template-like. The cause is not MUI itself but how it is used:
- default styling;
- 226 inline `sx` overrides with hard-coded colours;
- 28–56 px radii, because `shape.borderRadius` is 14 and `sx` multiplies it;
- gradients, a marquee, an autoplay video;
- an accent colour that fails contrast.

The product needs accessible primitives (dialogs, menus, tabs, selects) that work in Hindi and English and on touch and keyboard.

## Decision
- **MUI v7 stays**, but is fully re-themed from the tokens in plan Part B.
- **Screens use only wrapper components** from `apps/web/src/design-system` (Button, Field, Dialog/Sheet, DataTable, StatusPill, and so on). They never style MUI directly.
- **`sx` is for layout only** (spacing and grid, using tokens). Lint forbids raw colours and px values outside the design system.
- **Defaults turned off:** ripple is disabled; focus-visible and pressed states are designed instead. Only Grid v2.
- **Admin tables:** TanStack Table (headless) on MUI Table primitives, with a card-list fallback below 900 px.

## Alternatives considered
- **Tailwind + Radix (shadcn/ui):**
  - we would rebuild every primitive and table before showing any value;
  - the default shadcn look is itself widely recognised as generic.
- **MUI X DataGrid:** heavy, hard to restyle to our tokens, and poor on phones.
- **Chakra / Mantine:** a migration cost with no user-facing benefit over a well-themed MUI.

## Consequences
- **Phase 1 effort:** the theme and wrappers carry most of the work, and every component state appears in `/styleguide`.
- **Consistency:** comes from the wrappers plus lint rules, not from reviewer discipline.
- **framer-motion:** removed, because motion is CSS transitions in the theme (plan B7).
