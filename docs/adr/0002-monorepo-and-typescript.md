# ADR-0002: npm-workspaces monorepo with TypeScript everywhere
- Status: Accepted. The Vite version is superseded by [ADR-0017](0017-frontend-versions-and-browser-floor.md) (Vite 8).
- Date: 2026-10-05

## Context
- **Today:** a single JavaScript Vite app with no backend and no types.
- **What's coming:** a web app, an API, and a real-time channel. All three must agree exactly on booking statuses, prices (in paise), error codes, socket event names and validation rules. A mismatch here means wrong charges or stuck bookings.

## Decision
- **Repository root:** `YM_CLN-main/` holds one repository, with three npm workspaces:

  | Workspace | Contents |
  |---|---|
  | `apps/web` | The existing Vite app, moved here in Phase 2 and rebuilt progressively |
  | `apps/api` | Node 22 + Express 5 + Socket.IO |
  | `packages/shared` | zod schemas, enums, pricing functions, formatters, error codes, event names |

- **TypeScript:** `strict` in all three. Shared zod schemas validate API input and web forms, and generate the types.
- **Vite:** the experimental `rolldown-vite` override is removed; we use stable Vite 7.

## Alternatives considered
- **Separate repositories for web and API:** the shared contract would have to be published and versioned, and drift is likely.
- **JavaScript + JSDoc types:** weaker guarantees and easy to bypass. That is not acceptable for money and state transitions.
- **pnpm/Turborepo:** good tools, but unnecessary at this size; npm workspaces are enough.

## Consequences
- **Existing code:** the JS files are not converted mechanically. Each screen is rebuilt in TypeScript when its phase redesigns it, and dead files are deleted.
- **CI:** runs `tsc --noEmit` across all workspaces.
- **Changes to `packages/shared`** are reviewed carefully, because they affect both apps.
