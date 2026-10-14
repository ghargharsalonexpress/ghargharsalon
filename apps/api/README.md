# apps/api

REST API for the platform (plan Part C). Node 22, Express 5, MongoDB via Mongoose 9, TypeScript. Sessions live in MongoDB (ADR-0005); contracts come from `@brand/shared` (ADR-0018).

## Run
See [docs/runbooks/local-development.md](../../docs/runbooks/local-development.md).

| Command | What it does |
|---|---|
| `npm run db` | Local MongoDB replica set on 27018, without Docker (data in `.data/`) |
| `npm run dev` | API on http://localhost:4000, restarting on change (reads `.env`) |
| `npm run seed:admin` | Creates the first admin from `ADMIN_*` in `.env` (`-- --reset-password` to change it) |
| `npm test` | Integration tests on an in-memory replica set |
| `npm run build` / `npm start` | Bundle with tsup to `dist/`, then run it (what the Docker image does) |
| `npm run e2e:server` | API for Playwright on port 4100: in-memory DB, emails in memory, seeded accounts |

## Endpoints (Phase 2)
All responses use the error shape `{ error: { code, messageKey, fields?, requestId, retryAfterSeconds? } }`.

| Method and path | Who | Notes |
|---|---|---|
| `GET /health/live`, `GET /health/ready` | anyone | ready checks MongoDB |
| `GET /v1/session` | anyone | `{ user \| null, csrfToken }`; sets the `csrf` cookie |
| `POST /v1/auth/signup` | guest | customer account; starts a session |
| `POST /v1/auth/login` | guest | 5 failed tries per minute per IP and email |
| `POST /v1/auth/logout` | anyone | ends the session |
| `POST /v1/auth/password/forgot` | guest | always 202; emails a 30-minute link |
| `POST /v1/auth/password/check` | guest | says whether a link is valid, used or expired |
| `POST /v1/auth/password/reset` | guest | reset or first password; signs out every other session |
| `GET /v1/me`, `PATCH /v1/me` | signed in | name, phone, language |
| `GET /v1/admin/settings`, `PUT /v1/admin/settings` | admin | versioned, with history and audit |

Every non-GET request needs the `X-CSRF-Token` header (the token from `/v1/session`) and, from browsers, an allowed `Origin`.

## Layout
```
src/
  config.ts, logger.ts, errors.ts, db.ts, app.ts, index.ts
  http/      csrf, session, auth guards, rate limits, validation
  modules/   auth, users, settings, audit, email, health, testing (TEST_ROUTES only)
scripts/     dev-db, seed-admin, e2e-server
test/        integration tests (Vitest + supertest + mongodb-memory-server)
```
