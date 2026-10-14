# Security review (Phase 9)

A review against OWASP ASVS 4.0 Level 1, done on the local build before staging. Each line says how the requirement is met and where it is proven. "Open" items need staging, the client's accounts or a decision.

## Authentication (ASVS V2)

| Requirement | How it's met | Evidence |
|---|---|---|
| Passwords at least 8 characters, up to 128, any characters | Shared zod schema; checked on the server | `packages/shared/src/auth.ts`; API auth tests |
| Common and personal passwords refused | List check plus name and email parts | API auth tests ("refuses weak passwords") |
| Passwords stored with a slow hash | Argon2id (19 MiB, t=2, p=1) | `apps/api/src/modules/auth/password.ts` |
| Brute force slowed | Login 5 per minute per IP and email (failed attempts only); reset 3 per hour | `apps/api/src/http/rateLimits.ts`; API tests |
| Reset links single-use, short-lived, unguessable | 32 random bytes, stored as SHA-256; reset 30 min, set-password 72 h; used once | API auth tests ("can't be reused", "expired") |
| No account enumeration | "If an account exists, we've emailed a link" for every address | API auth tests |

## Sessions (V3)

| Requirement | How it's met | Evidence |
|---|---|---|
| Session IDs random and server-side | `express-session` in MongoDB; cookie `sid` | ADR-0005 |
| Cookie flags | `HttpOnly`, `Secure` in production, `SameSite=Lax`, domain `.brand.in` | `apps/api/src/http/session.ts` |
| Logout ends the session | The session is destroyed on the server | API auth tests |
| Blocked or suspended people lose access at once | Every request reloads the user and drops the session when not active; blocking also deletes their sessions | `apps/api/src/http/auth.ts`; `test/admin.test.ts` ("blocks a customer, which ends their session at once") |
| Admin sessions shorter | 12 hours idle | ADR-0005 |

## Access control (V4)

| Requirement | How it's met | Evidence |
|---|---|---|
| Every protected endpoint checks the role on the server | `requireRole` on routers; ownership checks in services | `test/authz.test.ts`: 63 protected endpoints refuse guests (401) and wrong roles (403) |
| Records only for their owner | Customers see their bookings and addresses only; professionals their assigned jobs and offers only | `test/bookings.test.ts`, `test/jobs.test.ts`, `test/matching.test.ts` |
| Phone numbers and location only inside the window | Revealed from accept to completion; location only while on the way or arrived | ADR-0016; booking and job DTO tests |
| Sensitive actions audited | Refunds, cancellations, reassignments, notes, blocks, payouts, review hiding, settings, prices | `apps/api/src/modules/admin/admin.routes.ts`; Admin → Audit log |

## Input validation and output encoding (V5)

| Requirement | How it's met | Evidence |
|---|---|---|
| All input validated on the server | zod `strictObject` schemas; unknown fields refused; Mongoose `strictQuery` | `apps/api/src/http/validate.ts` |
| No NoSQL operator injection | Strict schemas reject objects where strings are expected; ids checked with `objectIdParam` | `apps/api/src/http/ids.ts` |
| Output encoding | React escapes everything; no `dangerouslySetInnerHTML` with user data; emails escape values | Email template tests |
| CSV injection | Exported cells starting with `= + - @` are prefixed with `'` | `test/admin.test.ts` ("exports CSV with formulas neutralised") |
| Regex inputs | Admin search escapes regex characters before building a pattern | `apps/api/src/modules/admin/admin.service.ts` |

## Cryptography and secrets (V6, V14.1)

| Requirement | How it's met | Evidence |
|---|---|---|
| Secrets out of the code | Environment only; `.env` and `.data` are git-ignored; production refuses missing or unsafe values | `apps/api/src/config.ts` |
| Start code stored safely | HMAC for checking, AES-GCM copy for the customer to see again | `apps/api/src/modules/bookings/otp.ts` |
| Payment results can't be forged | Razorpay HMAC signature checked on verify and on webhooks (raw body) | `test/bookings.test.ts` ("refuses a forged signature", "refuses unsigned webhooks") |

## Errors and logging (V7)

| Requirement | How it's met | Evidence |
|---|---|---|
| No stack traces to clients | A typed `AppError` maps to a code and message key; unknown errors become "internal" | `apps/api/src/errors.ts` |
| Request IDs | Every log line and error response carries one | pino logger |
| Client crashes reach the team | `POST /v1/client-errors` (rate-limited, no query strings, kept 30 days) | `test/authz.test.ts` |

## Web security (V14 and V13)

| Requirement | How it's met | Evidence |
|---|---|---|
| CSRF | Signed double-submit token on every mutation, plus an Origin check | `test/security.test.ts`, `test/authz.test.ts` |
| CORS | Only the web origins, with credentials; allowed headers listed (including `Idempotency-Key`) | `apps/api/src/app.ts`; `test/bookings.test.ts` (preflight) |
| Security headers on the API | `helmet` | `apps/api/src/app.ts` |
| Security headers on the website | CloudFront policy: CSP, HSTS, no framing, nosniff, referrer and permissions policies | `infra/cloudfront/security-headers.json` |
| Rate limits | Login, reset, contact, quote, booking creation, verify, presence, push test, client errors | `apps/api/src/http/rateLimits.ts` |
| Double payments | Idempotency-Key on booking creation; one open order per booking | `test/bookings.test.ts` |
| Webhook replay | Event IDs stored once | `test/bookings.test.ts` |

## Dependencies

`npm audit --omit=dev` runs in each package. The results are recorded in the Phase 9 checklist in [README.md](README.md#phase-9-checklist-hardening-content-and-launch).

## Open items

- [ ] securityheaders.com grade A on staging (needs the domain).
- [ ] Penetration test or a second reviewer before launch.
- [ ] Secret scanning in CI (on hold with GitHub).
- [ ] Field check that the professional's location stops when the job ends (code and tests say so; confirm on a phone).
