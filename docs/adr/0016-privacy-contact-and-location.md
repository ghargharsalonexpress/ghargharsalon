# ADR-0016: When phone numbers and location are shared
- Status: Accepted
- Date: 2026-10-05

## Context
- **Calls:** customers and professionals sometimes need to call each other (gate codes, finding the flat). The client chose to reveal real phone numbers during a job; masked calling is not in v1.
- **Location:** live location is personal data, and web pages can only share it while open and visible.
- **Law:** India's DPDP Act 2023 requires notice, consent and data minimisation.

## Decision
- **Phone numbers** are released by the API only between `accepted` and `completed` (or cancellation). Role-specific serializers enforce this on the server; the UI does not decide it. Admins can always see them.
- **Professional live location:**
  - shared only with that booking's customer, and only in `accepted` or `arrived`;
  - kept in memory, with a 1-per-minute trail retained for 30 days (for disputes);
  - consent is captured in the professional's application form and the terms.
- **Customer location:** stored as the booking's address snapshot, which is needed for the invoice and support.
- **ID documents:** never stored on our servers. They stay in the client's Google Drive; we store only "verified on date, by admin".
- **Push payloads** contain no customer name or exact address.

## Alternatives considered
- **Always-visible numbers:** an unnecessary privacy risk, especially for women professionals.
- **Masked calling (Exotel and similar):** the best privacy, but a paid service. It stays on the backlog.

## Consequences
- **Tests:** the reveal window and location gating have their own authorisation tests (Phase 7 DoD).
- **Privacy Policy:** must describe these windows and retention periods (legal input, Phase 9).
