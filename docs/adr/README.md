# Architecture decision records

Each significant decision is recorded once, here, so nobody has to re-decide it during implementation.

**Rules**
- One decision per file, numbered in order.
- Never edit an accepted ADR's decision. To change it, write a new ADR that says "Supersedes ADR-00XX" and mark the old one "Superseded by ADR-00YY".
- Status values: Proposed, Accepted, Superseded, Rejected.

| ADR | Decision | Status |
|---|---|---|
| [0001](0001-record-decisions.md) | Record decisions as ADRs | Accepted |
| [0002](0002-monorepo-and-typescript.md) | npm-workspaces monorepo with TypeScript everywhere | Accepted (Vite version superseded by 0017) |
| [0003](0003-ui-mui-with-token-design-system.md) | Keep MUI behind a token-driven design system | Accepted (MUI version and table library superseded by 0017) |
| [0004](0004-state-management.md) | TanStack Query for server state, Zustand for client state | Accepted |
| [0005](0005-sessions-not-jwt.md) | Server-side sessions in MongoDB, not JWT | Accepted |
| [0006](0006-realtime-socketio.md) | Socket.IO on the API server for real-time | Accepted |
| [0007](0007-timers-and-outbox.md) | Data-driven timers, sweeper and transactional outbox (no Redis in v1) | Accepted |
| [0008](0008-web-push-vapid.md) | Web Push with VAPID, no Firebase | Accepted |
| [0009](0009-payments-razorpay.md) | Upfront Razorpay payment, instant refund on no-match | Accepted |
| [0010](0010-money-and-gst.md) | Integer paise, GST-inclusive display, FY invoice series | Proposed (CA review) |
| [0011](0011-hosting-aws.md) | S3 + CloudFront web, Lightsail API, Atlas Mumbai | Accepted |
| [0012](0012-typography-noto.md) | Noto Sans + Noto Sans Devanagari | Accepted |
| [0013](0013-one-url-per-booking.md) | One URL per booking with status-driven views | Accepted |
| [0014](0014-matching-broadcast.md) | Broadcast offers to the nearest 3, first accept wins | Accepted |
| [0015](0015-maps-google.md) | Google Maps Platform with cost-aware ETA | Accepted |
| [0016](0016-privacy-contact-and-location.md) | Phone reveal and location sharing windows | Accepted |
| [0017](0017-frontend-versions-and-browser-floor.md) | Front-end versions (MUI 9, Vite 8, React Router 7.18, TS 6, ESLint 10) and the Safari/iOS 17+ floor | Accepted |
| [0018](0018-interim-package-linking.md) | Link packages by path until the legacy cutover (npm workspaces in Phase 3) | Accepted (temporary) |
| [0019](0019-pwa-worker-and-presence.md) | Hand-written service worker, two manifests and the presence sweeper | Accepted |

## Template

```markdown
# ADR-00XX: Title
- Status: Proposed | Accepted | Superseded by ADR-00YY
- Date: YYYY-MM-DD

## Context
What forces us to decide, with facts.

## Decision
What we will do, stated plainly.

## Alternatives considered
Each option and why it lost.

## Consequences
What becomes easier, what becomes harder, and what we must do because of this.
```
