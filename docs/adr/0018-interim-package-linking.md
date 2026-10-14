# ADR-0018: Link packages by path until the legacy cutover
- Status: Accepted (temporary; superseded when the root becomes the npm-workspaces root in Phase 3)
- Date: 2026-10-05

## Context
ADR-0002 makes the repository root an npm-workspaces monorepo. In Phase 2, three things block that:
- **The root `package.json` belongs to the legacy app.** It has an invalid npm name ("Nivas Beauty Enhancement-web") and an `overrides` entry that swaps `vite` for `rolldown-vite@7`. Overrides apply to every workspace, so this one would replace `apps/web`'s Vite 8.
- **Commits are on hold** (user decision, 2026-10-05). Without git history, changes stay additive, so the legacy root isn't restructured until the legacy app is retired (Phase 3).
- **`packages/shared` must be usable now** by `apps/web` (Vite) and `apps/api` (Node, tsx, tsup, Vitest), with exactly one copy of zod.

## Decision
- **Packages install separately:** `packages/shared`, `apps/api` and `apps/web` each have their own `package.json` and lockfile.
- **`@brand/shared` resolves by path alias** to `packages/shared/src/index.ts`, in four places:

  | Tool | Where |
  |---|---|
  | TypeScript | `paths` |
  | Vite | `resolve.alias`, plus `server.fs.allow` |
  | Vitest | `resolve.alias` |
  | tsx and tsup | tsconfig `paths` |

- **One copy of zod:** zod is a dependency of `packages/shared` only. Apps import `z` from `@brand/shared`. The web uses React Hook Form's Standard Schema resolver, which doesn't import zod.
- **Tree-shaking:** `packages/shared` declares `"sideEffects": false`, so the web bundles only the parts it imports. The entry chunk gets error codes, roles and languages; zod and the schemas go into form chunks.
- **API bundle:** tsup puts the shared source and zod inside the API bundle. The Docker image builds from the repository root (`apps/api/Dockerfile`).

## Alternatives considered
- **Make the root a workspace now.** It would mean editing and reinstalling the legacy app's dependencies without a safety net, and it would break Vite 8.
- **`file:` dependencies.** Linked packages resolve their dependencies from their real folder. That needs a second zod install and gives duplicate instances.
- **Publish `@brand/shared` to a registry.** That adds a release step for every contract change, which is the drift ADR-0002 wants to avoid.

## Consequences
- **Setup:** first-time setup runs `npm install` in three folders (`docs/runbooks/local-development.md`).
- **Phase 3 cutover:**
  1. Retire the legacy `src/`.
  2. Give the root a valid name and `"workspaces": ["apps/*", "packages/*"]`, and drop the override.
  3. Replace the aliases with the workspace package.
  4. Mark this ADR superseded.
- **Lint:** each package lints itself. `packages/shared` has its own ESLint config.
