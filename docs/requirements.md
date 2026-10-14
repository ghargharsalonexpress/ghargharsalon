# Requirements: user stories and acceptance criteria

These are the acceptance criteria for workflows W1–W18 in `PRODUCT_PLAN.md`. A workflow is done when every criterion passes on staging:
- at 360, 390, 768, 1024 and 1440 px;
- in English and Hindi (Admin: English only);
- by keyboard, with zero axe violations.

Money amounts in the examples include GST (ADR-0010).

---

## W1. Discover and add to cart · Customer · Phase 3
**Story:** As a customer, I want to find a service and add the right option to my cart, so I can book it quickly.
- Opening a category lists its services with:
  - name;
  - price including GST;
  - duration;
  - a photo, or the neutral placeholder.

  All of it is in my chosen language, and Hindi falls back to English when a translation is missing.
- A service with tiers shows each tier's price and duration before I add it.
- Tapping **Add**:
  - turns the button into a quantity stepper (1–3);
  - updates the header cart count;
  - on mobile, shows an action bar with "1 item · ₹649 · View cart".
- **Changes since I added a service:** if it was deactivated, the cart line is removed; if it was re-priced, the line is updated. Either way there is a short explanation.
- **No search results:** "No services match '…'", with **Clear search**.
- Service details open at a shareable URL (`/services/:slug`). Back closes them and returns to the same scroll position.

## W2. Sign up, log in, reset password · All roles · Phase 2
**Story:** As any user, I want to get into my account quickly and safely, and recover it if I forget my password.
- **Sign up:**
  - asks for name, mobile (10 digits, starting 6–9), email and password (at least 8 characters, not a common password);
  - errors appear under the field on blur or submit, and clear as I type.
- **Login redirects:** a customer goes back to the page they came from (or `/services`), a professional to `/pro`, an admin to `/admin`. The cart survives login and sign-up.
- **Wrong email or password:** "Email or password is incorrect". After 5 tries in a minute: "Too many attempts. Try again in N seconds."
- **Forgot password:** always shows the same confirmation. The email link works once and expires after 30 minutes. An expired or used link explains this and offers **Send a new link**.
- **Blocked or suspended account:** a clear message with the support contact; no session is created.
- **Session expires mid-task:** the user returns to the same place after logging in again. Unsaved checkout choices (address, preference) are kept.

## W3. Address and location · Customer · Phase 5
**Story:** As a customer, I want to give my exact location easily, so the professional finds me.
- **Ways to set the address:** search (Google Places), **Use current location**, or adjusting a pin.
- **Required:** a confirmed pin and a house/flat number. Landmark is optional. Label is Home, Work or Other.
- **Location permission denied:** explains how to search instead. No dead end.
- **Outside an active area:** "We don't serve this area yet" appears before payment.
- **Managing saved addresses:**
  - they can be edited and deleted;
  - deleting asks for confirmation;
  - one address is the default.

## W4. Checkout and payment · Customer · Phase 5
**Story:** As a customer, I want to see availability and the exact total before paying, and pay in one step.
- **Availability before Pay:** shows "Professionals available · arrives in 12–18 min", or the reason it's unavailable:
  - outside area;
  - outside hours, with the opening time;
  - nobody free right now.
- **Summary:** items, platform fee and total, with "taxes included". The server calculates it.
- **Paying:** the **Pay ₹X** button shows the exact total. One tap creates exactly one booking, even on a double tap or a retry.
- **After a successful payment:** `/bookings/:id` shows "Payment received · Finding a professional" within 2 seconds.
- **Payment cancelled or failed:** the customer stays on checkout with "Payment not completed — try again". No duplicate booking is created. The unpaid order expires after 15 minutes.
- **Price or availability changed since the check:** the summary updates and must be confirmed again before payment opens.

## W5. Waiting for a professional · Customer · Phase 6
**Story:** As a customer who has paid, I want to know what is happening while the platform finds someone.
- **What's on screen:** what is happening, the elapsed time, and the promise "If no one is free within 2 minutes, you'll get a full refund automatically".
- **Cancel during the search:** **Cancel booking** asks for confirmation; the booking is free to cancel; offers are revoked and a full refund starts.
- **When a professional accepts:** the screen changes within 1 second, without a reload, to show their name, photo, rating and arrival range.
- **When nobody accepts by the deadline:** "No professional was free right now. Your full refund of ₹X has started." Plus a refund timeline, an email, and **Browse services**.

## W6. Receiving and accepting a job · Professional · Phase 6
**Story:** As an online professional, I want to see nearby jobs instantly and accept the ones I can do.
- **Who is alerted, and how fast:** eligible online professionals get the alert within 3 seconds. It is in-app if the panel is open, or a push notification if it is closed.
- **What the alert shows:**
  - distance and travel time;
  - the locality (never the exact address before accepting);
  - the services;
  - "You earn ₹X";
  - a 30-second countdown.
- **Accept:**
  - the winner goes to Job Details;
  - anyone else who tapped Accept sees "Job already taken";
  - after 30 seconds the alert says "Offer expired".
- **Decline:** takes one tap, with an optional reason (too far, busy, other).
- **Under any concurrency, exactly one professional wins a booking** (tested).

## W7. On the way and tracking · Customer and Professional · Phase 7
**Story:** As a customer, I want to see where my professional is. As a professional, I want clear directions.
- **The professional's panel:**
  - shows the route in the panel;
  - shares location about every 5 seconds while the panel is visible;
  - **Open in Google Maps** warns that live sharing pauses while they are in another app.
- **What the customer sees:**
  - the marker moving, the arrival time, and "updated N s ago";
  - with no update for 45 seconds: "Location paused · last updated N min ago".
- **Phone numbers:** both sides see a **Call** button only while the job is active.
- **Professional cancels:** the customer sees "Finding another professional" and the search restarts automatically.
- **Professional is late beyond the threshold:** the admin is alerted, and the customer is offered free cancellation.

## W8. Arrival, OTP, service and completion · Both · Phase 7
**Story:** As a customer, I want only my real professional to start the service. As a professional, I want a quick, clear way to start and finish.
- **I've arrived:** works within 200 m of the address; further away it asks for confirmation. The customer is told "Priya has arrived" in the page.
- **The OTP:**
  - after arrival it is the most prominent element on the customer's screen;
  - the professional enters it on a numeric keypad;
  - 5 wrong tries lock it and alert the admin.
- **Correct OTP:** both sides see "Service in progress" within 2 seconds.
- **Complete service:**
  - creates the invoice number;
  - adds the professional's earnings;
  - hides both phone numbers;
  - asks for confirmation if used before 50% of the expected duration.
- **Customer not reachable:** after a 10-minute wait and 2 logged call attempts, the professional can close the job; the no-show fee applies.

## W9. Review and invoice · Customer · Phase 7
**Story:** As a customer, I want to rate the service and get a proper invoice.
- **Review:**
  - after completion: 1–5 stars, plus an optional comment of up to 500 characters;
  - one review per booking, which can't be edited in v1.
- **Invoice:** shows seller details, GSTIN, SAC code, taxable value, GST and total. It prints cleanly on A4.

## W10. Customer cancellation · Customer · Phase 7
**Story:** As a customer, I want to cancel if my plans change, and know exactly what I'll get back.
- **Before confirming,** the sheet shows the fee and refund. Example: "Cancellation fee ₹99 · ₹950 refunded to your UPI".
- **When cancellation is allowed:**
  - free while searching, and free when the professional is late beyond the threshold;
  - the fee applies after acceptance;
  - not possible once the service is in progress.
- **After cancelling:** the refund status shows on the booking page, and an email is sent.

## W11. Onboarding a professional and getting ready · Admin and Professional · Phase 4
**Story:** As the admin, I want to add a verified professional. As a professional, I want to be set up correctly the first time.
- **Admin creates the professional:** name, mobile, email, gender, skills, base area, travel radius, photo, and "verified on" date. A duplicate email or mobile is rejected with a clear message.
- **Set-password email:** goes to the professional in their language. The link is valid for 72 hours.
- **Readiness checklist:**
  - installed on the Home Screen;
  - notifications allowed, and a test alert received;
  - location allowed;
  - battery-saver guidance for their phone brand.

  **Online** stays disabled until the required items pass, and each failing row says exactly what to do.
- **iPhone below iOS 17:** the panel shows an "update your phone" page; iOS 17+ without a Home Screen install gets a warning that alerts work only while the panel is open (ADR-0017).

## W12. Going online and offline · Professional · Phase 4
**Story:** As a professional, I want to control when I receive jobs.
- **Online:** sets presence to available, and the admin sees it within 10 seconds.
- **Lost connection:** no heartbeat for 60 seconds marks them stale (no new offers). After 5 minutes they go offline and get a notification.
- **Active job:** going offline is blocked, with a message explaining why.

## W13. Managing the catalogue · Admin · Phase 3
**Story:** As the admin, I want to change services and prices myself.
- **Creating or editing a service:**
  - English and Hindi text;
  - at least one tier with a price above 0 and a duration;
  - images (jpg/png/webp, up to 5 MB);
  - required skills;
  - an active switch.
- **Missing Hindi:** shows a warning badge; publishing is still allowed.
- **Two admins editing the same service:** the second save gets a version-conflict dialog, not a silent overwrite.
- **Published changes** appear on the public site within 60 seconds.

## W14. Intervening on a booking · Admin · Phase 8
**Story:** As the admin, I want to spot and fix problems before customers complain.
- **Alerts:** searching for more than 60 seconds, no professional found, late arrival, refund failed, OTP locked. Each one links to the booking.
- **Booking details:**
  - a complete timeline: payment, offers, status changes, refunds, notes;
  - eligible professionals, with distance and status, for a direct offer.
- **Cancelling:** offers a refund choice with a preview. A manual refund requires a reason.
- **Every action** is written to the audit log.

## W15. Managing professionals · Admin · Phases 4 and 8
**Story:** As the admin, I want to keep the professional list accurate and act on performance.
- **Editable fields:** skills, radius and status.
- **Suspending:** signs the professional out everywhere. It is blocked during an active job unless the job is reassigned first.
- **Performance shown:** acceptance rate, completion rate and rating.

## W16. Settings · Admin · Phase 8
**Story:** As the admin, I want to tune business rules safely.
- **Layout:** settings are grouped (Business, Matching, Hours & Areas, Policies, Alerts).
- **Validation:** invalid combinations are rejected, for example an accept window that isn't shorter than the search timeout.
- **Saving:** shows a preview of the effect, creates a new version, applies only to new bookings, and records history.

## W17. Contact · Visitor · Phase 3
**Story:** As a visitor, I want to send a question and know it arrived.
- **Fields:** name, mobile, email and message.
- **Spam protection:** a honeypot plus rate limits.
- **After sending:** an inline confirmation; the admin gets an email and an inbox entry.

## W18. Language switch · Customer and Professional · Phase 2
**Story:** As a user, I want to use the product in Hindi or English.
- **Switching:** EN / हिं changes the language instantly, with no reload. The choice is saved to the profile and the device.
- **Emails** follow the saved language.
- **Under the hood:** `<html lang>` updates; missing Hindi falls back to English; layouts stay intact with Hindi strings up to 40% longer.
