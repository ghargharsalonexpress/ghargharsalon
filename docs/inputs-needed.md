# Inputs needed from the client

These items are owned by the client (or their CA or legal adviser). Until an answer arrives we build against the default in the table, so work never stops. The phase column shows when the answer becomes blocking.

## 1. Business decisions
| # | Decision | Default we build with | Blocking by |
|---|---|---|---|
| D1 | Brand direction: A "Berry" or B "Deep Teal" (shown in Phase 1) | A | End of Phase 1 |
| D2 | GST model, and showing prices with GST included (ADR-0010) | Principal; prices include GST | Phase 5 |
| D3 | Cancellation and no-show fees | Free while searching; ₹99 after accept; ₹199 if the customer is not reachable after a 10-minute wait; free if the professional is more than 10 min late | Phase 7 |
| D4 | Service radius, service hours, launch area boundary | 5 km; 8:00 am–9:00 pm; one city area | Phase 5 |
| D5 | Professional commission and payout cycle | 25%, weekly | Phase 7 |
| D6 | Minimum order value | None | Phase 5 |
| D7 | Men's and women's services in one booking | Allowed if one professional has every skill | Phase 5 |
| D8 | Support phone number and email shown to users | — (needed) | Phase 3 |
| D9 | Brand name and domain | Placeholder "[Brand]" / brand.in | Phase 1 |

## 2. Questions for the CA
1. Does the platform sell the service as **principal** (charging 5% GST itself) or as a **marketplace** for professionals? If a marketplace, confirm Section 52 TCS (0.5%) registration and GSTR-8 filing.
2. Can service prices be displayed and invoiced **inclusive** of the 5% GST? Please confirm the back-calculation (taxable value = price ÷ 1.05).
3. Is GST charged on the **₹11 platform fee**? At what rate, and on which invoice?
4. Please confirm the SAC codes per service type: 999721 hairdressing/barbers, 999722 cosmetic treatment/manicure/pedicure, 999729 other beauty treatment.
5. Invoice format: required fields, numbering series per financial year, and credit notes for refunds after an invoice is issued.
6. Payouts to professionals: does income-tax TDS apply (for example Section 194-O for e-commerce operators)? At what rate, and how should it show on their statements?
7. How long must invoices and booking records be kept?

## 3. Legal documents (we draft, the client's legal adviser approves)
- **Privacy Policy** (DPDP Act 2023), including:
  - live-location sharing during a job and its 30-day trail;
  - phone-number reveal during a job;
  - data retention periods.
- **Terms & Conditions** for customers.
- **Cancellation & Refund Policy:** must match D3 and Razorpay's requirements.
- **Professional agreement:** independent professional, conduct, safety, payouts, consent to location sharing.

## 4. Accounts to create (in the business name; we can do it on a screen-share)
| Account | What to do | Needed by |
|---|---|---|
| GitHub | Private repository under the client's organisation (or ours, transferred later); add developers | Phase 0 |
| AWS | Root user with MFA; an admin IAM user for us; billing alerts; region Mumbai (ap-south-1) | Phase 2 |
| MongoDB Atlas | Organisation + project; we create Free (staging) and Flex (production) clusters in Mumbai | Phase 2 |
| Domain | Buy `brand.in` (or `.com`); DNS moved to Route 53 | Phase 2 |
| Amazon SES | Verify the domain (DKIM, SPF, DMARC); request production access (usually answered within 24 h) | Phase 2 (sandbox) / Phase 9 (production) |
| Razorpay | Business account; start **KYC on day 1** (PAN, GST certificate, bank account, business proof, website with policy pages) | Test keys Phase 5; live Phase 9 |
| Google Cloud | Billing with an **Indian address** (for India pricing); enable Maps JavaScript API, Places API (New), Routes API; we create restricted keys and a Map ID; billing alerts | Phase 5 |
| Business email (optional) | Zoho Mail free plan, or Google Workspace | Any time |

Firebase is **not** needed (ADR-0008).

## 5. Content and assets
- **Service photos:**
  - the audit (`catalog-audit.md`) found 33 services with no image and 39 broken links;
  - many current images are hot-linked stock photos.

  We need real photos, or licensed images the client is happy to own, at least 1600 px wide.
- **Final service list:** names, prices (confirm they include GST), durations in minutes, descriptions. We pre-fill this from the current data for the client to correct.
- **Hindi text:** a native speaker to write or approve all Hindi copy (we supply an English copy deck and glossary).
- **About Us text,** and the professional verification process to describe on the site.
- **The Google Form for professionals:** questions in `professional-application-form.md`. The client creates it in their Google account and shares the link.
- **Launch area:** the boundary of the first area, as a list of sectors/localities or drawn on a map.
