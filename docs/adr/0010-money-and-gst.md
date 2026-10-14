# ADR-0010: Integer paise, GST-inclusive display, invoice series per financial year
- Status: Proposed. Needs the client's CA to confirm points 2 and 3.
- Date: 2026-10-05

## Context
- **GST rate:** beauty and physical well-being services have been taxed at 5% without input tax credit since 22 September 2025. The existing code already uses 5%.
- **Current display:** the code adds GST on top of displayed prices, plus a flat ₹11 platform fee. Shown only at the end, this is "drip pricing", which the CCPA's 2023 dark-pattern guidelines prohibit.
- **Sale model:** whether the platform sells the service itself (principal) or as a marketplace for professionals is a CA decision. A marketplace has Section 52 TCS (0.5%) and GSTR-8 duties, and income-tax questions on payouts.

## Decision
1. **Money is always integer paise.** There are no floats anywhere. One set of pricing functions in `packages/shared` runs on client and server, and the server's result is authoritative.
2. **Displayed service prices include GST.** The platform fee is disclosed on the service detail and shown as its own line from the cart onward. The total before Pay is the final amount.
   - Taxable value = price ÷ 1.05, rounded half-up to the paisa.
   - GST treatment of the platform fee follows the CA's answer, behind a setting.
3. **Invoices** are issued at completion. Numbers are allocated atomically per financial year (`INV/2026-27/000001`). A refund after invoicing produces a credit note in its own series.
   - The ledger stores taxable value, GST rate and amount, platform fee, commission and the professional's net.
   - This supports either the principal model or the marketplace + TCS model.
4. **Settings:** the GST rate, "prices include GST" and the platform fee are versioned admin settings. A booking keeps a snapshot of the values used.

## Alternatives considered
- **Keep GST added on top:** cheaper to build, but the final price surprises the customer, and it carries a compliance risk.
- **Floats in rupees:** rounding errors in money are unacceptable.

## Consequences
- **Catalogue:** prices migrated from the old data are treated as inclusive, unless the client says the old numbers were pre-tax.
- **CA questions:** listed in `docs/inputs-needed.md`, and needed before Phase 5 ends.
- **Records:** retained for at least 8 years (GST record-keeping; the CA to confirm the exact period).
