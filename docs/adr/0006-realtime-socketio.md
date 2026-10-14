# ADR-0006: Socket.IO on the API server for real-time
- Status: Accepted
- Date: 2026-10-05

## Context
Five things need sub-second, two-way updates:
- job offers to professionals;
- revoking offers when another professional accepts;
- booking status for the customer;
- the professional's live location while en route;
- the admin live map.

Professionals also send data back (heartbeat, location, offer responses).

## Decision
- **Placement:** Socket.IO runs on the same Node process and HTTP server as the API (path `/rt`), authenticated by the session cookie.
- **Rooms:** `user:<id>`, `pro:<id>`, `booking:<id>` and `admin`.
- **Validation:** all payloads are validated with zod schemas from `packages/shared`.
- **REST and the database are the source of truth.** Sockets carry hints, and clients refetch after reconnecting.

## Alternatives considered
- **Managed real-time (Ably, Pusher):** another vendor and a monthly cost, plus a second auth integration.
- **Raw `ws`:** we would rebuild reconnection, rooms and fallbacks ourselves.
- **Server-Sent Events:** one-way only; professionals must send location and heartbeats.

## Consequences
- **One instance in v1.** A second instance needs the Socket.IO Redis adapter and sticky sessions (plan C18).
- **Location fan-out:** throttled to one update per 5 s per professional, with only the latest position kept in memory.
