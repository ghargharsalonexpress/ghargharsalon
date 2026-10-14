# ADR-0009: Upfront Razorpay payment, instant refund when no professional is found
- Status: Accepted
- Date: 2026-10-05

## Context
- **When to charge:** the service is instant. The customer pays before matching, so professionals only receive real, paid jobs.
- **Razorpay facts (October 2026):**
  - auto-capture is the default;
  - webhook events include `payment.captured`, `payment.failed`, `order.paid`, `refund.processed` and `refund.failed`;
  - `payment.failed` can be followed by `payment.captured` for the same UPI payment;
  - normal refunds take 5–10 working days;
  - instant refunds (UPI and netbanking) arrive in minutes for ₹7.99–14.99 + GST;
  - UPI Collect (typing a UPI ID) has been deprecated since February 2026, so only UPI intent and QR remain.

## Decision
1. **Create** the booking and a Razorpay Order on Pay. The `Idempotency-Key` header makes a double tap harmless. The server re-prices everything.
2. **Checkout:** UPI intent/QR, cards, netbanking, wallets. Then `POST /v1/payments/verify` checks the HMAC signature and moves the booking to `searching`.
3. **Webhooks:**
   - the signature is verified on the raw body and the event id is deduplicated;
   - handlers make the same transitions and don't depend on arrival order;
   - a payment captured for an expired or cancelled booking is refunded automatically.
4. **Reconciliation** runs every 10 minutes for bookings stuck in `awaiting_payment` or `searching`.
5. **Refunds:**
   - full and instant (speed `optimum`) when no professional is found;
   - partial (total minus the policy fee) when the customer cancels;
   - admin refunds with a preview and reason;
   - status is tracked through webhooks, and a failure alerts the admin with a one-click retry.

## Alternatives considered
- **Manual capture (authorise first, capture on accept):** UPI money still leaves the customer's account, and uncaptured payments come back as slow refunds. It adds complexity without a better customer experience.
- **Pay after the service (cash/UPI):** excluded from v1 by scope. It would also remove the guarantee that a job is real.

## Consequences
- **Cost:** the business pays the instant-refund fee on no-match. The pre-payment availability check keeps this rare.
- **Infrastructure:** a public HTTPS webhook endpoint is required, so it can only be tested end-to-end on staging.
- **Before launch:** Razorpay live activation (KYC) must start in week 1.
