# ADR-0019: Hand-written service worker, two manifests and the presence sweeper
- Status: Accepted
- Date: 2026-10-05
- Builds on: ADR-0007 (timers), ADR-0008 (Web Push with VAPID)

## Context
Phase 4 makes the professional panel an installable app that receives job alerts and reports presence. Three implementation questions came up that the plan (C3, C7) left open or answered differently from what works in practice:
1. **The worker.** The plan names `vite-plugin-pwa` (injectManifest). It does not yet declare support for Vite 8, which `apps/web` uses (ADR-0017).
2. **The manifest scope.** The plan gives the professional manifest `scope: /pro/` with `start_url: /pro`. A start URL must sit inside the scope, and `/pro` is not inside `/pro/`. Login, password and policy pages also live outside `/pro`; out-of-scope pages open in a browser tab on top of the installed app, which breaks the flow when a session expires.
3. **Stale presence.** Matching must skip professionals whose heartbeats stopped (plan A8: stale after 60 s, offline after 5 min), and they must learn why they went offline.

## Decision
- **Worker:** a small hand-written `apps/web/public/sw.js`, registered at `/` for both areas.
  - **Push:** shows every alert (browsers require it), quietly marks expired offers, and supports action buttons with their own URLs (the offer's "Accept" in Phase 6).
  - **Notification taps:** focus an open window and navigate it, or open a new one.
  - **Offline:** only in production builds. Navigations are network-first with the cached shell as a fallback; hashed `/assets/` files are cache-first; images are stale-while-revalidate. API calls are never cached by the worker.
  - **Updates:** a new version waits until the person taps "Refresh" (never mid-job), shown by `UpdatePrompt`.
  - **Development:** registered as `/sw.js?dev=1`, which caches nothing, so Vite's hot reload is untouched.
- **Manifests:** `/manifest.webmanifest` (customer, `id: /`) and `/pro.webmanifest` (`id: /pro`, `start_url: /pro`, Hindi). Both use `scope: /`, so login and password pages stay inside the installed app. The professional layout switches the page's manifest link while mounted (`useManifest`).
- **Icons** are generated from the monogram by `node scripts/images/icons.mjs`; re-run it when the brand name or colour is decided (D1, D9).
- **Presence sweeper:** the API process runs `sweepPresence` every 15 s. Silent `available` professionals become `stale` after `settings.matching.stalePresenceSeconds`; `stale` ones become `offline` after 5 minutes and get a push saying so. Each step is a conditional update, so a restart or an overlapping run can't double-apply. Reads also compute "stale" on the fly, so the admin never sees a stale professional as online between sweeps.
- **Readiness gate:** the Online switch needs a verified profile, notification permission with a test alert the professional confirmed (or the worker reported), and location permission. On iPhone it also needs the Home Screen app. Installing and battery settings are shown as steps but don't block on a computer.
- **Development without keys:** with no VAPID keys, `PUSH_TRANSPORT=webpush` falls back to logging alerts and the panel says alerts aren't set up. `npm run seed:demo` makes a verified demo professional. Production refuses to start without VAPID keys.

## Alternatives considered
- **Wait for `vite-plugin-pwa` to support Vite 8, or downgrade Vite.** The worker needs only push, taps, a shell cache and update control; a plugin adds precache manifests we don't need yet. Revisit if offline needs grow.
- **Keep `scope: /pro/`.** Rejected for the reasons above; separate `id`s keep the two apps distinct.
- **A database TTL index for presence.** TTL deletes documents and can't notify anyone.

## Consequences
- The worker is plain JavaScript in `public/`, outside TypeScript checks; its behaviour is covered by the E2E specs (push subscription, test alert) and kept small.
- The manifests hold the placeholder name "Brand"; they change with the brand decision.
- One API instance runs the sweeper. Running several instances needs a leader lease first (plan C18).
