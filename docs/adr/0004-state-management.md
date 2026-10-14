# ADR-0004: TanStack Query for server state, Zustand for client state
- Status: Accepted
- Date: 2026-10-05

## Context
- **Server data:** most screens show it (catalogue, bookings, offers, jobs, admin lists). Real-time socket events must update what is on screen without a refetch storm.
- **Client-only state:** the only real cases are the cart (persisted on the device) and UI preferences.
- **Today:** Redux Toolkit holds only the cart. Its items are keyed by service id alone, so 3 ids collide between the women's and men's catalogues.

## Decision
- **TanStack Query v5** for all server state: caching, retries, background refresh, and optimistic updates for non-money actions only. Socket events write into the query cache with `setQueryData`, so REST and real-time share one source of truth.
- **Zustand** (with `persist`) for the cart and UI preferences:
  - the cart key is `serviceId:tierId`;
  - the schema is versioned;
  - prices are re-validated with `POST /v1/cart/price` before checkout.
- **Redux Toolkit is removed.**

## Alternatives considered
- **RTK Query:** capable, but it keeps a Redux store whose only other job would be the cart. Applying socket events to the cache is also clumsier.
- **SWR:** lighter, but with weaker mutation and invalidation tools for admin workflows.

## Consequences
- **Cart migration:** old carts in localStorage are migrated once, or discarded with a notice if they can't be mapped.
- **Query keys:** follow one convention, `[domain, id, params]`, documented in `apps/web/src/lib/api`.
