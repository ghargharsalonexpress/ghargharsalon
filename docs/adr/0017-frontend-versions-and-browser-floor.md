# ADR-0017: Front-end versions and browser support floor
- Status: Accepted
- Date: 2026-10-05
- Supersedes: the version details in ADR-0002 (Vite 7) and ADR-0003 (MUI v7; TanStack Table for admin tables). Everything else in those ADRs stands.

## Context
Phase 1 started the new app in `apps/web`. By then the current stable releases had moved past the versions named in the plan:
- **MUI 9.4** is the current major; v7 is in maintenance. MUI 9:
  - removes system props;
  - uses `slots`/`slotProps` everywhere;
  - consolidates class keys;
  - raises the browser floor to Safari 17, Chrome 117, Firefox 121 and Edge 121.
- **Vite 8.3** (Rolldown-based) is stable, which also ends the legacy app's experimental `rolldown-vite` override.
- **React Router 8** needs Node ≥ 22.22; the development machine runs Node 22.14.
- **TypeScript 7** (native compiler) is not yet supported by typescript-eslint, which supports versions below 6.1.
- **The original eslint-plugin-jsx-a11y** only supports ESLint ≤ 9, and ESLint 9 is end-of-life.

## Decision
**Versions** (`apps/web/package.json`):

| Area | Version | Note |
|---|---|---|
| React, React DOM | 19.3 | |
| MUI (material, icons-material) | 9.4 | With Emotion 11 |
| Vite | 8.3 | With @vitejs/plugin-react 6.1 |
| React Router | 7.18 (data router) | Move to 8 once the Node 22.22+ requirement is met (Phase 2 infrastructure) |
| TypeScript | 6.0 | Move to 7 when typescript-eslint supports it |
| ESLint | 10.12, with typescript-eslint 8.71, react-hooks 7 and eslint-plugin-jsx-a11y-x 0.2 | jsx-a11y-x is the maintained fork that supports ESLint 10 |
| i18n | i18next 26, react-i18next 17 | |
| Fonts | @fontsource-variable/noto-sans and noto-sans-devanagari 5.3 | |
| Tests | Vitest 5, Playwright 1.63, @axe-core/playwright 4.13 | |

**Browser support floor** (set by MUI 9):

| Who | Supported |
|---|---|
| Customers | Chrome and Edge 117+, Firefox 121+, Safari 17+ (iOS and iPadOS 17+) |
| Professionals | Android Chrome 117+ (main platform). iPhone: iOS 17+; push alerts also need the panel added to the Home Screen |
| Older browsers | A plain "please update your browser" page (Phase 2) |

**Admin tables:**
- For now the design-system `DataTable` sorts in memory and becomes a card list below 900 px.
- TanStack Table is adopted when server-side sorting, filtering and pagination arrive (Phase 8).
- The column API (`priority`, `sortValue`, `nowrap`) stays the same, so screens don't change.

**Theme overrides:**
- MUI 9 applies a component's `styleOverrides` only for the keys its override resolver returns.
- Alert colour keys (`colorSuccess`…) and Drawer anchor keys (`anchorBottom`) are no longer among them. They type-check but are silently ignored.
- Such styles are therefore written as class selectors under `root`, for example `"&.MuiAlert-standard.MuiAlert-colorSuccess"`.

## Alternatives considered
- **Stay on MUI 7.** It supports iOS 15+, but it is in maintenance, so we would have to migrate mid-build. iOS 17 runs on every iPhone from the XS/XR (2018) onwards. Few customers or professionals will still be on iOS 16 phones by launch.
- **React Router 8 now.** It needs a newer Node than the development machine has; we will move with the Phase 2 infrastructure.
- **TypeScript 7 now.** The lint toolchain does not support it yet.
- **ESLint 9 with the original jsx-a11y plugin.** ESLint 9 is end-of-life.

## Consequences
- **Plan updates:**
  - Plan A7 and risk R4 now say iOS 17+.
  - Plan B8 (DataTable) and C3 (versions) refer to this ADR.
- **On every MUI major upgrade:**
  1. Re-check each theme override key against MUI's override resolvers. A key that type-checks can still be ignored.
  2. Run the axe and visual suites.
- **Bundle size:** the first load is currently 176 KB of JavaScript (gzip): entry 97 KB, shared MUI 74 KB, small chunks 5 KB. The budget is 170 KB.
  - Phase 3 must recover this before its Lighthouse gate, for example by lazy-loading the toast host and loading only the active language's strings.
- **Location of the app:** `apps/web` is a new app beside the legacy `src/`. There is no git history yet, so all changes stay additive. The legacy app is retired in Phase 3, when the public pages are rebuilt.
