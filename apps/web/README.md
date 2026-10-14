# apps/web

The customer website, the professional panel and the admin, built on one design system. React 19, MUI 9, Vite 8, React Router 7 and TypeScript 6 (versions: [ADR-0017](../../docs/adr/0017-frontend-versions-and-browser-floor.md)).

## Run
```bash
npm install
npm run dev          # http://localhost:5174 (the legacy app keeps 5173)
```

| Page | What it shows |
|---|---|
| `/styleguide` | Every token, component and state. Switch brand (Berry/Teal), language (EN/हिं) and preview width in the toolbar. |
| `/samples/home` | Public home: hero, categories, trust, how it works |
| `/samples/checkout` | Where, who, availability, price summary and pay (sticky bar on phones) |
| `/samples/job-alert` | Professional's full-screen job offer with the 30-second ring |
| `/samples/admin` | Admin dashboard: KPIs, alerts, bookings table (cards on phones) |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | Authentication (W2); `/reset-password?mode=set` is a new professional's first password (W11) |
| `/account` | Customer profile and language (customers only) |
| `/pro`, `/admin` | Professional and admin landing pages (role-guarded) |

Add `?brand=teal` to any URL to preview direction B. The auth pages need the API (`apps/api`, port 4000); set `VITE_API_URL` in `.env.local` if it runs elsewhere.

## Check
| Command | What it does |
|---|---|
| `npm run typecheck` | TypeScript, strict |
| `npm run lint` | ESLint, including the design-system rules below and jsx-a11y |
| `npm test` | Vitest unit tests (contrast, formatting, phone numbers) |
| `npm run build` | Type-check and production build |
| `npm run e2e` | Playwright: auth flows, axe (WCAG 2.2 AA), keyboard checks and visual snapshots. Starts its own API (port 4100, in-memory DB) and web server (port 5175), so your dev data is never touched. |
| `npm run e2e:update` | Re-create visual snapshots. Review every changed image before accepting it. |

On Windows the tests use the installed Microsoft Edge; on Linux (CI) they use Playwright's Chromium. Snapshots are stored per platform in `e2e/__screenshots__/`.

## Rules (enforced by lint)
- Screens import UI from `@/design-system`, never MUI's wrapped components (Button, Dialog, TextField and others) directly.
- No raw hex colours or px values outside `src/design-system`; use tokens and `theme.spacing`.
- Every user-facing string lives in `src/i18n/locales/{en,hi}`. Feature namespaces load with their route (`src/i18n/namespaces.ts`).
- Money is integer paise and is shown with `formatMoney`.

## Layout
```
src/
  app/            router, providers, session and role guards, language sync, brand-direction preview
  design-system/  tokens, theme, components, shells (the only place that styles MUI)
  features/       auth, account, pro, admin, styleguide, samples, system pages (404, route error, boot)
  i18n/           i18next setup, locale files, per-route namespaces
  lib/            API client, error and form helpers, formatting (money, time, distance)
e2e/              Playwright: auth.spec.ts, a11y.spec.ts, visual.spec.ts
```

Contracts (schemas, roles, error codes) come from `@brand/shared` in `packages/shared` (ADR-0018).
