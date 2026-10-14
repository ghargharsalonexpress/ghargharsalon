# Project documentation

| Document | What it is |
|---|---|
| [PRODUCT_PLAN.md](PRODUCT_PLAN.md) | The approved product and implementation plan (Parts A–H, Phases 0–9). Start here. |
| [adr/](adr/README.md) | Architecture decision records: why each major choice was made |
| [requirements.md](requirements.md) | User stories and acceptance criteria for workflows W1–W18 |
| [state-machines.md](state-machines.md) | Booking, offer and presence states, transitions, timers and invariants |
| [wireflows.md](wireflows.md) | Low-fidelity flows for the four core journeys |
| [catalog-audit.md](catalog-audit.md) | Generated audit of the legacy catalogue (`node scripts/catalog/audit.mjs`) |
| [catalog-migration.md](catalog-migration.md) | Generated report of the catalogue migration, with what the client must decide (`node scripts/catalog/migrate.mjs`) |
| [risk-register.md](risk-register.md) | Risks, likelihood, impact and mitigation |
| [inputs-needed.md](inputs-needed.md) | Decisions, CA questions, legal documents, accounts and content needed from the client |
| [professional-application-form.md](professional-application-form.md) | Questions for the professional Google Form (English + draft Hindi) |
| [runbooks/local-development.md](runbooks/local-development.md) | Run MongoDB, the API and the web app on one machine; run every test suite |
| [runbooks/staging-deploy.md](runbooks/staging-deploy.md) | Step-by-step AWS + Atlas staging deploy (waiting for the client's accounts) |
| [runbooks/production-setup.md](runbooks/production-setup.md) | Accounts, keys and settings for staging and launch: Razorpay, SES, ImageKit, Maps, VAPID, GST seller details |
| [runbooks/operations.md](runbooks/operations.md) | What the team does when a booking is stuck, a refund fails, alerts stop, or a provider is down |
| [security-review.md](security-review.md) | OWASP ASVS Level 1 review with the evidence for each requirement |

## Phase 0 checklist
- [x] Plan approved and stored in the repo
- [x] Decisions recorded as ADRs (0001–0016)
- [x] Acceptance criteria for W1–W18
- [x] State machines, timers and invariants
- [x] Wireflows for the four core journeys
- [x] Catalogue audit with migration rules
- [x] Risk register
- [x] Client inputs list, CA questions, accounts checklist
- [x] Professional application form questions
- [x] Local git repository (nothing committed)
- [ ] Commits and GitHub repository: on hold, by the user's decision (2026-10-05). Do not commit or push until the user asks.
- [ ] Client answers to D1–D9 (defaults in place)
- [ ] Accounts created in test mode (client)

## Phase 1 checklist (brand and design system, `apps/web`)
- [x] Tokens (colour, type, spacing, shape, elevation, motion, layers) mapped into the MUI 9 theme
- [x] Two brand directions, Berry (A) and Teal (B), switchable everywhere
- [x] `/styleguide`: every component and state, with an English/Hindi switch, a brand switch and a 360/768/1024 preview
- [x] Shells: Public, Auth, Account, Professional, Admin
- [x] Sample screens for the brand decision: Home, Checkout, Job alert, Admin dashboard
- [x] Feedback patterns: toast, inline alert, banner, empty state, skeleton, 404, route error, boot screen
- [x] Lint rules: no raw colours or px outside the design system, wrapped MUI components only, jsx-a11y
- [x] Contrast verified in unit tests (30 unit tests in total)
- [x] Zero axe violations (WCAG 2.2 AA). Covered: style guide and samples in English and Hindi, Berry and Teal, at 360 and 1440 px, plus open dialogs and keyboard checks.
- [x] Lighthouse accessibility 100 on the style guide and all four samples (mobile)
- [x] Visual baseline: 19 Playwright snapshots, stable over 3 repeated runs. They are stored locally and not committed (git on hold).
- [x] Versions and browser floor recorded in [ADR-0017](adr/0017-frontend-versions-and-browser-floor.md)
- [ ] Client picks brand direction A or B (decision D1)
- [ ] Hindi strings reviewed by a native speaker (assumption A14)
- [ ] Samples checked on a real Android phone and an iPhone
- [ ] First-load JavaScript was 176 KB gzip against the 170 KB budget. It is now about 195 KB (see Phase 2). Recover it in Phase 3 (ADR-0017).

## Phase 2 checklist (platform foundation)
- [x] `packages/shared`: zod schemas, roles, error codes, settings, phone helpers. One copy of zod, tree-shaken in the web (ADR-0018).
- [x] `apps/api`: Express 5, MongoDB (Mongoose 9) and the core HTTP stack:
  - typed config that refuses unsafe production settings;
  - pino logs with request ids;
  - one error shape for every response;
  - strict zod validation;
  - helmet, CORS, signed double-submit CSRF with an Origin check, and rate limits;
  - `/health/live` and `/health/ready`.
- [x] Server-side sessions in MongoDB:
  - an httpOnly, SameSite=Lax cookie;
  - 30 days for customers and professionals, 12 hours idle for admins;
  - a new session id on every login;
  - every session revoked after a password reset, and on a block or suspension.
- [x] Auth endpoints: session, sign-up, login, logout, forgot, link check, reset/set password, `GET`/`PATCH /v1/me`. Passwords are hashed with Argon2id and checked against common and personal passwords.
- [x] Role checks on the server (`requireRole`, owner-or-admin). The admin settings API is versioned, with history and audit log.
- [x] Email: a log transport (`apps/api/.mail`) in development and SES in production. Templates (reset, set password) in English and Hindi.
- [x] Web: TanStack Query session, role guards, safe `next` redirects, and a session-expiry return path.
- [x] Web pages:
  - Login, Sign up, Forgot password, Reset/Set password;
  - customer profile with a language setting;
  - professional and admin landing pages.
- [x] Language: the profile language wins at login, and a switch while signed in is saved to the profile (W18). Offline banner in every shell.
- [x] Tests:
  - shared: 21;
  - API: 55 integration tests on an in-memory replica set;
  - web unit: 23;
  - Playwright: 65, made up of 10 auth flows, 36 axe/keyboard checks (now including the auth pages) and 19 visual snapshots.
- [x] Local stack checked end to end:
  - `npm run db`, then seed admin, then API and web;
  - admin login and logout, customer sign-up, reset email written;
  - the production bundle (`dist/index.js`) starts and is ready.
- [x] Deploy files: API Dockerfile, Caddy, production compose, local Mongo compose, CloudFront security headers. Runbooks for local and staging.
- [ ] Staging on AWS + Atlas, securityheaders.com grade A, CloudWatch logs. Blocked on the client's accounts ([runbooks/staging-deploy.md](runbooks/staging-deploy.md)).
- [ ] CI (GitHub Actions): on hold with GitHub. Every check runs locally with the commands in the runbook.
- [ ] Session-expiry interstitial that keeps unsaved form input. The return path works; draft-saving arrives with the first long forms (checkout, Phase 5).

## Phase 3 checklist (catalogue and public website)
- [x] Catalogue migration (`scripts/catalog/migrate.mjs`) from `src/store/data`, with a report: 9 categories, 194 services, 246 options.
  - Duplicate ids merged; identical copies under different ids merged; five mislabelled pedicures renamed.
  - Durations in minutes, filter typos fixed, every category mapped to a professional skill.
  - Photos: real ones re-encoded; AI-generated renders, vector art and stock photos repeated across many services dropped (neutral tile instead).
  - 11 same-name services with different prices are listed for the client to decide.
- [x] Hindi first drafts for all 194 service names and summaries (`apps/api/seed/hindi-drafts.json`) and for the three policies. A native speaker must review both (A14).
- [x] Catalogue API: public catalogue with ETag (browsers revalidate every visit), service details, server cart pricing, public hours and fees (`GET /v1/info`).
- [x] Admin API: services and categories with versioned saves and audit, category order, image upload re-encoded to AVIF/WebP sizes.
- [x] Seed: `npm run seed:catalog` (`-- --replace`, and `--prune` for development only).
- [x] Public website in English and Hindi:
  - Home with real categories, counts and prices, how it works, trust, questions.
  - Services with gender, categories, filters and search in the URL, and a details sheet at `/services/:slug`.
  - Cart priced on the server; changed prices and unavailable services are shown and must be accepted before checkout.
  - About, Contact (stored, emailed to both sides), policies (fees from settings), Join as a professional, 404, legacy redirects.
- [x] SEO: a title and description per page; `robots.txt` and `sitemap.xml` written at build time (`SITE_URL`, `API_URL`). Builds without `SITE_URL` block indexing.
- [x] Admin: Services list with search and filters, service editor (English/Hindi, options and prices, sections, photos, placement, unsaved-changes guard, version-conflict dialog), Categories (order by arrows or drag, edit dialog), Messages.
- [x] Tests: shared 35, API 70, web unit 31. Playwright 110: public and admin flows 15, auth 10, accessibility 66 (new pages in English and Hindi, at 360 and 1440 px), visual 19.
- [ ] Lighthouse mobile on Home and Services (performance 90, accessibility 100, SEO 95): to run on staging.
- [ ] First-load JavaScript is about 180 KB gzip against the 170 KB budget. Zod reaches public pages through shared schemas; splitting pure helpers from schemas is planned for the Phase 9 performance pass.
- [ ] Client: real photos for services and for the four categories without one; decide the 11 same-name services; review the Hindi drafts; give the professional form link (`VITE_PRO_FORM_URL`).

## Phase 4 checklist (professional foundation)
- [x] Professional profiles: gender, skills, base area, travel distance, verification stamp (who and when; no documents stored), photo, presence, stats. 2dsphere index for matching.
- [x] Admin: Professionals list (presence, verification, phones), Add/Edit from the application form, details page with test alert, set-password email and suspend/reactivate (signs out everywhere; refused during a job). All audited.
- [x] Onboarding (W11): adding a professional emails the set-password link; the panel opens in Hindi.
- [x] Professional panel at `/pro`, installable as its own app ([ADR-0019](adr/0019-pwa-worker-and-presence.md)):
  - Home with the Online switch, gated by readiness.
  - Readiness checklist: install, alerts proven by a test alert, location, battery settings per phone brand. Every step says what to do when something is blocked.
  - My jobs, Earnings and Profile (with language and logout).
- [x] Presence (W12): Online with a location fix; heartbeats every 20 s while visible; location watch; Wake Lock. Stale after 60 s of silence, offline after 5 minutes with a notification (sweeper every 15 s). "Reconnecting…" when heartbeats fail.
- [x] Web Push with VAPID (`web-push`): subscriptions per phone, removed when expired; test alerts; service worker shows alerts and opens the right page on tap. Development keys are in the local `.env`; production refuses to start without keys.
- [x] In-app alarm sound (Web Audio), unlocked by the Online tap; used by job alerts in Phase 6.
- [x] Update prompt: a new version waits for "Refresh", never reloads by itself.
- [x] Demo logins: `npm run seed:demo` (verified professional and a customer; passwords in `apps/api/.data/demo-accounts.txt`).
- [x] Tests: API 80 (10 for professionals: verification, presence, sweeper, alerts, suspension). Playwright: onboarding, going online with a real test alert, tabs, and axe on the panel (Hindi, 360 px) and the admin pages.
- [ ] Field test on real phones (3 Android brands and an iPhone): alerts with the app closed, median ≤ 5 s. Needs the staging site (HTTPS) and the client's phones.
- [ ] Brand name and colour in the manifests and icons (`node scripts/images/icons.mjs` after decision D1/D9).

## Phase 5 checklist (checkout, availability and payments)
- [x] Addresses (W3): up to ten per customer, one default; the pin comes from the phone's location ("Use my current location"), with flat, building, street, landmark, city and PIN code. Places Autocomplete waits for the Maps key.
- [x] Active areas (polygons) and service hours in settings; outside them the quote says why and when we open.
- [x] Availability quote (C6): nearest eligible professional by `$geoNear`, skills and preference; an arrival range ("5–11 min"), never one number; reasons: outside area, outside hours, everyone busy, nobody with the skills. Re-checked silently before payment.
- [x] Checkout page (`/checkout`): where, who, review and pay on one page; server prices; a disabled Pay button always says why; sticky pay bar on phones.
- [x] Payments behind one interface: Razorpay (orders, Checkout, signature check, webhooks, refunds) and a local gateway with a test payment sheet, so the whole flow runs without keys. Idempotency-Key on booking creation (one booking per double tap). Unpaid bookings expire after 15 minutes; a payment captured after expiry or cancellation is refunded automatically; reconciliation every 10 minutes.
- [x] Customer account: My bookings (current and past, "Load more"), Addresses, Profile, with a phone-friendly sub-menu.
- [ ] Razorpay test keys from the client, then the real-device UPI check on Android Chrome and iOS Safari (`PAYMENT_PROVIDER=razorpay`, see [runbooks/production-setup.md](runbooks/production-setup.md)).
- [ ] Google Maps key for Places Autocomplete and the map pin (`VITE_GOOGLE_MAPS_KEY`).

## Phase 6 checklist (matching and job alerts)
- [x] Matching engine: rounds of up to 3 nearest eligible professionals, 30 s to accept, next round without them, search ends at 120 s; atomic accept in one transaction (100/100 runs of 5 simultaneous accepts gave exactly one winner).
- [x] No professional: the booking ends and the full refund starts at once through the outbox; customer email and team alert.
- [x] Real time over Socket.IO (`/rt`, same session cookie): job alerts, closed alerts, booking updates and live location. Events only prompt a refetch; REST stays the source of truth.
- [x] Job alert page (`/pro/offers/:id`), full screen: distance and arrival range, area only, services, duration, earnings, a 30 s ring, the in-app alarm, Accept and Decline (optional quick reason). "Accept" on the notification opens it with `?intent=accept`.
- [x] Customer "Finding a professional" view: calm radar (static with reduced motion), elapsed time, the refund promise, free cancellation.
- [x] Admin direct offer (W14).
- [x] Tests: API matching suite; two-browser Playwright run where the professional's panel opens the alert by itself and accepts.
- [ ] Field test: alerts with the app closed on real Android phones (needs staging over HTTPS).

## Phase 7 checklist (job execution)
- [x] Professional job page (`/pro/jobs/:id`): one main button per stage (Navigate → I've arrived → the customer's code → Complete service), call logging, "customer not reachable" after the wait and two calls, cancel with a reason (the booking searches again without them).
- [x] Soft geofence on arrival (200 m) with "I'm at the address" confirmation; completing early asks first; five wrong codes lock the start and alert the team.
- [x] Live location while on the way: every 5 s or 25 m from the panel, ignored when worse than 100 m; "Location paused" for the customer after 2 minutes of silence. The ETA range counts down; late detection uses the settings.
- [x] Customer booking page (`/bookings/:id`), one URL for every state: payment due, finding, on the way (map when a key exists, text always), arrived (the code first), in progress (timer), completed (receipt, invoice, rating), cancelled or refunded (what happened and where the money is).
- [x] Cancellation with the fee spelled out before confirming (free while searching or when the professional is late); refunds of the rest.
- [x] Printable tax invoice (`/bookings/:id/invoice`) with SAC codes; numbers per financial year (`INV/2026-27/000001`).
- [x] Ratings once per booking; earnings per job (gross, platform share, net) and My jobs for the professional.
- [x] Tests: API jobs suite; two Playwright runs in two browsers (full lifecycle with a wrong and a right code; cancel while searching on a phone-sized screen) with axe on every screen.
- [ ] CA review of the invoice format, seller details and GSTIN (`SELLER_NAME`, `SELLER_ADDRESS`, `SELLER_GSTIN`), and CGST/SGST versus IGST lines.
- [ ] Google Routes API for road-based arrival times (straight-line estimate until the key exists).

## Phase 8 checklist (admin operations)
- [x] Dashboard: now (searching, jobs in progress, professionals online and busy, open alerts) and today (bookings, paid, revenue less refunds, completed, cancelled, no-match rate, median time to accept), refreshed every 15 s. The bell in the top bar shows open alerts on every page.
- [x] Alerts: no professional, refund failed (webhook or the outbox giving up), late, code locked, professional cancelled; resolve from the dashboard or the booking. Alerts about a passing condition (slow search, late, code locked, professional cancelled) resolve themselves once the booking moves on; "no professional" and "refund failed" wait for a person.
- [x] Live board: searching bookings with their deadline, jobs in progress, professionals online with their last location; a map of all of them once the Maps key exists.
- [x] Bookings: filters (active, searching, needs attention, completed, cancelled; dates) and search by number, name, email or phone, kept in the URL; CSV export with spreadsheet formulas neutralised.
- [x] Booking details: summary, timeline with who did each step, offers (round, distance, push), payments and refunds (retry a failed one), internal notes; actions: direct offer, reassign, cancel with the fee the team chooses, manual refund up to what's left. Every action is audited.
- [x] Customers: search, details with bookings and spend, block (signs them out everywhere) and unblock with a reason.
- [x] Payments and refunds lists; reviews with hide and show (the professional's rating follows); professional performance (accept rate, completed jobs, rating, cancellations) and "Mark as paid out".
- [x] Settings: pricing, matching, hours and service areas (corners as latitude, longitude), cancellation fees; checked before saving, a preview of every change, version conflicts handled, history.
- [x] Audit log with the values before and after.
- [x] Tests: API 114 (9 for admin operations); a Playwright run through dashboard, live board, search, note, direct offer, cancel and refund, block, money, audit and settings, with axe on each page.
- [ ] Polygon drawing on a map for service areas (the corner list works without a key).

## Phase 9 checklist (hardening, content and launch)
- [x] Performance: first-load JavaScript is 166 KB with Brotli (as CloudFront serves it) and 190 KB with gzip, against the 170 KB budget. Zod is out of the first load; the toast and the boot bar no longer load MUI components up front; style guide and samples are left out of production builds (`VITE_SHOW_STYLEGUIDE=1` keeps them on staging for the brand review).
- [x] Security review against OWASP ASVS Level 1 ([security-review.md](security-review.md)): an authorisation test covers all 63 protected endpoints (guests 401, wrong roles 403), plus CSRF, Origin and CORS checks.
- [x] Dependency audit (`npm audit --omit=dev`): 0 known vulnerabilities in the API, the web app and the shared package (6 Oct 2026). Secret scan of the source: no keys; `.env` and `.data` are git-ignored.
- [x] Client error reports: `POST /v1/client-errors` (rate-limited, path only, kept 30 days), sent by the route error boundary and for uncaught errors in production builds.
- [x] Refund failures raise an admin alert (Razorpay webhook or the outbox giving up) and can be retried; a locked start code can be unlocked by the team.
- [x] Content Security Policy for CloudFront updated for Razorpay Checkout and the Google Maps JavaScript API (`infra/cloudfront/security-headers.json`).
- [x] Policies show the live settings (fees, late threshold, waiting time, search time) instead of fixed numbers.
- [x] Runbooks: [operations](runbooks/operations.md) and [production setup](runbooks/production-setup.md).
- [x] Load test: `apps/api/load/k6-instant.js` (300 professionals online with heartbeats and location, 20 bookings a minute) with `npm run seed:load` for the accounts. Run it with k6 against a load-test environment, never production.
- [x] Tests: shared 35, API 120, web unit 40; Playwright covers the public site, auth, catalogue admin, the professional panel, the full booking lifecycle in two browsers, admin operations, axe on every new page, and 19 visual snapshots (rebased for the 16/24/32 px page margins of plan B4).
- [x] Happy path you can watch: `npm run demo` (live, on the dev app) and `npm run walkthrough` (every screen, built into `Proposal/Happy_Path.pdf`); see [local development](runbooks/local-development.md) §7.
- [x] Fixed while recording it (6 Oct 2026):
  - The customer's live location arrives within seconds. The server had dropped "watch this booking" when it came the moment the socket connected, so the customer only saw the 15-second refresh.
  - The professional's panel also sends the last position it gets while the previous one is still sending.
  - A refresh can't move the pin back to the older saved position.
  - "Updated in 3 seconds" now reads "now".
  - Start code: typing over a wrong code works, including the same digit in the same box.
  - Search boxes kept in the address bar no longer lose letters typed quickly.
  - The professional's bottom tabs mark the open tab, not always Home.
  - Edge no longer shows a second eye button on password fields.
  - Messages (toasts) sit above bottom bars instead of covering their buttons.
  - The admin booking page shows "5 stars", not a raw text key. A unit test now checks every text key and plural.
- [ ] Legal pages approved by the client's legal adviser (A13); Hindi reviewed by a native speaker (A14).
- [ ] Real-device matrix and outdoor field tests (push with the app closed, live location, UPI).
- [ ] k6 run on staging-sized hardware; restore drill; go/no-go review; pilot.
