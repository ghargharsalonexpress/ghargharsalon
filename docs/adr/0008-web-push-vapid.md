# ADR-0008: Web Push with VAPID, no Firebase
- Status: Accepted
- Date: 2026-10-05

## Context
Professionals use an installable PWA, not a native app, and must receive job offers quickly, including when the panel is closed. Facts verified in October 2026:
- **Android Chrome** delivers Web Push when the browser or PWA is closed. Delivery can be delayed by Doze and battery savers; send with `Urgency: high` and a short TTL.
- **iOS** needs version 16.4+ and the app added to the Home Screen. Permission must come from a tap.
- **Sound:** web notifications cannot play a custom sound. `vibrate` is ignored on Android 8+, `requireInteraction` does little on phones, and Chrome shows at most 2 action buttons.
- **Every push must display a notification.** Silent pushes are not allowed.

## Decision
- **Library:** standard Web Push with VAPID keys (the `web-push` library). Subscriptions are stored per device and removed on HTTP 404/410.
- **Offer payloads:**
  - minimal personal data: locality, services, earnings, expiry;
  - `tag: offer:<bookingId>`, so a "Job taken" update replaces the alert;
  - an "Accept" action that opens `/pro/offers/:id?intent=accept`.
- **When the panel is open:** a socket event triggers an in-app alarm with a custom sound loop. The audio is unlocked by the Online-toggle tap. A Screen Wake Lock keeps the screen on while the professional is Online or on a job.
- **Readiness checklist before going Online:** installed, notifications allowed, a test alert received, location allowed, battery-optimisation guidance.

## Alternatives considered
- **Firebase Cloud Messaging SDK:** needs a Firebase project and adds no reliability for web clients over standard Web Push.
- **SMS or call fallback:** reliable, but costs money per message and was excluded from v1. It stays on the backlog.
- **Native Android app:** the real fix for background reliability. Out of scope for v1 and listed in the scale path.

## Consequences
- **Client inputs:** "Firebase account" is removed from `docs/inputs-needed.md`.
- **Reliability:** professionals are asked to keep the panel open while Online (copy, readiness checklist, Wake Lock), and offers go to 3 professionals at once to absorb delays.
- **Field testing:** on real Android brands and iPhones is part of the Phase 4 and Phase 6 Definition of Done.
