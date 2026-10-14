# [Brand]: instant home beauty services

A customer books a salon, spa or grooming service and pays online. The nearest free professional accepts within 30 seconds and arrives in 10–15 minutes. The customer follows them on a live map, and an OTP starts the service. There are three roles: Customer (website), Professional (installable PWA) and Admin. The customer and professional screens are in Hindi and English.

## Status
- **Phase 0, discovery and architecture:** complete.
- **Phase 1, brand and design system:** complete. Waiting for the client's brand choice (Berry or Teal).
- **Phase 2, platform foundation:** complete locally.
  - Shared contracts, the API (auth, sessions, roles, settings, audit, email) and the web auth pages and role homes.
  - Staging on AWS waits for the client's accounts.
- **The code in `src/`** is the legacy front end. It stays untouched and is retired in Phase 3, when the public pages are rebuilt in `apps/web` (see `docs/PRODUCT_PLAN.md`, Part D).

## Layout

| Folder | What it holds |
|---|---|
| `apps/web` | Customer website, professional panel and admin (React 19, MUI 9, Vite 8) |
| `apps/api` | API (Node 22, Express 5, MongoDB): auth, sessions, settings, audit, email |
| `packages/shared` | Contracts used by both: zod schemas, roles, error codes, settings |
| `infra` | Dockerfile companions: Caddy, compose files, CloudFront security headers |
| `docs` | Plan, decisions (ADRs), requirements, runbooks |

## Run it locally
Follow [docs/runbooks/local-development.md](docs/runbooks/local-development.md). In short:

```bash
# Once, from the repository root
(cd packages/shared && npm install) && (cd apps/api && npm install) && (cd apps/web && npm install)

# Terminal 1: database (keep it running)
cd apps/api && npm run db

# Terminal 2: API on http://localhost:4000
cd apps/api && cp .env.example .env     # then fill in the secrets and the admin
npm run seed:admin && npm run dev

# Terminal 3: web on http://localhost:5174
cd apps/web && npm run dev
```

## Documentation
Start with [docs/README.md](docs/README.md):
- the approved plan;
- architecture decision records;
- acceptance criteria;
- state machines;
- the catalogue audit;
- the risk register;
- the inputs needed from the client;
- runbooks.

## Running the legacy front end
```bash
npm install
npm run dev     # http://localhost:5173
```

## Scripts
| Command | What it does |
|---|---|
| `node scripts/catalog/audit.mjs` | Re-generates `docs/catalog-audit.md` from `src/store/data` (read-only) |
