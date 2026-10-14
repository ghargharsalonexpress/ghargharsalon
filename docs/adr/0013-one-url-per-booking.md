# ADR-0013: One URL per booking, with the view driven by status
- Status: Accepted
- Date: 2026-10-05

## Context
- **The proposal** lists "Finding a Professional", "Booking Confirmed" and "Live Tracking / Booking Details" as separate pages. They are really stages of one booking.
- **Links:** emails, notifications and the browser's back button must always open the right view, even after the status has moved on.

## Decision
`/bookings/:id` is the only customer booking URL. It renders the view for the current status:

| Status | View |
|---|---|
| `searching` | Finding a professional |
| `accepted` (first view) | Confirmed banner + live tracking |
| `accepted` / `arrived` | Live tracking; OTP prominent once arrived |
| `in_progress` | Service in progress |
| `completed` | Receipt + review |
| `cancelled` / `no_professional_found` | Closed, with refund status |

The status arrives over the socket and updates the view in place, with no navigation. `/bookings/:id/invoice` is the printable invoice.

## Alternatives considered
- **A route per stage:** creates dead links, redirect chains and race conditions when the status changes while a page is open.

## Consequences
- **Page count:** stays at 43, counting Finding and Confirmed as states.
- **Design and tests:** each status view is a separate component with its own states.
- **Professional side:** follows the same pattern with `/pro/jobs/:bookingId`.
