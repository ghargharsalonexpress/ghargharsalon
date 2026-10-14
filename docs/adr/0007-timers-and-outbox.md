# ADR-0007: Data-driven timers, a sweeper and a transactional outbox (no Redis in v1)
- Status: Accepted
- Date: 2026-10-05

## Context
Much of the behaviour is time-based:
- 30-second offer windows;
- advancing to the next round;
- the 120-second search deadline;
- 15-minute unpaid expiry;
- late-arrival detection;
- stale presence.

Some side effects must never be lost, even if the server restarts mid-way: starting a refund, sending emails. v1 runs a single API instance.

## Decision
- **Timers live in data.** Every timed behaviour is a field: `offers.expiresAt`, `search.deadlineAt`, `paymentExpiresAt`, `lateAt`, `presence.lastHeartbeatAt`.
- **Two mechanisms fire them:**
  1. **In-process timers**, for responsiveness.
  2. **A sweeper every 2 seconds**, which claims due items with atomic conditional updates (for example `{status: "pending", expiresAt <= now}` → `expired`). It is safe to run twice, and it catches up after a restart.
- **Critical side effects use a transactional outbox.**
  - Refunds and emails are written to `outbox` in the same transaction as the state change.
  - The sweeper dispatches them with retries and backoff.
  - Socket emits are best-effort.

## Alternatives considered
- **BullMQ + Redis:** robust, but adds infrastructure that one instance does not need. It becomes the right choice when we scale out.
- **Agenda:** polls MongoDB anyway and adds a dependency with its own failure modes.
- **Only in-memory timers:** lost on restart, which means stuck bookings and missed refunds.

## Consequences
- **Idempotency:** every transition must be idempotent and conditional on the expected previous status.
- **Scaling out:** with more than one instance, the sweeper needs leader election (a lease document with a TTL), or we move to BullMQ.
- **Tests:** a "restart mid-search" scenario is part of the Phase 6 Definition of Done.
