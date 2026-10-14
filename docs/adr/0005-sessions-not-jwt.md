# ADR-0005: Server-side sessions in MongoDB, not JWT
- Status: Accepted
- Date: 2026-10-05

## Context
- **Who logs in:** customers, professionals (installed PWA) and admins. All use email and password.
- **What uses the session:** REST calls and the WebSocket handshake.
- **Revocation:** suspending a professional or blocking a customer must take effect immediately.

## Decision
- **Storage:** `express-session` + `connect-mongo`.
- **Cookie `sid`:** `httpOnly`, `Secure`, `SameSite=Lax`, `Domain=.brand.in`. The web app is on `brand.in` and the API on `api.brand.in`, which are the same site.
- **Lifetimes:** 30-day rolling sessions for customers and professionals; 12 hours of inactivity for admins.
- **CSRF:** SameSite, plus a double-submit token header and an `Origin` check on every state-changing request.
- **Passwords:** argon2id (19 MiB, t=2, p=1); minimum 8 characters; checked against a common-password list.
- **Tokens:**
  - reset and set-password tokens are 32 random bytes, stored as SHA-256 hashes, and single use;
  - expiry is 30 minutes for reset and 72 hours for a new professional's set-password link;
  - responses never reveal whether an email exists.

## Alternatives considered
- **JWT access + refresh tokens:**
  - revocation needs a deny-list anyway;
  - tokens in JS-readable storage are an XSS risk;
  - rotation adds complexity with no gain for a single-origin product.
- **Phone OTP login:** a better fit for India, but the client chose email + password. Kept on the post-launch backlog.

## Consequences
- **Suspending or blocking** deletes all of that user's sessions.
- **Sockets** authenticate from the same cookie, with no token plumbing.
- **Production domains:** the web app and API must stay on the same registrable domain.
