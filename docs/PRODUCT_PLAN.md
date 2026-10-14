# Product & Implementation Plan: [Brand], an instant home beauty platform

## Context
**Where we are**
- `E:\downloads\YM_CLN-main\YM_CLN-main` is a front-end-only React 19 + Vite + MUI 7 site:
  - the catalogue is hard-coded in JS files;
  - "bookings" are EmailJS emails;
  - there is no backend, no auth and no tests;
  - assets total 43 MB, and the home page loads about 24 MB;
  - lint shows 21 errors and accessibility is weak;
  - the visual style reads as a template: gradients, a marquee, an autoplay video, 28–56 px corner radii, and an accent colour that fails contrast.

**What the client approved**
- An **instant** service. A customer books and pays, the nearest free professional accepts within 30 seconds and arrives in 10–15 minutes, the customer follows them on a live map, and an OTP starts the service.
- Three roles: Customer (website), Professional (installable PWA) and Admin.
- Hindi + English, AWS hosting, Razorpay and Google Maps.

**What this plan does**
- Fixes the product, UX, design system and architecture, then splits the build into dependency-ordered phases.
- Goal: a senior team can execute it without re-deciding fundamentals.
- It optimises for correctness and a premium, human-designed result, not for speed.

**Decided in this conversation**
- Quality first, with no fixed deadline.
- Design is done in code with a live style guide (no Figma).
- We create a simple brand identity for the client to approve.
- Customer and professional see each other's phone number only during an active job.

**Parts of this plan**

| Part | Contents |
|---|---|
| A | Product foundation |
| B | Design system |
| C | Architecture |
| D | Phases 0–9 |
| E | End-to-end happy path |
| F | Quality checklist |
| G | Existing code: reuse or replace |
| H | Verification |

---

## Part A: Product foundation (output of Phase 0)

### A1. Product and success measures
A customer opens the site, picks services, confirms their location and pays. Within seconds a nearby verified professional accepts and travels to them. The customer always knows who is coming, when, and what they paid. Professionals get nearby jobs with clear earnings. The business sees and controls everything live.

Pilot targets (supply-dependent; measured from backend events):
- ≥ 90% of paid bookings matched within 2 minutes
- median time to first accept ≤ 20 s
- median arrival ≤ 15 min
- checkout-view → paid ≥ 60%
- no-match refund started ≤ 10 s after the search deadline
- 0 money mismatches in reconciliation

### A2. Users
| Role | Who and context | Language | Top goals | Key anxieties |
|---|---|---|---|---|
| Customer | Urban adults at home. Mostly Android phones, some iPhone and laptop. Wants the service now. | Hindi or English | Fast, trustworthy, clear total price | Who is coming, safety, hidden charges, money back if nobody comes |
| Professional | Beautician or groomer on the move. Mid or low-end Android, patchy 4G, one hand, outdoors. Moderate digital literacy. | Hindi first | Not miss nearby jobs, clear address, clear earnings | Missing jobs, wrong address, getting paid, safety |
| Admin | Business owner or ops at a desk; urgent fixes from a phone | English | See everything live, fix problems fast, correct money | Stuck bookings, failed refunds, no-shows |

### A3. Decisions already taken
| Area | Decision |
|---|---|
| Service model | Instant "book now" only; no time slots or scheduling |
| Matching | Alert the nearest 3 eligible professionals at once (max 5); 30 s to accept; next round excludes earlier ones; first accept wins; search ends at 120 s |
| Payment | Upfront via Razorpay (UPI intent/QR, cards, netbanking, wallets), auto-capture; automatic full refund if nobody accepts |
| Tracking and start | Live professional location while en route or arrived; 4-digit OTP starts the service |
| Contact | Phone numbers visible to each other only from accept to completion |
| Accounts | Customers and professionals: mobile number + SMS code (2Factor.in); a new number becomes a customer after a name step. Admins: email + password ("Team login"). Changed 2026-10-15, [ADR-0020](adr/0020-mobile-otp-login.md); was email + password for all roles |
| Onboarding | External Google Form → admin creates account with the mobile number → the professional logs in with an SMS code → PWA install (no set-password email since ADR-0020) |
| Platforms | Responsive website; Professional panel is an installable PWA; no native apps |
| Languages | Customer and Professional: Hindi + English; Admin: English |
| Infrastructure | AWS (S3 + CloudFront, Lightsail, SES, Route 53), MongoDB Atlas Mumbai, Google Maps Platform, Razorpay |

> **Amended 2026-10-14:** catalogue photos are stored on **ImageKit**, not S3. The API uploads one
> stripped master and ImageKit builds each size and format from the URL, so the sharp variant
> pipeline below only runs when `MEDIA_STORAGE=local`. S3 + CloudFront still host the web app
> itself and the database backups. See `docs/runbooks/production-setup.md` section 4.
| Design process | Built in code from a design system with a live style guide; screenshot review |
| Brand | We create a simple identity (wordmark, colour, type, app icon); client approves |

### A4. Assumptions (explicit, with impact)
| # | Assumption | Impact | Default until confirmed |
|---|---|---|---|
| A1 | Beauty services carry 5% GST without ITC (since 22 Sep 2025). Whether the platform sells as **principal** or as a **marketplace** (Section 52 TCS 0.5%, GSTR-8) is a CA decision. | Invoice format, ledger fields | Platform invoices the customer as principal at 5%. The ledger stores the fields both models need. |
| A2 | Prices are shown **inclusive of GST**. The platform fee is disclosed on service detail and shown as a line from the cart onward. This avoids "drip pricing" (CCPA dark-patterns guidelines, 2023) and builds trust. | Price maths (taxable = price ÷ 1.05). The current code adds GST on top. | Inclusive; CA to confirm |
| A3 | Platform fee is ₹11 per booking; GST treatment of the fee is a CA decision | Pricing | ₹11, configurable |
| A4 | Professional payouts happen outside the platform (bank transfer) | Scope | Platform computes earnings; admin marks payouts paid |
| A5 | Instant-refund fees on no-match are absorbed by the business: ₹7.99–14.99 + GST each | Cost | Instant refunds on |
| A6 | Scale for v1: one city, ≤ 300 professionals, ≤ 100 online, ≤ 30 concurrent jobs, ≤ 1,000 bookings/day | Infrastructure | One API instance; scale triggers in C18 |
| A7 | Professionals mostly use Android Chrome. iPhone professionals need iOS 17+ and the panel added to the Home Screen (for push). Customers use Chrome/Edge 117+, Firefox 121+ or Safari 17+ (iOS 17+). The floor is set by MUI 9 (ADR-0017). | Support matrix | As stated |
| A8 | Web pages cannot share location in the background, so the professional's location updates only while the panel is open and visible (Wake Lock keeps the screen on) | Tracking UX | "Location paused" state designed |
| A9 | No SMS, WhatsApp or masked calling in v1, except the SMS login code (ADR-0020) | Reliability | Push + in-app for professionals; in-app + email for customers |
| A10 | Customers don't get web push in v1, because the permission prompt adds friction; they get email on accept | Comms | In-app + email |
| A11 | ID and background checks happen offline from the Google Form documents; we store only "verified on date by admin" | Privacy | As stated |
| A12 | Service hours and active area are admin settings; outside them we block booking and show the next opening time | UX | 08:00–21:00, one city polygon |
| A13 | Legal pages (Privacy under the DPDP Act 2023, Terms, Cancellation & Refund) are drafted by us and approved by the client's legal adviser | Launch | Drafts in Phase 9 |
| A14 | Hindi copy is written or approved by a native speaker the client chooses; machine translation is only a first draft | Quality | Draft → review |
| A15 | No third-party analytics or trackers in v1, so no cookie banner; metrics come from backend events | Privacy | As stated |
| A16 | No dark mode in v1; tokens allow it later | Scope | Light only |
| A17 | Brand name and domain are unknown | Copy, emails, PWA | Placeholders `[Brand]` and `brand.in` |

### A5. Open decisions (client), with the default we build against
| # | Decision | Default | Needed by |
|---|---|---|---|
| D1 | Brand direction (A or B, see B1) | A | End of Phase 1 |
| D2 | GST model and inclusive price display (A1, A2) | Principal, inclusive | Phase 5 |
| D3 | Cancellation and no-show fees | ₹0 while searching. ₹99 after accept. ₹199 if the customer is not reachable after a 10-minute wait. Free cancellation if the professional is more than 10 min late. | Phase 7 |
| D4 | Radius, hours, launch boundary | 5 km; 08:00–21:00; one city polygon | Phase 5 |
| D5 | Commission and payout cycle | 25%, weekly | Phase 7 |
| D6 | Minimum order value | None | Phase 5 |
| D7 | Men's and women's services in one booking | Allowed if one professional has all the skills | Phase 5 |
| D8 | Support phone and email shown to users | Client's numbers | Phase 3 |

### A6. Product and UX principles (each with an enforceable rule)
1. **One primary action per screen.** Exactly one primary button per view. On mobile it sits in a sticky bottom action bar.
2. **Tell the truth about time and money.** Arrival times are ranges ("12–18 min"), never fake precision. The final total is shown before Pay, and nothing is added after.
3. **Never leave anyone waiting blind.** Every wait state answers three things: what is happening, how long it usually takes, and what happens if it fails.
4. **Design for the professional's real world.** Targets ≥ 48 px in the pro panel, body text ≥ 16 px, high contrast for sunlight, minimal typing, tolerance for weak networks, Hindi first.
5. **Calm, precise visual language.** Hierarchy comes from type, spacing and alignment. Decoration (gradients, glow, oversized type, card lift) is banned (B7).
6. **Mobile is the primary canvas** for customers and professionals. Admin is desktop-first, but urgent actions (reassign, cancel, refund) work at 360 px.
7. **Every state is designed.** No screen ships without loading, empty, error, offline, permission and success states (D-phase DoD).
8. **Accessibility and bilingual parity are requirements.** WCAG 2.2 AA. Every screen is reviewed in English and Hindi at every breakpoint.

### A7. Information architecture
**Routes.** There are 43 pages; 3 of them are states of one booking route.

| Area / layout | Routes |
|---|---|
| Public (header + footer) | `/` Home · `/services` (query `gender`, `category`, `q`) · `/services/:slug` service detail as a deep-linkable sheet over the listing · `/cart` · `/about` · `/contact` · `/legal/privacy` · `/legal/terms` · `/legal/cancellation-refund` · `*` 404 |
| Auth (minimal header, centred card) | `/login` · `/signup` · `/forgot-password` · `/reset-password?token=` (also the professional "set your password" page, with different copy) |
| Customer (requires customer) | `/checkout` · `/bookings/:id` · `/bookings/:id/invoice` · `/account/bookings` · `/account/addresses` · `/account/profile` |
| Professional (requires professional; PWA scope `/pro/`) | `/pro` dashboard · `/pro/offers/:offerId` job alert · `/pro/jobs/:bookingId` job details · `/pro/jobs` · `/pro/earnings` · `/pro/profile` |
| Admin (requires admin) | `/admin` · `/admin/live` · `/admin/bookings` · `/admin/bookings/:id` · `/admin/professionals` · `/admin/professionals/new` · `/admin/professionals/:id` · `/admin/professionals/:id/edit` · `/admin/customers` · `/admin/customers/:id` · `/admin/services` · `/admin/services/new` · `/admin/services/:id/edit` · `/admin/categories` · `/admin/payments` · `/admin/reviews` · `/admin/messages` · `/admin/settings` |
| Non-production | `/styleguide` (not built into production) |

- **One URL per booking.** `/bookings/:id` renders the view for the current status: Finding (searching), Confirmed and tracking (accepted/arrived), In progress, Completed (receipt and review), or Closed (cancelled/refunded). Links in emails always work, and there are no dead intermediate pages.
- **Login redirects by role.** Customer → the page they came from, or `/services`. Professional → `/pro`. Admin → `/admin`.
- **Legacy redirects.** `/all-services` → `/services`, `/about-us` → `/about`, `/book-service` → `/checkout`, `/register-as-professional` → the Google Form URL, `/dashboard` → the role's home.

**Navigation by breakpoint**

| Shell | Phone (< 600) | Tablet (600–899) | ≥ 900 |
|---|---|---|---|
| Public | 56 px bar: wordmark, cart with count, menu → right drawer (nav, language EN/हिं, account). Sticky bottom bar on Services and Cart when the cart has items. | Same, wider margins | 64 px bar: wordmark, Services · How it works · About · Contact, language switch, Log in/Account, Cart |
| Customer account | Full-width pages with back button; "Account" in the drawer | Same | 240 px sub-nav + content (max 840) |
| Booking `/bookings/:id` | Map on top (45vh) + scrolling status panel | Map 50% + panel | Map (flex) + 400 px right panel |
| Professional | Top bar (title, online status) + bottom tabs (Home, Jobs, Earnings, Profile), safe-area aware; job alert full-screen | Centred 600 px column | Centred 600 px column |
| Admin | Top bar + drawer; tables become cards; urgent actions available | 72 px icon rail + top bar | 248 px sidebar (collapsible) + 56 px top bar (search, alerts, account) |

**Permissions** (enforced server-side; the UI only hides)

| Capability | Guest | Customer | Professional | Admin |
|---|---|---|---|---|
| Browse catalogue, cart | ✓ | ✓ | — | ✓ |
| Create booking, pay | — | own | — | — |
| View booking | — | own | assigned only | all |
| Cancel booking | — | own, per policy | job cancel (reason; re-search) | all, with refund choice |
| Respond to offer | — | — | targeted offers only | send direct offer |
| Publish location | — | — | assigned job, accepted/arrived only | — |
| See live location | — | own booking, accepted/arrived | own | all |
| See other party's phone | — | accepted → completed | accepted → completed | always |
| Refunds | — | — | — | ✓ (and the system) |
| Catalogue, professionals, customers, settings, reviews moderation | — | — | — | ✓ |
| Review | — | own completed booking, once | — | hide/unhide |

### A8. Domain rules
**Booking states**

| State | Meaning | Customer sees | Exits to |
|---|---|---|---|
| `awaiting_payment` | Order created; expires in 15 min | Checkout with Razorpay open | `searching`, `expired` |
| `searching` | Paid; offer rounds running | "Finding a professional" | `accepted`, `no_professional_found`, `cancelled` |
| `accepted` | Professional en route; phones and location revealed | Confirmed + live map + OTP | `arrived`, `searching` (pro cancelled), `cancelled` |
| `arrived` | Professional at the door | "Arrived" + OTP prominent | `in_progress`, `cancelled` (customer not reachable) |
| `in_progress` | OTP verified | Service in progress, timer | `completed` |
| `completed` | Done; invoice, earnings and review request | Receipt + rate | terminal |
| `no_professional_found` | Search deadline passed; refund started | Apology + refund status | terminal |
| `cancelled` | By customer, admin or system, with reason and fee | Cancellation + refund status | terminal |
| `expired` | Never paid | Checkout again | terminal |

**Transition rules and side effects**
- **Every transition** is one conditional atomic update (`status` must equal the expected previous state). Each one is written to `statusHistory`, emitted on sockets and audited.
- **Paid** (verify or webhook, whichever comes first) → `searching` and round 1.
- **Pro accepts** → transaction claims the pro (busy) and the booking (`accepted`). Other offers are revoked, the OTP is generated, and the confirmation email is queued (outbox).
- **Pro cancels while en route** → back to `searching` at high priority, that pro excluded, customer told "Finding another professional".
- **Late** (now > ETA + 10 min and not arrived) → admin alert; the customer may cancel free.
- **Arrived** → soft geofence check (≤ 200 m from the address). If further, the pro confirms "I'm at the address".
- **OTP**: 5 wrong attempts → locked, admin alerted.
- **Complete** → invoice number allocated, earnings computed, review requested. If tapped before 50% of the expected duration, a confirmation is shown.
- **Customer not reachable**: after the 10-minute wait, with at least 2 call attempts logged, the pro may mark it; cancelled with the no-show fee.

**Offer states**: `pending` → `accepted` | `declined` (optional quick reason) | `expired` (30 s) | `revoked` (taken by someone else or booking cancelled).

**Professional presence**: `offline` → `available` (Online toggle + heartbeat) → `busy` (active job) → `stale` (no heartbeat for 60 s; excluded from matching; offline after 5 min).

**Settings defaults** (admin-editable, versioned, audited)

| Group | Setting | Default |
|---|---|---|
| Pricing | GST rate | 5% |
| Pricing | Prices include GST | true |
| Pricing | Platform fee | ₹11 |
| Pricing | Commission | 25% |
| Pricing | Max quantity per line | 3 |
| Matching | Radius | 5 km |
| Matching | Offers per round | 3 (max 5) |
| Matching | Accept window | 30 s |
| Matching | Search timeout | 120 s |
| Matching | Stale presence | 60 s |
| Operations | Service hours | 08:00–21:00 |
| Operations | Active areas | Polygons |
| Operations | Unpaid expiry | 15 min |
| Operations | Late threshold | 10 min |
| Operations | No-show wait | 10 min |
| Operations | OTP attempts | 5 |
| Fees | Cancel after accept | ₹99 |
| Fees | No-show | ₹199 |
| Fees | Cancel while searching | free |
| Fees | Late professional | Cancellation free |

---

## Part B: Design system (output of Phase 1)

### B1. Brand
**Wordmark and icons**
- The brand name is set in Noto Sans SemiBold with −1% tracking, in title case.
- Monogram: the first letter on an accent square with a 6 px radius. It is used for the favicon and the PWA icons (maskable).
- No mascot, illustration style or gradients.

**Two directions for the client** (D1). Both are distinct from Yes Madam's orange, and both pass AA where #F26522 fails at 3.15:1 with white text.
- **A, Berry (recommended):** accent `#9E1F55`, 7.5:1 with white text. Warm, beauty-specific, premium.
- **B, Deep Teal:** accent `#0F6B66`, 6.3:1. Calm, clinical trust.

**Deliverables:** wordmark SVG (light and dark), favicon set (16/32/180/192/512 + maskable), colour tokens, OG image template, email header.

### B2. Colour tokens (Direction A; B swaps only the accent ramp)
- **Neutral (warm grey):**

  | Token | Hex | Use |
  |---|---|---|
  | 0 | `#FFFFFF` | Page background |
  | 25 | `#FCFBFA` | Alternate page background |
  | 50 | `#F7F6F4` | Subtle surface |
  | 100 | `#EFEDEA` | Hover |
  | 200 | `#E2DFDA` | Dividers and card borders |
  | 300 | `#CCC8C1` | Not assigned |
  | 400 | `#A8A29A` | Disabled only |
  | 500 | `#8A847B` | Input borders (3.7:1, meets the 3:1 non-text rule) |
  | 600 | `#6B655D` | Secondary text (5.8:1) |
  | 700 | `#4F4A43` | Not assigned |
  | 800 | `#36322D` | Not assigned |
  | 900 | `#1F1C19` | Primary text (about 17:1) |

- **Accent (Berry):**

  | Token | Hex | Use |
  |---|---|---|
  | 50 | `#FBEFF4` | Light background |
  | 100 | `#F5D9E5` | Light background |
  | 200 | `#EBB3CB` | Not assigned |
  | 600 | `#9E1F55` | Primary buttons, links, focus ring |
  | 700 | `#84184A` | Hover |
  | 800 | `#6A123B` | Pressed |

- **Semantic** (each passes AA as text on white):

  | Meaning | Text | Background |
  |---|---|---|
  | Success | `#1E7A45` (5.4:1) | `#E7F4EC` |
  | Warning | `#8A5A00` (5.9:1) | `#FFF4D6` |
  | Danger | `#B42318` (6.6:1) | `#FDECEA` |
  | Info | `#1D5FBF` (6.1:1) | `#EAF1FB` |

- **Focus:** 2 px accent-600 outline with a 2 px white offset, on every interactive element; it must never be obscured by sticky bars.
- **Booking status pills (always text, never colour alone):**

  | Status | Text colour | Background | Extra |
  |---|---|---|---|
  | Awaiting payment | neutral-700 | neutral-100 | — |
  | Finding professional | info | info-bg | Live dot |
  | On the way | accent-700 | accent-50 | — |
  | Arrived | accent-700 | accent-50 | — |
  | In progress | white | accent-600 | — |
  | Completed | success | success-bg | — |
  | Cancelled | neutral-700 | neutral-100 | — |
  | No professional · refunded | warning | warning-bg | — |
  | Refund failed | danger | danger-bg | Icon |

### B3. Typography
**Family**
- Noto Sans (Latin) + Noto Sans Devanagari (Hindi), self-hosted through Fontsource variable fonts.
- Split by `unicode-range`, so Devanagari loads only when Hindi text appears.
- `font-display: swap` with a size-adjusted Arial fallback, so there is no layout shift.
- **Why:** one super-family with matched x-heights and weights across both scripts, good small-size legibility, and tabular figures.
- **Rejected:** Poppins (template-associated and too wide for dense admin) and Inter plus a separate Devanagari font (mismatched metrics).

| Token | Mobile (< 900) | Desktop (≥ 900) | Weight | Use |
|---|---|---|---|---|
| display | 32/40 | 44/52 | 600 | Home hero headline only |
| h1 | 26/34 | 32/40 | 600 | Page title (one per page) |
| h2 | 20/28 | 24/32 | 600 | Section |
| h3 | 17/24 | 18/26 | 600 | Card or sub-section |
| body-lg | 17/26 | 18/28 | 400 | Marketing paragraphs |
| body | 16/24 | 16/24 | 400 | Default; **all inputs** (prevents iOS zoom) |
| body-sm | 14/20 | 14/20 | 400 | Secondary text, table cells, help text |
| label | 14/20 | 14/20 | 500 | Labels, md buttons |
| caption | 12/16 | 12/16 | 500 | Meta, badges; never essential information |
| numeric-xl | 28/32 | 32/36 | 600, tabular | Arrival time, countdown, totals |

**Rules**
- Devanagari gets +4 px line height on body and heading tokens; Hindi body text is never below 14 px.
- No letter-spacing tricks, no all-caps, no italics.
- Assume Hindi strings run 30–40% longer: wrap, never truncate Hindi mid-word.
- Lines are at most 72 characters; sentence case everywhere; tabular numbers in prices, tables and timers.

### B4. Spacing, grid and breakpoints
**Spacing:** 4 px base (`theme.spacing(1)` = 4). Scale: 0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96.
- Inside components: 12–16.
- Between related items: 8.
- Between groups: 16–24.
- Between sections: 24/32 in app screens; 48 (mobile) or 80 (desktop) on marketing pages.

**Breakpoints:** xs 0 · sm 600 · md 900 · lg 1200 · xl 1440. MUI's xl changes from 1536 to 1440.

| Breakpoint | Columns | Margins | Gutters | Container |
|---|---|---|---|---|
| xs | 4 | 16 | 16 | fluid |
| sm | 8 | 24 | 16 | fluid |
| md | 12 | 32 | 24 | fluid |
| lg | 12 | auto | 24 | 1200 marketing / 1120 app |
| xl | 12 | auto | 24 | 1200 marketing / admin fluid up to 1600 |

**Other containers:** reading 720, forms 560, auth card 400. Bottom bars and the PWA respect `env(safe-area-inset-*)`.

### B5. Shape, borders, elevation and layers
**Radii (no other values):**

| Size | Value | Use |
|---|---|---|
| sm | 6 | Buttons, inputs, chips |
| md | 8 | Cards, menus, dialogs, images |
| lg | 12 | Top corners of the bottom sheet only |
| full | — | Pills, avatars, switches |

**Borders (1 px):**
- Dividers and cards: neutral-200.
- Inputs: neutral-500 → neutral-700 on hover → accent-600 at 2 px on focus → danger on error.

**Elevation:**

| Level | Treatment | Use |
|---|---|---|
| e0 | None | Cards and sections (separated by border or background) |
| e1 | Bottom border, not a shadow | Sticky bars |
| e2 | `0 6px 20px rgba(31,28,25,.12)` | Menus, popovers, toasts |
| e3 | `0 16px 40px rgba(31,28,25,.18)` + scrim `rgba(31,28,25,.48)` | Dialogs and sheets |

Cards never lift on hover; only the border colour changes.

**Layers (z-index):** content 0 · sticky 100 · app bar 200 · bottom action bar 210 · drawer 300 · dialog/sheet 400 · toast 500 · tooltip 600.

### B6. Icons, imagery and maps
**Icons**
- Material Symbols Outlined only (from `@mui/icons-material`, imported by direct path): 16 inline, 20 default, 24 nav.
- Allowed for navigation, labelled actions, status and alerts, and input adornments.
- Icon-only buttons are limited to close, back, menu, search and cart. They need an `aria-label`, plus a tooltip on desktop.
- Banned: decorative icons in feature lists or headings, and emoji in the UI.

**Imagery**
- Real, consistent photography in warm natural light.
- Aspect ratios: service cards 4:3, detail hero 3:2. Home hero: 4:5 portrait beside the headline from 900 px. Below that it sits under the call to action: 4:3 on phones and 16:9 on tablets, so categories stay close (changed in Phase 1 review).
- AVIF/WebP with `srcset` at 320/640/960/1280. Cards ≤ 150 KB, hero ≤ 250 KB.
- No vector stock, 3D blobs or AI-looking art.
- A missing image shows a neutral-100 tile with the category name, never a fake photo.

**Maps:** a Map ID with muted brand styling (low saturation, POIs hidden), accent route and markers, and the required Google attribution.

### B7. Motion
**Tokens**
- Durations: fast 100 ms (colour on hover/press), base 160 ms (fades, tooltips), enter 220 ms, exit 160 ms.
- Easing: enter `cubic-bezier(.2,0,0,1)`, exit `cubic-bezier(.4,0,1,1)`.
- Implemented with CSS transitions in the theme. **framer-motion is removed.**

**Allowed (the complete list):**
1. Press/toggle feedback (colour, not scale)
2. Overlay enter and exit
3. Toast enter and exit
4. Skeleton pulse (opacity, 1.2 s; no shimmer gradients)
5. "Finding a professional" radar pulse
6. Countdown ring progress
7. Map marker interpolation between location updates
8. Status tracker step change (cross-fade + check)
9. Accordion height (160 ms)

**Banned:** scroll reveal, parallax, marquee, autoplay video, hover lift or scale, page-transition animations, attention loops.

**`prefers-reduced-motion`:** items 2–9 become instant. The radar becomes a static indicator with text. The countdown updates numerically only.

### B8. Components (design-system wrappers over MUI; screens never style MUI directly)
| Component | Variants and sizes | States and rules |
|---|---|---|
| Button | primary (accent), secondary (outline), tertiary (text), danger (destructive confirms only). Heights sm 32 (admin dense, desktop), md 40, lg 48 | hover, pressed, focus-visible, disabled (always with a reason nearby), loading (spinner keeps the width; `aria-busy`). Height ≥ 44 on coarse pointers. One primary per view. Labels are verbs. |
| IconButton | 40 (44 touch) | `aria-label` required; tooltip on desktop |
| TextField / Password / Phone | label above, optional hint, error below | Error shows on blur or submit and clears on change. Phone: fixed `+91`, 10 digits, `inputmode="tel"`, shown as 98765 43210. Password: show/hide, min 8, common-password check. `autocomplete` everywhere. Optional fields are marked "(optional)"; no asterisks. |
| Select / Autocomplete | MUI Select; Autocomplete for long lists | Keyboard-complete, with a visible selected state |
| AddressSearch (combobox) | Places Autocomplete (New) | 250 ms debounce, session token, "Use current location", loading row, "No results — drop a pin instead", Google attribution |
| Checkbox / Radio / Switch | 24 px control inside a 44 px row | Switch only for instant settings |
| OnlineToggle (pro) | Large 64 px control | Gated by readiness (Phase 4); shows connection state |
| SegmentedControl | 2–4 options (Women/Men, Any/Female/Male) | `role=radiogroup`, arrow keys |
| QuantityStepper | − n + | min/max, live count announcement, 44 px targets |
| Tabs | Peer views (Current / Past) | Scrollable on mobile; never used as page navigation. The selected tab draws its own underline (no sliding indicator, per B7) |
| Dialog / BottomSheet / FullScreen | Confirm or short choice: Dialog (≥ 600) or BottomSheet (< 600). Forms with > 3 fields: a page, or full-screen on mobile | Focus trap, returns focus, Esc closes, never nested |
| Drawer | Mobile navigation, admin filters | — |
| Toast | Confirms a completed background action (saved, copied) | 4 s; bottom-centre on mobile, bottom-left on desktop; never used for actionable errors |
| InlineAlert / Banner | Contextual errors and warnings; page banners for offline, reconnecting, session ending | `role=alert` only for errors |
| StatusPill / Badge | Status map in B2 | Text always present |
| DataTable (admin) | Design-system table on MUI Table primitives, in-memory sort; TanStack Table when server-side sorting arrives (Phase 8, ADR-0017) | Sticky header, sort, row → details, column priority, `nowrap` for IDs and amounts, comfortable/compact. Below 900 it becomes a **card list** (title, status, 2–3 fields, chevron). |
| FilterBar | Search + chips + "More filters" | Synced to the URL; removable active chips; drawer on mobile |
| Pagination | Admin: numbered pages with counts; phones show "‹ Page 1 of 7 ›". Customer/pro history: "Load more" button | No infinite scroll |
| EmptyState | Title, one sentence, one action | No illustration |
| Skeleton vs Spinner | Skeletons for content loading > 300 ms, matched to the shape | Spinners only inside buttons or short inline actions; full-screen only at app boot (wordmark + thin progress) |
| Avatar | 32/40/56 | Photo, or initials on neutral-100 |
| MapView | Fixed height + skeleton | Error fallback (text address + "Open in Google Maps"), stale-location chip, skip link, minimal controls |
| CountdownRing | 30 s | Tabular digits; warning colour at ≤ 10 s; `aria-live` announcement at 10 s |
| PriceSummary | Lines, platform fee, total ("taxes included") | Collapsible in the mobile action bar ("₹1,049 · Details") |
| StatusTracker | Vertical timeline with times | Same layout at all sizes, for clarity |
| OTPDisplay / OTPInput | 4 large digits / 4 boxes | Input: numeric keypad, paste, auto-advance, attempts left, error as text (no shake) |
| PageHeader | Title, description, actions | Actions move to the bottom action bar on mobile; breadcrumbs only on admin detail pages |
| AppShells | Public, Auth, Account, Booking (map), Pro (bottom nav), Admin (sidebar) | Behaviour as in A7 |

### B9. Responsive rules (apply everywhere)
- Supported from 320 px.
- Test widths: 360, 390, 768, 1024, 1280, 1440. Also 200% zoom with reflow at 320 CSS px, and phone landscape.
- No horizontal page scroll. The only exception is the category chip row on mobile, which scrolls horizontally with a visible edge fade and scroll-snap.
- Touch targets ≥ 44 × 44 (≥ 48 in the pro panel), at least 8 px apart. No hover-only affordances.
- Forms are single-column. Paired short fields (e.g. first and last name) go two-up only at ≥ 900. Long forms get a sticky submit bar on mobile.
- Checkout, cart and service pages use a sticky bottom action bar on mobile: total + one CTA, safe-area aware.
- Tables become card lists below 900. Dialogs become sheets below 600. Filters go into a drawer below 900.

### B10. Content, voice and localisation
**Voice**
- Calm, specific, respectful. Examples: "Priya is on the way", "Pay ₹1,049", "Accept job". No hype, no exclamation marks.
- Errors say what happened and what to do. Example: "This address is outside our service area. Try a nearby landmark or check later."
- Empty states have a title, a reason or next step, and one action.

**Formatting**
- Use `Intl` with `en-IN` / `hi-IN`.
- ₹ with Indian grouping (₹1,23,456). No decimals except on invoices, which show 2.
- Time in 12-hour format ("4:30 pm" / "शाम 4:30"); dates like "5 Oct 2026".
- Relative time for live data ("updated 2 min ago"); "1.2 km"; "45 min".
- Western digits in both languages.

**i18n**
- i18next + ICU, with namespaces per feature. No string concatenation.
- A shared glossary keeps terms consistent; where clearer, keep loanwords: OTP, UPI, Online.
- `<html lang>` is kept in sync with the language.
- The copy deck lives in the repo (`locales/en`, `locales/hi`). The client reviews it; a native speaker approves the Hindi.

### B11. Accessibility standard (WCAG 2.2 AA)
- **Contrast:** text ≥ 4.5:1, UI components ≥ 3:1.
- **Focus:** always visible and never obscured.
- **Keyboard and structure:** every flow works by keyboard. Skip link, landmarks (`header`/`nav`/`main`/`footer`), one h1 per page, logical heading order.
- **Forms:** labels, and errors linked with `aria-describedby`.
- **Live regions:** status changes (accepted, arrived) and the countdown at 10 s are announced politely.
- **Dialogs:** trap focus and restore it.
- **Maps:** the map is never the only source of information. A text status (arrival time, distance, last update) sits next to it.
- **Other:** reduced motion respected; targets ≥ 24 px (we use 44); Hindi text marked `lang="hi"`.
- **Tooling:** eslint-plugin-jsx-a11y and axe in CI. Manual TalkBack and VoiceOver passes happen in Phase 9.

---

## Part C: Architecture (output of Phases 0 and 2)

### C1. Overview
```
Customer web / Pro PWA / Admin ──HTTPS──> CloudFront ──> S3 (static web, images)
        │  REST + WebSocket (cookies)
        └──────> api.brand.in (Caddy TLS) ──> Node 22 API: Express 5 + Socket.IO (one instance, Lightsail)
                                               ├─> MongoDB Atlas (Mumbai): data, sessions, outbox
                                               ├─> Razorpay (orders, refunds)  <── webhooks
                                               ├─> Amazon SES (email)   ├─> Web Push (VAPID → FCM/APNs endpoints)
                                               └─> Google Routes API (ETA after accept)
Browser ──> Google Maps JS + Places Autocomplete (address, maps)
```

### C2. Repository
- **Repository root:** `E:\downloads\YM_CLN-main\YM_CLN-main`. Phase 0 runs `git init` and creates a private GitHub repository with branch protection.
- **npm workspaces:**

  | Folder | Contents |
  |---|---|
  | `apps/web` | The existing Vite app moved here and rebuilt progressively |
  | `apps/api` | The new backend |
  | `packages/shared` | zod schemas, enums (status codes, event names, error codes), pricing functions, formatters |
  | `docs/` | ADRs, runbooks, glossary |
  | `.github/workflows` | CI |

- **Tooling:** TypeScript strict across the repo; ESLint (typescript-eslint, react-hooks, jsx-a11y); Prettier; Vitest; Playwright in `apps/web/e2e`.
- **Why TypeScript and a monorepo:** one source of truth for validation, enums, money maths and socket events across web, API and real-time. This prevents contract drift in a money-handling, real-time system.
- **Rejected:** JS + JSDoc, because its guarantees are weaker.
- **Vite:** remove the experimental `rolldown-vite` override and use stable Vite 8 (ADR-0017).

### C3. Frontend architecture (`apps/web/src`)
- **Folders:** `app/` (router, providers, shells) · `design-system/` (tokens, theme, components, icons) · `features/` (catalog, cart, auth, account, checkout, booking, pro/*, admin/*, legal, contact) · `lib/` (api client, socket, i18n, maps, pwa, format, errors) · `locales/`.
- **Routing:** React Router 7 data router. Lazy chunks for public, customer, pro and admin; route guards check the session.
- **Server state:** TanStack Query v5. Socket events write into the query cache (`setQueryData`), so there is one source of truth. RTK Query was rejected because a Redux store becomes unnecessary.
- **Client state:** Zustand with persistence, used only for the cart and UI preferences.
  - Cart key: `serviceId:tierId`, with a versioned schema.
  - Prices are re-validated through `POST /cart/price` before checkout.
  - Redux Toolkit is removed.
- **Forms:** React Hook Form + zod resolver, using schemas from `packages/shared`. Server field errors map by `messageKey`.
- **UI kit:** MUI 9 (ADR-0017), re-themed from tokens, with ripple disabled. Layout uses CSS grid in `sx` (MUI 9's Grid takes `size` when needed).
  - Screens use design-system wrappers only.
  - `sx` is for layout only, and lint forbids raw colour or px values outside the design system.
  - **Rejected Tailwind + Radix:** we would rebuild accessible primitives and tables for no user benefit. The "template look" comes from MUI defaults, which our theme replaces.
- **Tables:** the design-system table (in-memory sort) until Phase 8, then TanStack Table (headless) behind the same API (ADR-0017). MUI X DataGrid was rejected: heavy, hard to restyle, poor on mobile.
- **i18n:** i18next + react-i18next + ICU, with lazy namespaces.
  - Language detection order: profile → localStorage → (professional default: Hindi) → browser → English.
  - Content fields are `{en, hi}`, falling back to English. Admin sees "missing Hindi" flags.
- **Maps:** `@vis.gl/react-google-maps`, loaded only on map routes. Map ID with brand style, Advanced Markers, marker interpolation with requestAnimationFrame.
- **Real-time:** a `socket.io-client` singleton, connected only for logged-in booking, pro and admin views.
  - A connection-state store drives a "Reconnecting…" banner after 3 s.
  - On reconnect, related queries are invalidated to resync.
- **PWA:** `vite-plugin-pwa` (injectManifest strategy).
  - Two manifests: customer (`/`) and pro (`start_url /pro`, scope `/pro/`). The service worker is scoped to `/`.
  - Precache the shell; images are stale-while-revalidate.
  - Push and notification-click handlers.
  - Updates show "New version available · Refresh", and never auto-reload during an active job.
- **Errors:** an error boundary per route, a shared query-error component, a global offline banner, and client error reports to `/v1/client-errors` (rate-limited).
- **SEO:** `react-helmet-async` meta per page; `sitemap.xml` and `robots.txt` generated from the catalogue at build time; OG image.
- **Analytics:** none in the browser (A15).
- **Performance:**
  - Images through a `<Picture>` component with `srcset`.
  - Direct-path icon imports.
  - `size-limit` budgets enforced in CI (C15).

### C4. Backend architecture (`apps/api/src`)
- **Modules:** auth, users, addresses, professionals (profiles, presence, push subscriptions), catalog, settings, availability, bookings (state machine), matching (offers), payments (Razorpay, webhooks, reconciliation), refunds, invoices, tracking, notifications (push, email), reviews, contact, admin (aggregations), audit, files (S3 presign + image variants with sharp).
- **Layers:** route (zod validation) → service (business rules and authorization) → repository (Mongoose).
- **Side effects** use an in-process domain event bus plus a **transactional outbox**:
  - Refund initiation and emails are written to `outbox` in the same transaction as the state change, then dispatched by the sweeper. Nothing is lost on a crash.
  - Socket emits are best-effort; clients resync from REST.
- **Money:** always integer paise, never floats. Pricing functions live in `packages/shared` and run identically on client and server; the server is authoritative.

### C5. Data model (MongoDB; key fields · indexes · retention)
| Collection | Key fields | Indexes / retention |
|---|---|---|
| users | role, name, email (lowercase), phone, passwordHash, locale, status | email unique; {role, status} |
| sessions | connect-mongo | TTL (30 d; admin 12 h idle) |
| auth_tokens | userId, type (reset / set_password), tokenHash, expiresAt, usedAt | TTL on expiresAt + 1 d |
| addresses | userId, label, house, building, street, landmark, locality, city, pincode, location (GeoJSON), placeId, isDefault | {userId} |
| professional_profiles | userId, gender, skills[], photo, travelRadiusKm, verification{at, by}, status, presence{state, lastHeartbeatAt, location(Point), locationAt, activeBookingId}, stats{rating, count, acceptRate, jobsToday, lastCompletedAt} | userId unique; **2dsphere presence.location**; {status, presence.state, gender} |
| push_subscriptions | userId, endpoint, keys, userAgent, lastSuccessAt, failures | endpoint unique; deleted on 404/410 |
| categories | slug, name{en,hi}, gender, order, active, image | slug unique |
| services | slug, categoryIds, gender, name/summary{en,hi}, sections{overview, includes, aftercare, thingsToKnow, faq[]}{en,hi}, tiers[{id, label{en,hi}, pricePaise, compareAtPaise, durationMin}], requiredSkills, images, active, version | slug unique; {categoryIds, active}; text index on names |
| bookings | bookingNo, customerId, items[snapshot], pricing{itemsPaise, feePaise, gstRate, taxablePaise, gstPaise, totalPaise, inclusive}, address snapshot + location, preference, status, statusHistory[], search{round, startedAt, deadlineAt, offeredProIds}, professionalId, eta{minutes, at, source}, otp{hash, attempts, lockedAt}, lastProLocation{point, at}, cancellation{by, reason, feePaise}, paymentExpiresAt, lateAt, earnings{gross, commission, net, payoutStatus}, invoiceId, version | bookingNo unique; {customerId, createdAt}; {professionalId, createdAt}; {status, search.deadlineAt}; {status, paymentExpiresAt} |
| offers | bookingId, professionalId, round, status, sentAt, expiresAt, respondedAt, channels, declineReason | {bookingId, professionalId} unique; {status, expiresAt}; {professionalId, status} |
| payments | bookingId, razorpayOrderId, razorpayPaymentId, amountPaise, method, status, capturedAt | orderId unique; paymentId unique sparse |
| refunds | bookingId, paymentId, razorpayRefundId, amountPaise, reason, speedRequested/Processed, status, initiatedBy, idempotencyKey | idempotencyKey unique |
| webhook_events | eventId, type, processedAt | eventId unique; TTL 90 d |
| invoices / credit_notes | number (FY series), bookingId, seller, buyer, lines (SAC 999721/999722/999729), taxable, gst, total, issuedAt | number unique; bookingId unique; keep ≥ 8 years (GST records; CA to confirm) |
| counters | `invoice:2026-27`, seq | atomic `$inc` |
| reviews | bookingId, customerId, professionalId, rating, comment, hidden | bookingId unique |
| contact_messages | name, email, phone, message, status | {status, createdAt} |
| settings + settings_history | singleton with version | Optimistic concurrency on version |
| audit_logs | actorId, action, entity, before, after, ip, at | TTL 2 years |
| location_pings | bookingId, professionalId, point, at (1 per 60 s during a job) | TTL 30 days (disputes) |
| outbox | type, payload, status, attempts, nextAttemptAt | {status, nextAttemptAt} |
| idempotency_keys | key, userId, response | Unique; TTL 24 h |
| client_errors / notification_log | — | TTL 30 days |

### C6. Matching engine
**Pre-payment quote: `POST /availability/quote`**
- The location must be inside an active area and within service hours.
- Eligible professionals are found with `$geoNear` on `presence.location`, limited by `min(settings.radius, pro.travelRadiusKm)`. They must be:
  - `status: active`, `presence.state: available`, heartbeat within 60 s;
  - holding every required skill (`skills ⊇ requiredSkills`);
  - of the matching gender (unless "Any").
- Response:
  - `{available, reason: outside_area | outside_hours | none_free | skill_unavailable, etaRange, quoteId, expiresAt (2 min)}`.
  - The arrival range comes from the nearest eligible professional: straight-line distance × 1.4 ÷ 18 km/h + 3 min, rounded to a 6-minute range.
- Booking creation re-checks the quote and refuses with "Professionals just got busy" if nobody is eligible any more.

**Rounds**
- Rank professionals by distance (500 m bands) → rating ↓ → jobs today ↑ → last completed ↑ (fairness).
- Create N offers with `expiresAt = now + 30 s`, then send socket `offer:new` and Web Push (Urgency high, TTL 30, `tag offer:<bookingId>`).
- The next round starts when all offers in a round are resolved or the window expires, excluding professionals already offered.
- At `search.deadlineAt` (120 s): `no_professional_found` → outbox refund (instant, speed `optimum`) + customer email + admin alert.

**Accept is atomic**
- One MongoDB transaction:
  1. Claim the pro: `presence.activeBookingId: null → bookingId`.
  2. Claim the booking: `status: searching → accepted`.
  3. Mark the offer accepted.
- If either claim fails, the transaction aborts and the response is "Job already taken" or "Offer expired".
- Other offers are revoked (socket, and a push with the same tag replaces the notification).

**Other paths**
- **Admin direct offer** creates an offer (round `admin`) for a chosen eligible professional, with the same accept path.
- **Pro cancels en route**: the pro is released (with a reason; repeat cancellations are flagged in their stats) and the booking returns to `searching` with a fresh deadline.
- **After accept:** the Google Routes API (Compute Routes Essentials; 70k free a month) calculates the ETA and route once, then again every 3 min or when the professional drifts more than 300 m off the route.

### C7. Timers without Redis (v1)
- **State lives in data.** All timed behaviour is stored as fields: `offers.expiresAt`, `search.deadlineAt`, `paymentExpiresAt`, `lateAt`, `presence.lastHeartbeatAt`, `outbox.nextAttemptAt`.
- **Immediate firing:** an in-process `setTimeout` per item, for responsiveness.
- **Safety net:** a **sweeper loop every 2 s** claims due items with atomic conditional updates (for example `{status: 'pending', expiresAt ≤ now} → expired`) and runs the transition idempotently. On boot it processes anything overdue, so restarts are safe.
- **Multi-instance:** one instance runs the sweeper. When we go multi-instance, a lease document (TTL) elects the leader, or we move to BullMQ + Redis (C18).
- **Rejected:** Agenda (it polls MongoDB anyway, and adds a dependency) and BullMQ now (needs Redis, unjustified for one instance).

### C8. Real-time (Socket.IO on the API server, path `/rt`)
- **Auth:** the session cookie is checked at handshake. Rooms: `user:<id>`, `pro:<id>`, `booking:<id>` (the customer, the assigned professional and admins), `admin`.
- **Server → client events:**
  - `offer:new`, `offer:revoked`, `offer:expired`;
  - `booking:updated` (status, ETA, professional summary, revealed contact);
  - `booking:location` (latitude, longitude, heading, timestamp; booking room only, and only while accepted or arrived);
  - `admin:ops` (batched every 10 s: presence, active bookings, alerts).
- **Client → server events:** `presence:heartbeat` (every 20 s with location while online), `location:update` (every 5 s or 25 m while on a job; rejected if accuracy is worse than 100 m), `offer:respond` (REST fallback exists). Every payload is validated with zod.
- **Location pipeline:** the latest position is kept in memory and emitted immediately. It is written to `bookings.lastProLocation` every 30 s, and one `location_pings` sample is stored per minute.
- **Source of truth:** REST/DB. Sockets are hints, and clients refetch on reconnect.

### C9. Payments, refunds and invoices
- **Create:** `POST /bookings` (with an `Idempotency-Key`).
  1. The server re-prices items from the database.
  2. It validates the quote.
  3. It creates the booking as `awaiting_payment` and a Razorpay order (`receipt` = bookingNo; `notes.bookingId`).
- **Pay:** Razorpay Checkout (UPI intent/QR, cards, netbanking, wallets) → `POST /payments/verify` checks the HMAC → `searching`.
- **Webhooks:** `payment.captured`, `payment.failed`, `order.paid`, `refund.processed` and `refund.failed`.
  - The raw-body signature is verified and the event id is deduplicated.
  - Handlers do not depend on arrival order; for example, `failed` may be followed by `captured` for the same payment.
- **Edge cases:**
  - A payment captured after the booking expired or was cancelled → automatic refund.
  - A **reconciliation job every 10 min** checks bookings stuck in `awaiting_payment` or `searching` against the Razorpay API.
- **Refunds:**
  - Full instant refund on no-match.
  - Partial refund on cancellation (total − fee).
  - Admin refund with a preview and a reason.
  - Status is tracked through webhooks. A failure raises an admin alert and allows a one-click retry.
- **Invoices:**
  - Issued at completion; the number is allocated atomically per financial year (`INV/2026-27/000123`).
  - The snapshot covers seller GSTIN, buyer, lines with SAC, taxable value, 5%, GST amount and total.
  - It is a printable HTML page (browser "Save as PDF"; no server-side PDF in v1).
  - A refund after invoicing produces a credit note.
  - Ledger fields support both the principal and the marketplace + TCS model (A1).

### C10. Notifications
- **Web Push via VAPID** (the `web-push` library); no Firebase project needed.
  - **Why VAPID:** one standard works on Chrome/Android and iOS 16.4+ Home Screen apps, with one less vendor account. Update the client asks list.
  - **Offer push payload:** locality only, services summary, earnings, `expiresAt`, deep link `/pro/offers/:id`.
  - **Android action "Accept"** opens `/pro/offers/:id?intent=accept`, which accepts on load. This is reliable because it runs with the app's cookies.
  - **Custom sounds are impossible on the web.** Alerts with the panel closed use the system sound. With the panel open, an in-app alarm loop plays. Its audio is unlocked by the Online-toggle tap.
  - **Cleanup:** subscriptions are removed on 404/410; `lastSuccessAt` is tracked; there is a "Send test alert" tool.
- **Email via SES** (bilingual by recipient locale; templates in the repo; transactional only):
  - booking confirmed (on accept), no professional + refund, cancelled + refund, completed + invoice + review link;
  - password reset, professional welcome / set password;
  - contact acknowledgement;
  - admin alerts: no-match, refund failed, late, OTP lock.
- **Admin alerts:** an in-app alert centre (optional sound) plus email.
- **Not in v1:** SMS, WhatsApp, masked calling, customer push.

### C11. Auth and security
- **Sessions:** server-side, stored in MongoDB (`express-session` + `connect-mongo`).
  - Cookie `sid`: httpOnly, Secure, SameSite=Lax, `Domain=.brand.in`. The web app is on `brand.in` and the API on `api.brand.in`; same-site, so cookies work for REST and sockets.
  - 30-day rolling sessions for customers and professionals; admin 12 h idle.
  - **Why sessions:** they can be revoked instantly (suspend → destroy sessions). JWT was rejected: hard to revoke, and there is a token-storage XSS risk.
- **CSRF and CORS:** SameSite plus a double-submit token header and an Origin check on mutations. CORS allows only the web origin, with credentials.
- **Passwords:** argon2id (19 MiB, t=2, p=1), minimum 8 characters, checked against a common-password list.
- **Tokens:** reset and set-password tokens are 32 random bytes, stored as SHA-256 hashes. Reset expires in 30 min; set-password in 72 h. Single use. Responses are generic, so they don't reveal whether an account exists.
- **Rate limits:** login 5/min per IP + email with backoff; reset 3/h; OTP 5 per booking; quote 30/min; contact 5/h per IP + honeypot.
- **Authorisation:** checked in the service layer (role + ownership). Each role has its own serializer, so phones and location are released only inside their allowed windows.
- **Input:** zod `.strict()` on every input, which blocks NoSQL operator injection; `strictQuery`.
- **Headers:** `helmet` on the API. CloudFront response-headers policy for the web: CSP allowing self, Razorpay and Google Maps; HSTS; frame-ancestors none.
- **OTP:** 4 digits from a CSPRNG, stored as an HMAC; the attempt limit locks it.
- **Uploads:** admin images through a presigned S3 PUT (≤ 5 MB, jpeg/png/webp), re-encoded with sharp into variants.
- **Secrets:** environment variables on the server (file mode 600) or SSM Parameter Store; never in git; separate test and live Razorpay keys; a secret scan in CI.
- **Privacy:**
  - location only during a job, with a 30-day trail;
  - no ID documents on our servers;
  - DPDP notice and consent in the Privacy Policy;
  - deletion requests handled by admin in v1.
- **Audit log** for refunds, cancellations, reassignments, settings changes, price changes, suspensions and blocks (before/after).

### C12. API conventions and endpoint map (`/v1`)
**Conventions**
- **Errors:** `{error: {code, messageKey, fields?: {path: messageKey}, requestId}}` with standard HTTP statuses.
- **Pagination:** offset for admin tables (limit ≤ 100); cursor for customer and professional history.
- **Idempotency:** an `Idempotency-Key` header on booking creation, payment verify, refunds and offer accept.

| Domain | Endpoints (role) |
|---|---|
| Auth | POST signup · login · logout · password/forgot · password/reset (guest) · GET/PATCH me |
| Catalogue | GET categories, services, services/:slug (public) · POST cart/price (public) · admin CRUD services, categories · POST admin/uploads (presign) |
| Customer | CRUD me/addresses · POST availability/quote · POST bookings · GET bookings (cursor), bookings/:id · GET bookings/:id/cancel-preview · POST bookings/:id/cancel · POST bookings/:id/review · GET bookings/:id/invoice |
| Payments | POST payments/verify (customer) · POST webhooks/razorpay (signature) |
| Professional | POST pro/presence · POST/DELETE pro/push-subscriptions · POST pro/push-test · GET pro/offers/:id · POST pro/offers/:id/accept · POST pro/offers/:id/decline · GET pro/jobs, pro/jobs/:id · POST pro/jobs/:id/arrived · /start {otp} · /complete · /customer-unavailable · /cancel · GET pro/earnings · PATCH pro/profile |
| Admin | GET admin/dashboard · GET admin/live · bookings list/detail · POST admin/bookings/:id/offer · /cancel · /refund · professionals CRUD, suspend, mark payout · customers list/detail/block · payments & refunds list, retry · reviews hide/unhide · messages list/update · GET/PUT settings (version) · GET audit |
| Other | POST contact · POST client-errors · GET /health/live, /health/ready |

### C13. Error handling
- **Web:**
  - A query error shows an inline error with Retry.
  - Mutation field errors appear on the fields. Unknown errors show "Something went wrong. Please try again." with the request id under "Details".
  - The offline banner comes from `navigator.onLine` plus socket state. A route error boundary offers Reload.
  - Money actions never retry silently.
- **API:** a typed `AppError` with code → status mapping. No stack traces leave the server. Every log line carries `requestId`, and `bookingId` where relevant.

### C14. Observability and operations
- **Logs:** pino JSON (`requestId`, `userId`, `bookingId`) shipped to CloudWatch Logs via the agent. Health endpoints.
- **Monitoring and alerts:** a Route 53 health check plus Lightsail metric alarms, emailed through SNS.
- **Error tracking:** our own endpoint in v1; Sentry free tier is optional later.
- **Business metrics (admin dashboard + logs):** match rate, time to first accept, offers per booking, no-match rate, ETA error (actual − predicted), cancellations by reason, refund latency, online professionals by hour, push success rate.
- **Alerts:** no-match spike, refund failed, webhook errors, 5xx rate, CPU/memory, database errors.
- **Runbooks in `docs/runbooks`:** stuck booking, failed refund, push outage, Razorpay outage, Maps quota, restore from backup.

### C15. Performance budgets (CI-enforced where possible)
| Area | Budget |
|---|---|
| Public routes on a mid-range Android over 4G (Lighthouse mobile) | LCP ≤ 2.5 s · INP ≤ 200 ms · CLS ≤ 0.1 · initial JS ≤ 170 KB gzip · route chunk ≤ 100 KB · above-the-fold images ≤ 250 KB |
| Fonts | Latin subset ≤ 60 KB per file; Devanagari only when needed |
| Admin (desktop) | Interactive ≤ 3.5 s; table interactions < 100 ms for 100 rows |
| API | p95 reads < 300 ms; accept transaction < 150 ms; socket fan-out < 1 s |
| Maps | Loaded only on checkout, booking, pro job and admin live |

### C16. Environments, deployment and CI/CD
- **Environments:**

  | Environment | Database | Razorpay | Email (SES) | Domain |
  |---|---|---|---|---|
  | Local | Docker MongoDB replica set (transactions) | Test keys | Sandbox | — |
  | Staging | Atlas (Free) | Test | Sandbox | `staging.brand.in` |
  | Production | Atlas **Flex** Mumbai with backups | Live | Production access | `brand.in` |

- **Web hosting:** private S3 bucket with OAC → CloudFront.
  - SPA fallback to `index.html`.
  - Hashed assets cached for 1 year (immutable); `index.html` and the service worker never cached.
  - Security-headers policy.
- **API hosting:** Lightsail (2 GB recommended for production; 1 GB acceptable for staging), Ubuntu.
  - Docker Compose: API + Caddy (automatic TLS, WebSocket proxy).
  - Static IP; firewall 80/443, SSH allowed from admin IPs only.
  - Atlas access list allows only the static IP.
- **CI (GitHub Actions):**
  - On pull request: lint, typecheck, unit + integration tests, build, size-limit, Playwright smoke.
  - On merge to main: deploy to staging.
  - Production: on a tag, with manual approval.
- **Deploys:**
  - Web: S3 sync + CloudFront invalidation of `index.html`.
  - API: image pushed to GHCR → SSH `docker compose pull && up -d`, with the previous tag kept for rollback.
- **Data:** `migrate-mongo` for migrations. Atlas Flex snapshots plus a weekly encrypted `mongodump` to S3. A restore drill happens in Phase 9.

### C17. Testing strategy
- **Unit (Vitest):** pricing (inclusive GST, fees, rounding in paise), state machine guards, matching ranking, ETA ranges, formatters, zod schemas.
- **Integration (Vitest + supertest + mongodb-memory-server replica set):** auth, booking creation, verify, webhook duplicates and order, refunds, offers, sweeper.
- **Concurrency:** 100 runs of 5 simultaneous accepts must give exactly 1 winner. Duplicate webhooks. Sweeper restart mid-search.
- **Web:** RTL tests for the complex components (checkout, OTP input, countdown, address search).
- **End-to-end (Playwright):**
  - critical flows at 390 × 844 and 1440 × 900, in English and Hindi;
  - the customer and professional flow in 2 browser contexts;
  - admin interventions;
  - axe on every page;
  - visual snapshots of `/styleguide` at 360/768/1024/1440.
- **Real devices:** Redmi (low-end Android), Samsung A-series, iPhone (iOS 17 and 18, Safari and the Home Screen PWA), iPad, Windows Chrome/Edge, Mac Safari. Outdoor field tests for push and location.
- **Load (k6):** 300 online professionals heartbeating, 30 active jobs sending location every 5 s, 20 bookings/min. Target: API CPU < 70% on 2 GB and Atlas within tier limits.

### C18. Scale path (when, not now)
| Trigger | Action |
|---|---|
| Sustained CPU above 70%, or more instances needed | Lightsail load balancer + 2 instances + Redis (socket.io adapter, BullMQ for timers, leader lease) |
| Atlas operations near the limit | Move to M10 |
| More than 200 markers on the live map | Marker clustering |
| Professionals need background tracking or guaranteed alerts | Native Android app |

---

## Part D: Phases
Every phase uses the same template: Goal · Scope · Screens · UX decisions · Technical decisions · Happy path · Edge cases and states · Dependencies · Definition of done (DoD) · Effort.

**Standard DoD for any screen** (applies in addition to each phase's own DoD):
- Reviewed in English and Hindi at 360, 390, 768, 1024 and 1440 px.
- Every state is present: loading, empty, error, offline, permission, success, validation.
- Keyboard-only pass; zero axe violations.
- Visual snapshot updated; Lighthouse budget met; strings in locale files.
- Tests added. Screenshots are reviewed by the user on staging before sign-off.

### Phase 0: Discovery, decisions and architecture
- **Goal:** turn this plan into signed-off decisions and a working repository before any product code.
- **Scope:**
  - ADRs for each choice in A3, C2–C11.
  - A requirements catalogue: user stories with acceptance criteria for workflows W1–W18 (below).
  - A risk register.
  - Catalogue audit report: duplicates, field-name drift, broken images, filter typos, ID collisions.
  - Inputs list for the CA (A1/A2) and legal (A13).
  - Accounts in test mode: AWS, Atlas, Razorpay test, Google Cloud Maps with India billing, SES sandbox, domain.
  - `git init`, GitHub repository, branch protection and project board.
- **UX:** low-fidelity wireflows (Mermaid) for 4 core journeys: book, accept, track/OTP, admin intervene.
- **Dependencies:** client answers D1–D8; defaults apply if they are late.
- **DoD:**
  - Every open decision has an answer or a default with an owner and date.
  - Route map and state machines approved by the user.
  - Repository and CI skeleton exist.
  - Data audit written.
- **Effort:** about 1 week.

### Phase 1: Brand and design system
- **Goal:** one coherent visual language, proven in a live style guide before any feature screen.
- **Scope:**
  - Two brand directions shown on 3 sample screens (Home, Checkout, Job alert); client picks one (D1).
  - Tokens (B2–B7) → MUI theme. Fontsource Noto fonts.
  - Every B8 component with all states, and the B9 shells with responsive behaviour.
  - Feedback patterns (toast, alert, banner, empty, skeleton, 404/500).
  - Form, table and map-container patterns.
  - `/styleguide` with an English/Hindi switch and a width preview.
  - Lint rules: no raw colours or px outside the design system; jsx-a11y.
  - Playwright visual baseline and axe.
- **UX decisions:** B1–B11.
- **Technical decisions:**
  - Wrapper API: variants through theme `variants`, consistent prop names (`variant`, `size`, `tone`).
  - Ripple off; focus-visible styling.
  - MUI 9 (ADR-0017); layout with CSS grid in `sx`.
- **Happy path:** a developer opens `/styleguide`, switches to Hindi at 360 px, and sees every component and state correct, with no overflow.
- **Edge cases:**
  - Long Hindi strings, 320 px width, 200% zoom.
  - Keyboard focus order in the shells.
  - Reduced motion.
  - Missing image tile.
- **Dependencies:** Phase 0. Brand approval blocks only the colour and wordmark swap; tokens make it a one-file change.
- **DoD:**
  - Client-approved brand.
  - Every component documented with its states.
  - Contrast table verified.
  - Zero axe violations and Lighthouse accessibility 100 on `/styleguide`.
  - Visual baseline committed.
- **Effort:** about 2 weeks (runs in parallel with Phase 2's API work).

### Phase 2: Platform foundation
- **Goal:** a production-grade skeleton: monorepo, API, sessions, roles, i18n, shells, CI/CD, staging.
- **Scope:**
  - Workspaces and TypeScript; stable Vite; Vitest/Playwright setup.
  - **API:** config, logger, `AppError`, zod middleware, helmet/CORS/CSRF, rate limits, health endpoints.
  - Users, sessions, settings and audit models.
  - Auth endpoints (signup, login, logout, me, forgot, reset/set-password); RBAC and ownership helpers.
  - SES email transport and templates (reset).
  - **Web:** data router with lazy role chunks and guards; session bootstrap.
  - Auth pages: Login, Sign up, Forgot, Reset/Set password.
  - Language switch persisted to the profile and localStorage, with `<html lang>`.
  - Error boundary, 404/500, offline banner.
  - Staging on AWS + Atlas; admin seed script.
- **Screens:** Login, Sign up, Forgot, Reset (5 of the 43, plus 404).
- **UX decisions:**
  - Sign-up asks only for name, phone, email and password.
  - "Show password".
  - After login, return to the intended page; a cart in progress is preserved.
  - Session-expiry interstitial that keeps form state where it is safe.
- **Workflows:**
  - **W2. Sign up / log in / reset.** *Since 2026-10-15 (ADR-0020): customers and professionals enter their mobile number, then the 6-digit SMS code; a new number adds a name and becomes a customer. Admins log in at `/admin/login` with email + password, and the reset path below is theirs only. The steps below describe the original email flow.*
    1. Start: Login (or "Continue" at checkout).
    2. The user enters email and password and submits.
    3. API: rate-limit check, argon2 verify, session created, role returned.
    4. The user lands on the intended page, or the role home, with a short toast "Welcome back".
    5. Reset path: Forgot → generic "If an account exists, we've emailed a link" → email → set new password → auto login → toast.
    - **Must handle:**
      - wrong credentials (generic error and attempts guidance);
      - locked by rate limit (show wait time);
      - email already registered (on sign-up, with a "Log in" link);
      - expired or used token;
      - blocked or suspended account (clear message with support contact);
      - offline;
      - session expired mid-action.
  - **W18. Language switch.**
    1. The user taps EN/हिं in the header or profile.
    2. The UI switches instantly with no reload; the preference is saved.
    3. Emails follow the saved language.
    - **Must handle:** a missing Hindi string (falls back to English and logs it); layout expansion.
- **DoD:**
  - All auth flows pass end-to-end on staging (mobile and desktop).
  - securityheaders.com grade A.
  - CI green; logs visible in CloudWatch; seeded admin can log in.
- **Effort:** about 2 weeks.

### Phase 3: Catalogue and public website
- **Goal:** fast, premium, bilingual discovery, plus admin control of the catalogue.
- **Scope:**
  - **Catalogue migration script** (from `src/store/data`):
    - deduplicate IDs (195 → 179 women's) and fix the 3 men/women collisions;
    - normalise fields (aftercare, FAQ, recommendedFor, products);
    - convert durations to minutes; fix filters ("Shadadi");
    - map images to S3 or the placeholder;
    - add `{en, hi}` fields with Hindi pending;
    - map categories to required skills;
    - produce a report.
  - Catalogue API with caching (ETag) and the image pipeline.
  - **Public pages:**
    - Home: hero with an honest promise ("At your door in 10–15 minutes"), categories, how it works (3 accurate steps), trust (verified professionals, OTP safety, hygiene), FAQ, footer.
    - Services: gender switch, categories, text search, URL state.
    - Service detail sheet at `/services/:slug`: tiers, includes, aftercare, FAQ, add.
    - Cart: per-tier lines, max quantity, server re-price, platform fee line, "taxes included".
    - About, Contact (form → messages + email), Policies (reading layout), 404.
    - SEO meta and sitemap.
  - **Admin:** Services list, Add/Edit Service (bilingual tabs, tier editor, images, skills, active, preview), Categories (reorder by drag, plus keyboard up/down buttons), Messages.
- **UX decisions:**
  - Browsing never needs login or location. Location is asked at checkout; an optional "Check availability" chip is on Home.
  - No autoplay media.
  - The home hero uses one strong photograph.
  - The services page leads with categories and shows real prices.
- **Workflows:**
  - **W1. Discover and add to cart.**
    1. Start: Home or a shared link.
    2. Choose a category, open a service (sheet), pick a tier, tap "Add".
    3. The system updates the persisted cart and refreshes its price.
    4. Feedback: quantity stepper replaces Add, header cart count updates, mobile action bar shows "1 item · ₹649 · View cart".
    5. Success: cart ready for checkout.
    - **Must handle:**
      - a service deactivated or re-priced while in the cart (notice, updated line);
      - empty search ("No services match 'xyz' · Clear search");
      - missing Hindi content (English fallback);
      - slow network (skeleton grid);
      - image failure (neutral tile).
  - **W13. Admin catalogue.**
    1. Admin opens Services → New.
    2. Fills English and Hindi, adds tiers, uploads an image (presign → variants), sets skills, previews, publishes.
    3. The service appears on the public site within the cache window, with toast "Published".
    - **Must handle:**
      - validation (at least one tier, price > 0, unique slug);
      - Hindi missing (warning badge, allowed);
      - upload too large or wrong type;
      - concurrent edit (version conflict dialog).
  - **W17. Contact.**
    1. The visitor submits the form.
    2. It is stored and the admin is emailed; the visitor gets an acknowledgement email.
    3. Inline success: "Thanks — we'll reply within one working day".
    - **Must handle:** spam (honeypot, rate limit) and validation.
- **Dependencies:** Phases 1 and 2.
- **DoD:**
  - Lighthouse mobile on Home and Services: Performance ≥ 90, Accessibility 100, Best Practices 100, SEO ≥ 95.
  - Catalogue migrated with the report reviewed.
  - Admin can publish a service end-to-end.
  - E2E tests pass.
- **Effort:** about 2 weeks.

### Phase 4: Professional foundation (accounts, PWA, readiness, presence)
- **Goal:** professionals can be onboarded and kept reliably reachable before booking flows exist.
- **Scope:**
  - **Admin:**
    - Professionals list (presence, status).
    - Add/Edit Professional from the Google Form data: name, phone, email, gender, skills, base area, travel radius, verification checkbox + date, photo.
    - Professional Details.
    - Set-password email.
  - **Pro PWA:**
    - manifest and icons; service worker with push handling;
    - install guidance: Android `beforeinstallprompt`, iOS "Add to Home Screen" sheet;
    - **readiness checklist:** installed, notifications allowed + successful test alert, location allowed, battery-optimisation guidance per phone brand, Hindi default.
  - **Dashboard:**
    - Online/Offline toggle (gated by readiness);
    - heartbeat + location while online; Wake Lock re-acquired on `visibilitychange`;
    - in-app alarm audio unlocked by the toggle tap;
    - "Keep this screen open to get jobs fastest" hint.
  - Profile; My Jobs and Earnings shells with empty states.
  - Admin live presence list (map in Phase 8).
- **UX decisions:**
  - Readiness is a short checklist, with one action per row and a help link. It never blocks without telling the professional exactly what to do.
  - Online status is visible in the top bar at all times.
- **Workflows:**
  - **W11. Onboarding.**
    1. Admin adds the professional and saves.
    2. The system creates the account and emails a set-password link (Hindi).
    3. The professional sets a password on the phone, is guided to install, allows notifications, receives a test alert ("आपके फ़ोन पर अलर्ट आ रहे हैं"), allows location.
    4. Success: the checklist is all green and the Online toggle is enabled.
    - **Must handle:**
      - iOS below 16.4 (no push; warned to keep the app open);
      - notifications denied (re-enable steps per browser);
      - location denied;
      - unsupported browser;
      - expired subscription (re-subscribe on open);
      - two devices (both subscribed);
      - suspended account.
  - **W12. Go online / offline.**
    1. The professional taps Online.
    2. The system sets presence to available and starts the heartbeat.
    3. Feedback: green "Online", connection indicator, admin sees them within 10 s.
    4. Offline is one tap; going offline is blocked during an active job.
    - **Must handle:**
      - connection lost ("Reconnecting…"; marked stale after 60 s, offline after 5 min, with a notification);
      - wake lock refused (explain);
      - battery saver.
- **Dependencies:** Phases 1 and 2.
- **DoD:**
  - Field test on 3 Android brands + iPhone: the test alert arrives with the app closed, median ≤ 5 s on Wi-Fi and 4G.
  - Admin presence is accurate within 30 s.
  - The flow is usable entirely in Hindi.
- **Effort:** about 1.5 weeks.

### Phase 5: Checkout, availability and payments
- **Goal:** cart → paid booking through a minimal, trustworthy checkout, with guaranteed money correctness.
- **Scope:**
  - Addresses: Places Autocomplete + pin confirm + house/building/landmark + label.
  - Active-area polygons and service hours (settings).
  - Availability quote and its UI: ETA range and reasons.
  - Gender preference; server-computed PriceSummary.
  - Razorpay order, Checkout, verify, webhooks, reconciliation; refunds infrastructure; idempotency.
  - Customer pages: Checkout, My Addresses, My Profile.
  - The searching state of `/bookings/:id` (basic until Phase 6).
- **UX decisions:**
  - **Checkout is one page with three steps in order:**
    1. Where (saved addresses or search → pin → flat/landmark).
    2. Who (Any / Female / Male).
    3. Review & pay.
  - Availability is shown before payment as "Professionals available · arrives in 12–18 min".
  - The pay button shows the exact amount, sticky on mobile. "Edit" links instead of a multi-page wizard.
  - Unavailable states explain the reason and the next step. Outside hours shows "We open at 8:00 am".
- **Workflows:**
  - **W3. Address and location.**
    1. Checkout → "Add address".
    2. The user searches or uses current location, adjusts the pin, enters the flat/house number and saves.
    3. The system stores it as GeoJSON and checks the active area.
    4. Feedback: the address card is selected; the availability check runs.
    - **Must handle:**
      - location permission denied (search fallback);
      - pin far from the searched place (confirm);
      - outside the area ("We don't serve this area yet");
      - Places errors (manual entry with pin).
  - **W4. Checkout and pay.**
    1. Start: Cart → Checkout (log in or sign up inline if needed, then return).
    2. Address and preference selected → quote returns an ETA.
    3. The user taps "Pay ₹1,049" and Razorpay opens (UPI app).
    4. The system verifies the signature and the booking becomes `searching`.
    5. The user lands on `/bookings/:id` showing "Payment received · Finding a professional".
    - **Must handle:**
      - quote expired (silent re-check before opening Razorpay);
      - nobody eligible at creation ("Professionals just got busy");
      - payment cancelled or failed (stay on checkout, "Payment not completed — try again", booking stays `awaiting_payment` until expiry);
      - returning from the UPI app on iOS;
      - double tap (idempotent);
      - webhook arrives before verify;
      - captured after expiry (automatic refund);
      - price changed (summary updates and needs re-confirmation);
      - session expired (cart and address draft preserved).
- **Dependencies:** Phase 3 (catalogue, cart), Phase 4 (online professionals for quotes).
- **DoD:**
  - The Razorpay test-mode suite passes: success, failure, abandoned, late capture, duplicate and out-of-order webhooks.
  - The reconciliation report shows zero mismatches.
  - Checkout Lighthouse mobile ≥ 90.
  - Real-device UPI flow verified on Android Chrome and iOS Safari.
- **Effort:** about 2 weeks.

### Phase 6: Matching and job alerts (real-time core)
- **Goal:** each paid booking reaches the right professional in seconds, with no double assignment and no lost refund.
- **Scope:**
  - Matching engine (C6), offers, atomic accept, revocation, sweeper/timers (C7).
  - No-match → instant refund via the outbox, plus customer and admin alerts.
  - Socket infrastructure (C8); VAPID push with deep links and the Accept action.
  - Pro Job Alert (full screen).
  - The customer Finding state.
  - Admin direct offer from Booking Details (basic).
- **UX decisions:**
  - **Job alert:** distance and travel time, locality (no exact address before accept), services, "You earn ₹420", a 30 s ring, full-width "Accept" at the bottom, "Decline" secondary with optional quick reasons. The in-app alarm and vibration play while open.
  - **Finding:**
    - calm radar plus text ("Contacting professionals near you…");
    - elapsed time;
    - the promise "If no one is free within 2 minutes, you'll get a full refund automatically";
    - "Cancel booking" available, free while searching.
- **Workflows:**
  - **W5/W6. Matching.**
    1. The booking enters `searching`; 3 professionals are alerted (socket + push) within 3 s.
    2. Pro A taps Accept at 9 s.
    3. The transaction claims both records; the other offers are revoked.
    4. Pro A sees Job Details instantly. Pros B and C see "Job taken". The customer's screen flips to "Priya accepted · arriving in about 14 min" within 1 s.
    - **Must handle:**
      - simultaneous accepts (one winner);
      - accept after expiry ("Offer expired");
      - a professional going offline mid-offer;
      - empty rounds (next round);
      - deadline reached (refund and messages);
      - customer cancels while searching (offers revoked, full refund);
      - admin direct offer;
      - server restart mid-search (sweeper recovers);
      - push missed but socket delivered, or the reverse.
- **Dependencies:** Phases 4 and 5.
- **DoD:**
  - The concurrency test passes 100/100.
  - The restart test passes.
  - Median paid → first alert < 3 s.
  - Field test: closed-app Android receives the offer with median ≤ 5 s.
  - No-match refund starts ≤ 10 s after the deadline.
  - Two-context Playwright tests are green.
- **Effort:** about 2 weeks.

### Phase 7: Job execution (tracking, arrival, OTP, completion)
- **Goal:** clarity and safety from accept to completion, then invoice, review and earnings.
- **Scope:**
  - **Pro Job Details:**
    - customer first name, address with landmark;
    - **Call** (inside the reveal window);
    - an in-panel route map (Routes polyline) with a secondary "Open in Google Maps" that warns "Your live location pauses while you're in another app";
    - location publishing + Wake Lock;
    - "I've arrived" (geofence), OTP entry, service timer, "Complete";
    - "Customer not reachable" (wait timer + call log); "Cancel job" with a reason.
  - **Customer `/bookings/:id`:**
    - map with professional marker and route;
    - ETA plus "updated 20 s ago";
    - **stale state** "Location paused · last updated 3 min ago";
    - professional card (photo, name, rating, Call);
    - OTP card "Share this only when your professional arrives";
    - status tracker;
    - cancel with a fee preview; help (support phone).
  - In-progress and completed states (receipt, review).
  - Invoice page, My Bookings (current / past).
  - Pro My Jobs and Earnings (today/week, per-job breakdown, payout status).
  - Late detection, cancellation fees and refunds, server-side enforcement of the reveal window.
- **UX decisions:**
  - On mobile, the customer's OTP is the most prominent element once the status is "Arrived".
  - The professional's primary button changes with the job stage: Navigate → I've arrived → Enter OTP → Complete service.
  - Every stage change is confirmed with a short, specific message.
- **Workflows:**
  - **W7. En route.**
    1. Pro taps Navigate; the in-panel route shows.
    2. The system relays location every 5 s and recalculates the ETA every 3 min.
    3. The customer sees the marker move and the ETA count down.
    - **Must handle:** stale location, professional cancels (re-search), late (admin alert + free cancel), GPS jitter.
  - **W8. Arrival → OTP → complete.**
    1. Pro taps "I've arrived"; the customer gets an in-page alert "Priya has arrived".
    2. The customer says the OTP; the professional enters it; verified → `in_progress`.
    3. The professional completes the service → `completed` → invoice and earnings.
    4. The customer sees the receipt plus "Rate your experience".
    - **Must handle:**
      - outside the geofence (confirm);
      - wrong OTP (attempts left; lock at 5);
      - network loss while sending the OTP (retry with idempotency);
      - completing very early (confirm).
  - **W9. Review and invoice.**
    1. The customer gives stars + an optional comment and submits.
    2. Saved once; the professional's rating updates; toast "Thanks for your feedback".
    3. The invoice opens in printable form.
    - **Must handle:** review already submitted, a booking that isn't completed.
  - **W10. Customer cancellation.**
    1. Tap "Cancel booking".
    2. A sheet shows the consequence: "Cancellation fee ₹99 · ₹950 will be refunded to your UPI in minutes".
    3. Confirm → `cancelled` → refund → email.
    - **Must handle:** a fee-free window (searching, or the professional is late), a refund failure (admin retry; the customer sees "processing").
- **Dependencies:** Phase 6.
- **DoD:**
  - Full-lifecycle E2E tests on mobile viewports pass.
  - Tracking latency < 2 s on 4G.
  - The stale state is verified by backgrounding the app.
  - A sample invoice is validated by the CA.
  - The tracking page passes the text-alternative check.
- **Effort:** about 2 weeks.

### Phase 8: Admin operations
- **Goal:** the business runs day-to-day without a developer.
- **Scope:**
  - **Dashboard:** today's KPIs (bookings, revenue, live jobs, searching now, no-match rate, online professionals) and an alerts feed (no-match, late, refund failed, OTP lock) with deep links.
  - **Live Map:** available/busy professionals and active bookings, filters, and a synchronised list for accessibility.
  - **Bookings:**
    - filters (status, date, area, professional) and search (booking number, phone); CSV export;
    - Booking Details: full timeline (offers, payments, refunds, notes); actions: direct offer / reassign, cancel with refund choice, manual refund, internal note.
  - **Professionals:** performance (accept rate, completion, rating), jobs, earnings; mark payout; suspend (blocked during an active job unless reassigned).
  - **Other areas:**
    - Customers (block);
    - Payments & Refunds (retry failed);
    - Reviews (hide/unhide);
    - Messages;
    - Settings, grouped as Business, Matching, Hours & Areas (polygon editor), Policies, Alerts — with validation, a change preview and history;
    - Audit viewer.
- **UX decisions:**
  - Dense but calm tables, keyboard-friendly, with URL-synced filters.
  - Destructive confirmations spell out the consequence ("Refund ₹1,049 to the customer's UPI. This can't be undone.").
  - Optimistic UI only for non-money actions.
- **Workflows:**
  - **W14. Intervention.**
    1. A dashboard alert says "BK-1234 searching for 90 s".
    2. The admin opens it and sees eligible professionals with their distance, then sends a direct offer.
    3. The professional accepts; the alert resolves and the timeline updates.
    - **Must handle:** nobody eligible (cancel + refund), refund API failure (retry), concurrent edits (version conflict).
  - **W15. Manage professionals.**
    1. The admin edits skills or suspends a professional.
    2. The change is audited; sessions are revoked on suspend.
    3. Toast + status pill update.
    - **Must handle:** a suspended professional with an active job.
  - **W16. Settings.**
    1. The admin changes the search timeout and sees a preview of the effect.
    2. Saving writes a new version, updates the audit log, and applies to new bookings only.
    - **Must handle:** invalid combinations (e.g. accept window ≥ search timeout); a stale version.
- **Dependencies:** Phases 3–7.
- **DoD:**
  - All admin flows pass E2E.
  - Every sensitive action is audited.
  - Usable at 1024 px and as a mobile card view.
  - Keyboard-only operation of bookings works.
- **Effort:** about 2.5 weeks (the admin read views can start in parallel from Phase 5).

### Phase 9: Hardening, content and launch
- **Goal:** production readiness and a controlled launch.
- **Scope:**
  - Hindi copy completed and native-reviewed; legal pages finalised.
  - Performance pass (bundle analysis, images, caching).
  - Accessibility audit: TalkBack, VoiceOver, keyboard.
  - Security review: OWASP ASVS L1 checklist, dependency audit, secret scan, authorisation tests for every endpoint.
  - k6 load test and tuning; the real-device matrix.
  - Dashboards and alerts; runbooks; a backup restore drill.
  - Production setup: Razorpay live KYC, SES production access, Maps quota and billing alerts, domain/TLS.
  - Production data seed.
  - **Pilot:** internal test bookings, then a limited area, with daily review; then a bug-fix window.
- **DoD:**
  - Part F all green; go/no-go review held; rollback rehearsed.
  - The pilot has N real bookings with zero critical issues and zero money mismatches.
- **Effort:** about 2 weeks.

**Critical path and effort.** With 2 engineers (web and API), the tracks run in parallel:
- Phase 1 runs alongside Phase 2.
- The Phase 3 UI runs alongside the Phase 4 API.
- The admin read views start during Phases 5–7.

That is about **13–15 weeks** of calendar time. This is quality-first, as agreed.

---

## Part E: End-to-end happy path (primary journey)
| Time | Who | Does | System | Feedback |
|---|---|---|---|---|
| 0:00 | Customer (phone, Hindi) | Opens brand.in from a shared link | CloudFront serves the cached shell; Hindi namespace loaded | Home in ≤ 2.5 s; hero "10–15 मिनट में आपके घर" |
| 0:20 | Customer | Category → service sheet → tier → Add | Cart persisted; price checked | Stepper replaces Add; action bar "1 item · ₹649 · View cart" |
| 0:45 | Customer | Cart → Checkout → logs in inline | Session created; returns to checkout | Checkout with cart intact |
| 1:10 | Customer | Picks saved "Home" address, "Female" | Quote: 3 eligible within 5 km | "Professionals available · arrives in 12–18 min"; summary ₹649 + ₹11 = ₹660 (taxes included) |
| 1:25 | Customer | "Pay ₹660" → UPI app → approves | Order created (idempotent) → verify signature → `searching` | `/bookings/BK-…`: "Payment received · Finding a professional" with radar |
| 1:28 | 3 professionals | Phones alert (panel open: in-app alarm; closed: push) | Offers round 1, 30 s window | Full-screen job alert: "1.2 km · about 6 min · You earn ₹486" |
| 1:37 | Professional (Priya) | Accept | Transaction claims both; others revoked; OTP generated; email queued | Priya: Job Details + route. Customer: "Priya accepted · arriving in about 14 min", photo, rating, Call, OTP card |
| 1:40–15:00 | Priya | Navigates in-panel, screen on | Location every 5 s; ETA refreshed every 3 min | Customer sees the marker move; "updated 5 s ago" |
| 15:10 | Priya | "I've arrived" (inside geofence) | `arrived` | Customer: in-page "Priya has arrived" with OTP prominent |
| 15:30 | Priya | Enters the OTP the customer says | Verified → `in_progress`; timer | Both see "Service in progress" |
| 55:00 | Priya | "Complete service" | `completed`; invoice INV/2026-27/000123; earnings ₹486; phones hidden | Customer: receipt + "Rate your experience"; Priya: "₹486 added to today's earnings" |
| 56:00 | Customer | 5 stars + comment | Review stored; rating updated | "Thanks for your feedback"; invoice link |
| Throughout | Admin | Watches the live map and dashboard | Socket ops feed; no alerts raised | Booking moves Searching → On the way → In progress → Completed |

---

## Part F: Final quality checklist
- **Responsiveness:**
  - 320–1440+ with no horizontal scroll.
  - 360/390/768/1024/1440 reviewed in both languages.
  - Landscape phone works.
  - Tables become cards, dialogs become sheets.
  - Sticky action bars respect safe areas.
  - 200% zoom reflows.
- **UX:**
  - One primary action per view.
  - Every wait explains what, how long and what if it fails.
  - Destructive actions confirmed with their consequences.
  - Errors are actionable.
  - Empty states have a next step.
  - Deep links work for every booking state.
- **UI consistency:**
  - Only tokens are used (lint clean).
  - Radii, borders, elevation and motion follow B5/B7.
  - One icon set.
  - Typography scale respected.
  - No banned decoration.
  - Visual snapshots match the style guide.
- **Accessibility:**
  - Zero axe violations; contrast verified; keyboard-complete.
  - Visible focus, never obscured.
  - Labels and errors linked; live regions for status.
  - Reduced motion.
  - `lang` attributes; map text alternative.
  - TalkBack and VoiceOver passes.
- **Performance:**
  - C15 budgets met in CI and on a real mid-range Android.
  - Images responsive.
  - Fonts subset; maps lazy-loaded.
  - No 24 MB home page (assets audited).
- **Security:**
  - Server-side authorisation on every endpoint (tested).
  - Sessions secure; CSRF and CORS correct.
  - Rate limits; zod strict inputs.
  - Webhook signatures verified.
  - Secrets out of git; CSP and HSTS.
  - Reveal windows enforced server-side.
  - Audit log complete.
  - Dependency and secret scans clean.
- **Money correctness:**
  - Integer paise; server-side pricing.
  - Idempotent create, verify and refund.
  - Webhook deduplication and order-independence.
  - Reconciliation shows zero mismatches.
  - Invoices sequential per financial year; credit notes for post-invoice refunds.
- **Real-time correctness:**
  - Exactly one winner on accept; restart-safe timers.
  - Stale presence excluded from matching.
  - Resync on reconnect.
  - Location shared only within the window.
- **Error, empty, loading:**
  - Every screen has skeleton, empty, error-with-retry, offline and permission states.
  - Route error boundaries.
  - No full-page spinners after boot.
- **Bilingual:** every string localised; Hindi native-reviewed; no truncation; emails in the user's language.
- **Production readiness:**
  - Staging mirrors production.
  - Monitoring and alerts live; runbooks written.
  - Backup restore tested; rollback tested.
  - Razorpay live, SES production, Maps billing alerts.
  - Legal pages approved; pilot completed.

---

## Part G: Existing code (`E:\downloads\YM_CLN-main\YM_CLN-main`)

**Reuse as concept, rebuild on the design system**

| Existing file(s) | Becomes |
|---|---|
| `src/components/ServiceCard.jsx` | Service card |
| `src/components/ServiceDetailsModal.jsx` (tiers, overview, FAQ, aftercare) | Service detail sheet |
| `src/pages/ServicesPage.jsx` (filtering idea) | Services page with URL state |
| `src/components/utils/QtyButton.jsx` | QuantityStepper |
| `src/store/cartSlice.jsx` | Zustand cart, keyed `serviceId:tierId` |
| `src/components/NavBar.jsx`, `src/layout/MainLayout.jsx` | Public shell |
| `src/components/DynamicForm.jsx` | Its field configs become the RHF + zod schemas |
| `src/pages/Cart.jsx`, `src/pages/AboutUs.jsx`, `src/pages/ContactUs.jsx` | Redesigned pages |

**Use as specifications or sources**

| Existing file(s) | Used for |
|---|---|
| `src/pages/JoinFreelancer.jsx` | Field list → Google Form questions and the Add Professional form |
| `src/api/emailJsService.js` | Template content → SES templates (escaped; no admin email in the client) |
| `src/store/data/**` | Catalogue migration source |
| `src/theme/theme.js` | Replaced by tokens |

**Delete:**
- `src/components/Service.jsx`, `src/components/TabbedServices.jsx`, `src/pages/FreelancerForm.jsx`, `src/hooks/useAsyncStatus.jsx`
- `src/api/src/data/Demo_1.js`, `src/store/data/woman_old.js`, `src/store/data/woman/packages/fix.js`
- `src/components/HeroComponent.jsx` (autoplay video), `src/components/CategoriesSection.jsx` (marquee)
- The `Loader`, `Notify`, `SuccessScreen` and `CheckoutWithCartModal` components
- About 11 MB of unused assets, plus `main.mp4`
- The dependencies `@emailjs/browser`, `@faker-js/faker`, `framer-motion`, `redux` and `yup` (replaced by zod)
- The `rolldown-vite` override

**Re-encode the used photos** (e.g. `hair.jpg` 18.8 MB → under 250 KB AVIF/WebP variants).

---

## Part H: Verification
- **Per phase:** the phase DoD plus the standard screen DoD; the user reviews staging screenshots (both languages, 4 widths) before sign-off.
- **Automated (CI):** lint (incl. jsx-a11y and token rules), `tsc --noEmit`, Vitest unit and integration (mongodb-memory-server replica set), concurrency suites, Playwright E2E at 390 and 1440 in English and Hindi with axe, visual snapshots of `/styleguide`, size-limit budgets, Lighthouse CI on Home, Services and Checkout.
- **Manual:** the real-device matrix (C17); outdoor push and location field tests; Razorpay test-mode scenarios; TalkBack and VoiceOver; the k6 load test against staging; restore and rollback drills.
- **Launch gate:** Part F checklist fully green plus the pilot results (Phase 9).
