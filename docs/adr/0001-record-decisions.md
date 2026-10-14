# ADR-0001: Record decisions as ADRs
- Status: Accepted
- Date: 2026-10-05

## Context
The platform has many interlocking choices: payments, real-time updates, matching, and a bilingual UI. Without a written record, the same questions get re-argued and new contributors guess at intent.

## Decision
Every decision that affects architecture, data, security, money or the shared UX is written as an ADR in `docs/adr`, using the template in the README. The product plan (`docs/PRODUCT_PLAN.md`) holds the full specification. ADRs record why we chose what we chose.

## Alternatives considered
- **Decisions only inside the plan:** the plan is long, and decisions get lost in it.
- **Wiki outside the repo:** it drifts away from the code.

## Consequences
- Pull requests that change a recorded decision must add a superseding ADR.
- Phase 0 is not done until every open decision has an ADR or an owner and date in `docs/inputs-needed.md`.
