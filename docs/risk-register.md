# Risk register

Likelihood and impact: H high, M medium, L low. Review this at the start of every phase.

| # | Risk | L | I | Mitigation | Owner | Phase |
|---|---|---|---|---|---|---|
| R1 | Job alerts arrive late or not at all (Android Doze, phone-brand battery savers, Chrome force-stopped), so professionals miss offers | H | H | Panel kept open while Online (socket + in-app alarm + Wake Lock); readiness checklist with battery guidance per brand; offers to 3 at once; admin alert at 60 s; native app or SMS fallback on the backlog | Engineering | 4, 6 |
| R2 | Live location stops when the professional switches apps or locks the screen (a web limitation) | H | M | Route map inside the panel; "Location paused" state with last update; ETA from the last known point; copy asking them to keep the panel open | Engineering, UX | 7 |
| R3 | Too few online professionals, causing frequent no-match and refunds | M | H | Availability checked before payment; service hours; dashboard of online professionals by hour; the client recruits and rosters professionals | Client ops | 5, 8 |
| R4 | iPhone professionals: the panel needs iOS 17+ (MUI 9 floor, ADR-0017) and push needs a Home Screen install | M | M | Onboarding detects this and guides them; older iOS gets an "update your phone" page; Android preferred in recruitment | Engineering, client | 4 |
| R5 | Razorpay KYC or live activation is delayed; UPI intent misbehaves on iOS Safari | M | H | Start KYC in week 1; test UPI on real iPhones in Phase 5; card and netbanking fallbacks | Client, engineering | 0, 5 |
| R6 | GST model unclear (principal vs marketplace + TCS), forcing invoice and ledger rework | M | H | CA questions sent in Phase 0; ledger stores the fields for both models (ADR-0010) | Client's CA | 0, 5 |
| R7 | Price display found to be "drip pricing" | L | H | Prices shown inclusive of GST; platform fee shown from the cart onward; total before Pay is final | Product | 3, 5 |
| R8 | Hindi copy late or poor, delaying launch | M | M | Native translator engaged early; key-based copy deck; English fallback; "missing Hindi" flags in admin | Client | 1–9 |
| R9 | The single API instance is a single point of failure | M | H | Health checks and alarms; Docker redeploy in minutes; documented restore; scale path in plan C18 | Engineering | 9 |
| R10 | Atlas Free tier throttles (100 ops/s) or has no backups if used beyond staging | M | H | Flex in production from day 1; operations monitored; locations persisted in batches | Engineering | 2, 9 |
| R11 | Safety incident between a customer and a professional | L | H | Verified professionals; OTP start; phone reveal window; support contact on the booking screen; incident runbook | Client ops | 7, 9 |
| R12 | DPDP Act compliance (notice, consent, retention) | M | M | Minimal personal data; retention limits; privacy notice and consent; no ID documents on our servers (ADR-0016) | Legal, engineering | 9 |
| R13 | Google Maps cost spikes from abuse or a bug | L | M | Restricted API keys; quotas and billing alerts; session tokens; maps loaded only where needed | Engineering | 5 |
| R14 | Photo rights and quality: the current data hot-links Unsplash and Pexels, some images are retired, 33 services have none | H | M | Client supplies real photos; neutral placeholders; no hot-linking in production | Client | 3 |
| R15 | Fraud: fake bookings, cancellation abuse, chargebacks | M | M | Upfront payment; cancellation fees; rate limits; account blocking; Razorpay risk tools | Engineering, client | 5, 8 |
| R16 | Scope creep from proposal features versus the quality bar | M | M | Change control: new requests go to the backlog with an impact estimate before acceptance | Product | All |
| R17 | Knowledge concentrated in one person | M | M | ADRs, runbooks and a documented plan in the repo; code review | Engineering | All |
