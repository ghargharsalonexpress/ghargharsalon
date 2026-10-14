/**
 * The words of the project flow document (build-flow-document.mjs): every screen's purpose,
 * contents and links, and each stage's steps. Screen ids match the screenshots saved by
 * e2e-tour/project-flow.tour.mjs. Simple English: the document is for the client.
 */

export const APPS = {
  customer: { name: "Customer website", short: "Customer", prefix: "C" },
  pro: { name: "Professional app", short: "Professional", prefix: "P" },
  admin: { name: "Admin (team)", short: "Team", prefix: "A" },
};

export const DOCUMENT = {
  kicker: "[Brand] · home beauty services in 10–15 minutes",
  title: "Project flow document",
  version: "Version 1.0",
  lead: "Every page of the platform, from start to end: how a professional joins, how a customer books and pays, how the job happens on both phones, what comes after, and how the team runs it all. For each stage: the flow, what the person does and what the system does, and a card for every screen.",
  inShort: [
    "**Three apps, one system.** The customer website (English and Hindi), the professional app (Hindi first, installed on the phone) and the admin for your team (English).",
    "**The happy path has 11 stages**, from adding a professional to the team's daily work, plus the other paths: a failed payment, a declined alert, nobody free, and a cancellation.",
    "**Every screen has a code** (C-01 customer, P-01 professional, A-01 team), its purpose, what's on it and where each button leads.",
    "**Real screens** from the working system: nothing here is a mock-up.",
  ],
  note: "“[Brand]” is a placeholder until you confirm the name. People, phone numbers and addresses are test data. Payments use a test payment screen until your Razorpay keys are added, and the live map appears once the Google Maps key is added.",
  system:
    "The customer website, the professional app and the admin all talk to one server. The server holds every booking, finds the nearest free professional, takes payments through Razorpay, sends emails and phone alerts, and pushes every change to the screens that are open, so nobody needs to refresh.",
  happyPath:
    "The stages below follow one booking from start to finish. Stage 1 happens once for each professional; stages 2 to 8 happen for every booking; stages 9 to 11 are what the team and visitors see.",
  otherPaths:
    "The **Other paths** stage shows what people see when a payment fails, when a professional declines an alert, when no professional is free (full refund, automatically) and when a customer cancels. A wrong start code is shown in stage 6.",
};

/** id → { title, purpose, elements, go: [{ when, to | text }] } */
export const SCREENS = {
  // ----- Stage 1: a professional joins -----
  "admin-login": {
    title: "Log in",
    purpose: "One login page for everyone. After logging in, each person lands on their own home: the team on the Dashboard, a professional on the app's Home, a customer on Services.",
    elements: ["Email and password, with a show/hide eye", "“Forgot password?” link", "**Log in** button", "Language switch (EN / हिं)"],
    go: [
      { when: "Team member logs in", to: "admin-dashboard" },
      { when: "“Forgot password?”", to: "site-forgot" },
    ],
  },
  "admin-professionals": {
    title: "Professionals",
    purpose: "Every professional with their state right now, so the team can find, add and check them.",
    elements: ["Search by name, phone, email or area", "Filters: Online now, Not verified, Suspended", "Table: name, skills, now (online, on a job, offline), account, phones receiving alerts", "**Add professional** button"],
    go: [
      { when: "**Add professional**", to: "admin-pro-new" },
      { when: "Open a professional", to: "admin-pro-details" },
    ],
  },
  "admin-pro-new": {
    title: "Add professional",
    purpose: "The team enters an approved applicant. Saving creates the account and emails them a link to set their password.",
    elements: ["Person: full name, mobile, email, gender, app language (Hindi by default)", "Work: skills, base area, how far they travel", "Verification: left unticked until documents are checked", "Photo and an internal note", "**Add and send email**"],
    go: [{ when: "**Add and send email**", to: "admin-pro-details" }],
  },
  "admin-pro-details": {
    title: "Professional details",
    purpose: "One professional's full record: their state right now, the phones that get their alerts, their profile and their account.",
    elements: ["Right now: online state, last signal, last location", "Job alerts: phones receiving alerts, **Send a test alert**", "Profile: mobile, email, skills, base area, verification", "Account: password set or not, **Resend the set-password email**", "Performance and payouts (further down)", "**Edit** and **Suspend**"],
    go: [
      { when: "**Edit**", to: "admin-pro-verify" },
      { when: "Scroll to performance", to: "admin-pro-performance" },
    ],
  },
  "pro-set-password": {
    title: "Set your password",
    purpose: "The emailed link opens this page on the professional's phone. The link works once and for 72 hours; after it, they are logged in.",
    elements: ["New password, with a show/hide eye and a hint", "**Set password and continue** (पासवर्ड बनाएँ और आगे बढ़ें)", "Language switch"],
    go: [{ when: "Password set", to: "pro-home-unverified" }],
  },
  "pro-home-unverified": {
    title: "Home: waiting for verification",
    purpose: "Tells a new professional what is left. They can finish the phone setup while the team checks their documents, but can't go online yet.",
    elements: ["“Your profile is being checked” note", "Online switch, locked, with the reason under it", "Readiness checklist: install the app, job alerts, location, battery", "Bottom tabs: Home, My jobs, Earnings, Profile"],
    go: [{ when: "After the team verifies them", to: "pro-checklist" }],
  },
  "admin-pro-verify": {
    title: "Edit professional: verify",
    purpose: "After checking identity documents and work samples, the team ticks “Identity and work checked”. Only verified professionals can go online.",
    elements: ["The same form as Add professional", "Verification: **Identity and work checked** with a note of what was seen", "Who verified and when is saved (not the documents)", "**Save changes** bar at the bottom"],
    go: [{ when: "**Save changes**", to: "admin-pro-details" }],
  },
  "pro-checklist": {
    title: "Get ready for job alerts",
    purpose: "A one-time setup on the phone, so no job alert is ever missed. The Online switch unlocks when alerts and location work.",
    elements: ["Progress: “3 of 4 done”", "Steps: install the app, turn on job alerts, turn on location, stop the phone closing the app (battery)", "**Send a test alert** (टेस्ट अलर्ट भेजें)"],
    go: [{ when: "**Send a test alert**", to: "pro-test-alert" }],
  },
  "pro-test-alert": {
    title: "Test alert",
    purpose: "Proves that this phone really receives alerts: the server sends a real alert, and the professional confirms it arrived.",
    elements: ["Question: “Did the test alert arrive on your phone?”", "**Yes, it came** (हाँ, आ गया) or **It didn't come** (नहीं आया) with help to fix it", "Ticks for location and battery"],
    go: [{ when: "**Yes, it came**", to: "pro-ready" }],
  },
  "pro-ready": {
    title: "Ready to go online",
    purpose: "Every check has passed: the checklist folds away and the Online switch unlocks.",
    elements: ["Online switch, now enabled", "Status chip at the top: Offline"],
    go: [{ when: "Tap the switch", to: "pro-online" }],
  },
  "pro-online": {
    title: "Online",
    purpose: "The professional is now available. The app shares their location regularly and keeps the screen awake; the nearest job alert opens by itself.",
    elements: ["Switch on, “Online since now”", "Tip: keep this screen open to get jobs fastest", "Green Online chip at the top"],
    go: [{ when: "A customer books nearby", to: "pro-alert" }],
  },
  "pro-login": {
    title: "Log in (professional)",
    purpose: "The same login page in Hindi, for a professional logging in again on their phone.",
    elements: ["Email and password", "Forgot password", "**Log in** (लॉग इन करें)", "Language switch"],
    go: [{ when: "Logged in", to: "pro-online", }],
  },

  // ----- Stage 2: the customer finds a service -----
  "customer-home": {
    title: "Home page",
    purpose: "The first impression: the promise of a verified professional at the door in 10–15 minutes, and a quick way to book.",
    elements: ["Header: logo, cart, menu", "Headline promise and a short line on how it works", "**Book a service** and **How it works**", "Opening hours", "Photo"],
    go: [
      { when: "**Book a service**", to: "customer-services" },
      { when: "Scroll down", to: "customer-home-categories" },
    ],
  },
  "customer-home-categories": {
    title: "Home page: categories",
    purpose: "All categories for women and men, each with how many services it has and the lowest price.",
    elements: ["Women and Men lists", "Each category: photo, name, number of services, “From ₹…”", "How it works, questions and footer further down"],
    go: [{ when: "Tap a category", to: "customer-services" }],
  },
  "customer-services": {
    title: "Services",
    purpose: "The services in a category with clear prices that include taxes. What's on screen stays in the web address, so it can be shared.",
    elements: ["Women / Men switch", "Search box", "Category and filter chips (e.g. Facials, Waxing)", "Each service: name, price, old price, duration, one line, **Add** or **Choose** (for options)"],
    go: [
      { when: "Tap a service", to: "customer-service-sheet" },
      { when: "**Add**", to: "customer-cart" },
    ],
  },
  "customer-service-sheet": {
    title: "Service details",
    purpose: "Everything about one service, in a sheet over the list. It has its own link (e.g. /services/fruit-facial).",
    elements: ["Description and duration", "Platform fee note; prices include taxes", "What's included, good to know, questions", "**Add to cart · ₹649** (or choose an option first)"],
    go: [{ when: "**Add to cart**", to: "customer-service-added" }],
  },
  "customer-service-added": {
    title: "Added to cart",
    purpose: "Confirms the service is in the cart and lets the customer change the quantity or carry on.",
    elements: ["Quantity: remove, number, add", "“In your cart”", "**Go to cart**"],
    go: [{ when: "**Go to cart**", to: "customer-cart" }],
  },
  "customer-cart": {
    title: "Cart",
    purpose: "The order before checkout. Prices are checked again with the server, and any change is shown before the customer can continue.",
    elements: ["Each service with quantity and price", "Total duration", "Price details: services, platform fee, total, taxes included", "“You pay online. Nothing extra at your door.”", "**Checkout** bar at the bottom"],
    go: [
      { when: "**Checkout** (not logged in)", to: "customer-login" },
      { when: "**Checkout** (logged in)", to: "customer-checkout-new" },
    ],
  },

  // ----- Stage 3: account -----
  "customer-login": {
    title: "Log in to book",
    purpose: "Anyone can browse; booking needs an account. The page remembers where the customer was going and returns them there.",
    elements: ["Email and password", "Forgot password", "**Log in**", "“New here? Create an account”"],
    go: [
      { when: "**Log in**", to: "customer-checkout-new" },
      { when: "**Create an account**", to: "customer-signup" },
      { when: "**Forgot password?**", to: "site-forgot" },
    ],
  },
  "customer-signup": {
    title: "Create your account",
    purpose: "A one-minute sign-up. The account is ready at once and the customer goes straight back to checkout.",
    elements: ["Full name, mobile number, email, password (with a hint)", "Agreement to the Terms and Privacy Policy", "**Create account**", "Link back to log in"],
    go: [{ when: "**Create account**", to: "customer-checkout-new" }],
  },
  "site-forgot": {
    title: "Forgot password",
    purpose: "Starts a password reset by email.",
    elements: ["Email", "**Send link**", "Back to log in"],
    go: [{ when: "**Send link**", to: "site-forgot-sent" }],
  },
  "site-forgot-sent": {
    title: "Check your email",
    purpose: "Confirms the link was sent (without saying whether the account exists, for safety). The link works for 30 minutes.",
    elements: ["What to do next and a spam-folder tip", "Use a different email", "Back to log in"],
    go: [{ when: "Open the link in the email", to: "site-reset" }],
  },
  "site-reset": {
    title: "Choose a new password",
    purpose: "Sets a new password from the emailed link and logs the person in. Used or expired links say so and offer a new one.",
    elements: ["New password with a hint", "**Save password**"],
    go: [{ when: "**Save password**", text: "logged in, back to their home" }],
  },

  // ----- Stage 4: checkout -----
  "customer-checkout-new": {
    title: "Checkout (first time)",
    purpose: "Three short sections: where, who, and review and pay. Paying stays locked until there is an address.",
    elements: ["1. Where should we come? **Add address**", "2. Who would you prefer? Any, Female or Male", "3. Review and pay: price lines and total, “Add an address to continue”"],
    go: [{ when: "**Add address**", to: "customer-address" }],
  },
  "customer-address": {
    title: "Add an address",
    purpose: "The address is pinned with the phone's location, so the professional reaches the right door, not just the right street.",
    elements: ["**Use my current location**, then “Location set (accurate to about 12 m)”", "Save as Home, Work or Other", "Flat or house, building (optional), street or sector, landmark (optional), city, PIN code", "**Save address**"],
    go: [{ when: "**Save address**", to: "customer-checkout-ready" }],
  },
  "customer-checkout-ready": {
    title: "Check and pay",
    purpose: "Before paying, the server checks the area, the opening hours and who is free near this address, and shows the arrival time.",
    elements: ["Saved address (default) with edit and add another", "Note for the professional", "Preference: Female selected", "“Professionals are available · Arrives in about 5–11 min”", "Refund promise: full refund if nobody accepts in 2 minutes", "**Pay ₹660**"],
    go: [{ when: "**Pay**", to: "customer-payment" }],
  },
  "customer-payment": {
    title: "Payment",
    purpose: "The payment step. On this test setup it is a test screen; once Razorpay keys are added, Razorpay's window (UPI, cards, netbanking) opens here.",
    elements: ["Booking number and amount", "**Pay ₹660** and **Fail payment** (test only)", "Note about Razorpay"],
    go: [
      { when: "Payment succeeds", to: "customer-searching" },
      { when: "Payment fails", to: "customer-payment-failed" },
    ],
  },

  // ----- Stage 5: finding a professional -----
  "customer-searching": {
    title: "Finding a professional",
    purpose: "Payment is confirmed and the search is on. The page updates by itself the moment someone accepts.",
    elements: ["Status and booking number", "“Contacting professionals near you…” with a timer", "Promise: full refund if nobody is free in 2 minutes", "“Payment of ₹660 received”", "Booking details and **Cancel booking** (free while searching)"],
    go: [
      { when: "A professional accepts", to: "customer-on-the-way" },
      { when: "Nobody accepts in time", to: "customer-no-professional" },
      { when: "**Cancel booking**", to: "customer-cancel" },
    ],
  },
  "pro-alert": {
    title: "New job alert",
    purpose: "Opens full screen by itself, with a sound and a phone notification. The professional sees enough to decide, but not the exact address yet.",
    elements: ["Countdown ring (30 seconds)", "Distance and arrival time", "Services and total duration", "Area only; “full address after you accept”", "What they earn: ₹487", "**Accept job** (काम स्वीकार करें) and **Decline** (मना करें)"],
    go: [
      { when: "**Accept job**", to: "pro-on-the-way" },
      { when: "**Decline**", to: "pro-decline" },
    ],
  },

  // ----- Stage 6: on the way, at the door -----
  "customer-on-the-way": {
    title: "Professional on the way",
    purpose: "Tells the customer who is coming and when, and gives them the start code to share at the door.",
    elements: ["“Meera is on the way”, arrival estimate and expected time", "Professional: name, photo or initials, rating, **Call**", "Start OTP with “share only when your professional arrives”", "Progress timeline with times"],
    go: [{ when: "The professional moves", to: "customer-tracking" }],
  },
  "pro-on-the-way": {
    title: "Go to the customer",
    purpose: "Everything the professional needs to get there: the full address, directions and the customer's note.",
    elements: ["“The customer expects you by …”", "**Navigate** (opens Google Maps)", "**I've arrived** (मैं पते पर हूँ)", "Customer: name, **Call**, full address, landmark, note", "Services, earning, cancel the job, support number"],
    go: [{ when: "**I've arrived**", to: "pro-start" }],
  },
  "customer-tracking": {
    title: "Live tracking",
    purpose: "The professional's position updates live while they travel (every few seconds). A live map appears here once the Google Maps key is added.",
    elements: ["“Updated now”", "“See Meera's location in Google Maps”", "A note if the location pauses"],
    go: [{ when: "The professional arrives", to: "customer-arrived" }],
  },
  "customer-arrived": {
    title: "Professional at the door",
    purpose: "The start code moves to the top so the customer can read it out.",
    elements: ["“Meera has arrived”", "Start OTP: “Meera is at your door. Share this code to start the service.”", "Progress: Professional arrived"],
    go: [{ when: "The code is entered", to: "customer-in-progress" }],
  },
  "pro-start": {
    title: "Start the service",
    purpose: "The service can only start with the customer's 4-digit code. Arrival is checked against the address pin (within 200 m, or the app asks to confirm).",
    elements: ["“Ask Neha for the 4-digit code”", "Four code boxes and attempts left (5)", "**Start service** (सेवा शुरू करें)", "Customer details and note"],
    go: [
      { when: "Right code", to: "pro-in-progress" },
      { when: "Wrong code", to: "pro-wrong-code" },
    ],
  },
  "pro-wrong-code": {
    title: "Wrong code",
    purpose: "A wrong code is refused and the attempts left go down. After 5 wrong tries the code locks and the team is alerted.",
    elements: ["“Wrong code. Ask the customer again.”", "Typing over the boxes replaces the digits", "Attempts left"],
    go: [{ when: "Right code", to: "pro-in-progress" }],
  },

  // ----- Stage 7: the service -----
  "customer-in-progress": {
    title: "Service in progress",
    purpose: "Shows that the service has started and for how long.",
    elements: ["Started at, timer, usual duration", "Professional and **Call**", "Progress timeline"],
    go: [{ when: "The professional completes", to: "customer-completed" }],
  },
  "pro-in-progress": {
    title: "Service in progress (professional)",
    purpose: "The timer runs; the professional completes the job when every service is done.",
    elements: ["Started at, timer, expected time", "**Complete service** (सेवा पूरी करें)", "Customer and services"],
    go: [{ when: "**Complete service**", to: "pro-early-check" }],
  },
  "admin-live": {
    title: "Live board",
    purpose: "Meanwhile the team sees every booking that is searching, every job in progress and every professional online. It refreshes every 10 seconds.",
    elements: ["Searching: bookings still looking, with time left", "Jobs in progress: booking, professional, area, state", "Professionals online: where they are, on a job or free", "Live map once the Maps key is added"],
    go: [{ when: "Open a booking", to: "admin-booking" }],
  },
  "pro-early-check": {
    title: "Finish early?",
    purpose: "If the service ends much sooner than it usually takes, the app asks the professional to confirm first.",
    elements: ["“It's been 1 minute of an expected 45”", "**Not yet** and **Yes, complete it** (हाँ, पूरा करें)"],
    go: [{ when: "**Yes, complete it**", to: "pro-completed" }],
  },
  "customer-completed": {
    title: "Service completed",
    purpose: "Confirms the service, shows what was paid and asks for a rating.",
    elements: ["Paid ₹660, completed at", "How was your service? Five stars and a comment", "Receipt, **View invoice**, **Book again**"],
    go: [{ when: "Rate", to: "customer-rating" }],
  },
  "pro-completed": {
    title: "Job completed",
    purpose: "Confirms the job and the earning straight away. The professional is free for the next alert.",
    elements: ["“Well done: ₹487 added to your earnings”", "Customer, address and services", "Bottom tabs"],
    go: [{ when: "Earnings tab", to: "pro-earnings" }],
  },

  // ----- Stage 8: after the service -----
  "customer-rating": {
    title: "Rate the service",
    purpose: "One rating per booking, with an optional comment. It updates the professional's rating.",
    elements: ["Five stars with a label (“5 stars: excellent”)", "“Anything to add?” comment", "**Submit rating**"],
    go: [{ when: "**Submit rating**", to: "customer-rated" }],
  },
  "customer-rated": {
    title: "Rating saved",
    purpose: "Thanks the customer and shows the rating they gave.",
    elements: ["“Your rating” with the stars and comment", "Receipt and invoice link"],
    go: [{ when: "**View invoice**", to: "customer-invoice" }],
  },
  "customer-invoice": {
    title: "GST invoice",
    purpose: "A numbered tax invoice, ready at once, that can be printed or saved as a PDF.",
    elements: ["Company name, address and GSTIN (your details go here)", "Invoice number, date, booking", "Billed to", "Lines with SAC code and taxable value; GST at 5%; total", "Payment reference", "**Print or save as PDF**, **Back to booking**"],
    go: [{ when: "Account → Bookings", to: "customer-my-bookings" }],
  },
  "customer-my-bookings": {
    title: "My bookings",
    purpose: "Every booking in the customer's account, current ones first.",
    elements: ["Account tabs: Bookings, Addresses, Profile", "Current and Past lists: service, status, number, time, professional, total"],
    go: [
      { when: "Open a booking", to: "customer-completed" },
      { when: "Addresses tab", to: "customer-addresses" },
    ],
  },
  "customer-addresses": {
    title: "Saved addresses",
    purpose: "The customer's addresses, used at checkout.",
    elements: ["Each address with its label and default mark", "Edit, delete, make default", "**Add address**"],
    go: [{ when: "Profile tab", to: "customer-profile" }],
  },
  "customer-profile": {
    title: "Profile",
    purpose: "The customer's details and settings.",
    elements: ["Name, mobile and email", "Language", "Change password", "Log out"],
  },
  "pro-earnings": {
    title: "Earnings",
    purpose: "What the professional has earned today and this week, and what will be paid to their bank.",
    elements: ["Today and This week", "“₹487 to be paid out” (payouts every week)", "Completed jobs: number, time, earning, payout state, service amount and platform share"],
    go: [{ when: "My jobs tab", to: "pro-jobs" }],
  },
  "pro-jobs": {
    title: "My jobs",
    purpose: "The current job and every past job.",
    elements: ["Tabs: Current (अभी के) and Past (पुराने)", "Each job: area, status, number, time, earning"],
    go: [{ when: "Profile tab", to: "pro-profile" }],
  },
  "pro-profile": {
    title: "Profile (professional)",
    purpose: "The professional's details as the team set them up.",
    elements: ["Name and Verified badge", "Skills, base area, contact details", "Language switch and log out"],
  },

  // ----- Stage 9: the team's daily work -----
  "admin-dashboard": {
    title: "Dashboard",
    purpose: "The team's home: what is happening right now and how today is going, with anything that needs attention.",
    elements: ["Right now: searching, jobs in progress, professionals online, open alerts", "Today: bookings, revenue, completed, no-match rate, time to accept", "Alerts that need attention (e.g. no professional found)"],
    go: [
      { when: "**Open live board**", to: "admin-live" },
      { when: "Bookings in the menu", to: "admin-bookings" },
    ],
  },
  "admin-bookings": {
    title: "Bookings",
    purpose: "Every booking, newest first, searchable and ready to export.",
    elements: ["Search by number, name, email or phone", "Views: Active, Searching, Needs attention, Completed, Cancelled or refunded", "From and To dates", "Table: booking, status, customer, professional, area, total", "**Export CSV**"],
    go: [{ when: "Open a booking", to: "admin-booking" }],
  },
  "admin-booking": {
    title: "Booking details",
    purpose: "Everything about one booking in one place, and the actions the team may need.",
    elements: ["Summary: customer, professional, address, preference, note, review, price and GST", "Money: payment, refunds, what is still refundable", "Internal notes (only the team sees them)", "Actions: refund, cancel, send a direct offer or reassign (when they apply)"],
    go: [
      { when: "Scroll down", to: "admin-booking-timeline" },
      { when: "Customer's name", to: "admin-customer" },
    ],
  },
  "admin-booking-timeline": {
    title: "Booking timeline and alerts",
    purpose: "Every step with its time and who did it, and every alert sent to professionals.",
    elements: ["Timeline: awaiting payment, finding a professional, on the way, arrived, in progress, completed", "Offers: professional, round, distance, time, phone alert sent, answer"],
  },
  "admin-customers": {
    title: "Customers",
    purpose: "Every customer, with how many bookings they made and when.",
    elements: ["Search by name, email or phone", "Blocked filter", "Table: customer, phone, bookings, last booking, status"],
    go: [{ when: "Open a customer", to: "admin-customer" }],
  },
  "admin-customer": {
    title: "Customer details",
    purpose: "One customer's profile and bookings. The team can block a customer, with a reason that is recorded.",
    elements: ["Profile: phone, email, language, amount spent", "Their bookings with status", "**Block** / **Unblock**"],
  },
  "admin-payments": {
    title: "Payments",
    purpose: "Every payment, with its status and method.",
    elements: ["Tabs: Payments and Refunds", "Filter by status", "Table: booking, amount, status, method, when"],
    go: [{ when: "Refunds tab", to: "admin-refunds" }],
  },
  "admin-refunds": {
    title: "Refunds",
    purpose: "Every refund: automatic ones (nobody free, cancellations) and ones the team made. A failed refund can be sent again.",
    elements: ["Table: booking, amount, status, why, when, last error", "**Retry** on a failed refund"],
  },
  "admin-reviews": {
    title: "Reviews",
    purpose: "What customers said. Hiding an abusive review also removes it from the professional's rating.",
    elements: ["Filters by stars and hidden", "Each review: stars, comment, booking, customer about professional, date", "**Hide** / **Show again**"],
  },
  "admin-pro-performance": {
    title: "Professional performance",
    purpose: "How a professional is doing, and what they are owed.",
    elements: ["Completed jobs, accept rate, rating, jobs cancelled after accepting", "Owed (not paid out) and paid out so far", "**Mark as paid out** after the bank transfer", "Recent jobs"],
  },
  "admin-settings": {
    title: "Settings",
    purpose: "The business rules in one place. Every change is previewed before saving, applies to new bookings and is recorded.",
    elements: ["Pricing: platform fee, commission, GST, most of one service per booking", "Matching: search radius, professionals alerted per round, time to accept, search time, offline after no signal", "**Review changes** → **Save changes**"],
    go: [{ when: "Scroll down", to: "admin-settings-hours" }],
  },
  "admin-settings-hours": {
    title: "Settings: hours, areas and fees",
    purpose: "When and where bookings are taken, and the cancellation fees.",
    elements: ["Opens at / closes at (India time)", "Unpaid bookings close after, late after, wait before “customer not reachable”, wrong codes before locking", "Service areas", "Cancellation fees, no-show fee, free cancellation when the professional is late"],
  },
  "admin-audit": {
    title: "Audit log",
    purpose: "Every sensitive change by the team, with who, when, and the values before and after.",
    elements: ["Filters by area: bookings, refunds, payments, customers, professionals, reviews, settings, services, categories", "Each entry: what changed, by whom, when, and the values"],
  },

  // ----- Stage 10: catalogue and messages -----
  "admin-services": {
    title: "Services (catalogue)",
    purpose: "Every service on the website, with its prices and whether it is live.",
    elements: ["Search and filters", "Table: service, category, price, options, status", "**New service**"],
    go: [{ when: "Open a service", to: "admin-service-editor" }],
  },
  "admin-service-editor": {
    title: "Edit service",
    purpose: "Everything the customer sees about a service, in English and Hindi, with options and prices.",
    elements: ["Names and descriptions in English and Hindi", "Categories, filters, gender, required skills", "Options with price, old price, duration, sessions", "What's included, good to know, aftercare, questions, photos", "Live or hidden; **Save changes**"],
  },
  "admin-categories": {
    title: "Categories",
    purpose: "The categories shown on the home page and the services page, in their order.",
    elements: ["Each category with its services count", "Order, edit, add"],
  },
  "admin-messages": {
    title: "Messages",
    purpose: "Messages sent from the website's contact page.",
    elements: ["Each message: who, email, when, status", "Filter by status"],
    go: [{ when: "Open a message", to: "admin-message" }],
  },
  "admin-message": {
    title: "Message",
    purpose: "The full message, with the sender's details and a status the team can update.",
    elements: ["Name, email, phone, message", "Mark as read or done"],
  },

  // ----- Stage 11: the rest of the website -----
  "site-about": {
    title: "About us",
    purpose: "What the company does, how professionals are chosen, and the promise.",
    elements: ["What we do, how we choose professionals, our promise", "Join us as a professional"],
    go: [{ when: "“Apply to join”", to: "site-join" }],
  },
  "site-contact": {
    title: "Contact us",
    purpose: "A simple form for questions; the team replies within one working day.",
    elements: ["Full name, email, mobile (optional), message", "**Send message**", "Support email and phone"],
    go: [{ when: "**Send message**", to: "site-contact-sent" }],
  },
  "site-contact-sent": {
    title: "Message sent",
    purpose: "Confirms the message was received and that a copy was emailed to the sender. The team sees it in Messages.",
    elements: ["“Thanks for writing to us”", "A copy was emailed"],
    go: [{ when: "The team opens Messages", to: "admin-messages" }],
  },
  "site-policy": {
    title: "Policy pages",
    purpose: "Terms, Privacy and Cancellation & refund policies. Fees and times are taken from Settings, so the policy always matches the system.",
    elements: ["Policy text with headings", "Live numbers (fees, waiting time, search time)"],
  },
  "site-join": {
    title: "Join as a professional",
    purpose: "Explains how professionals join and leads them to apply.",
    elements: ["Why join", "How joining works: apply, we verify you, start getting jobs", "How to apply"],
  },
  "site-not-found": {
    title: "Page not found",
    purpose: "A friendly page for wrong or old links, with a way back.",
    elements: ["“This page doesn't exist”", "Links back to the home page and services"],
  },

  // ----- Other paths -----
  "customer-payment-failed": {
    title: "Payment didn't go through",
    purpose: "If the payment fails, nothing is charged and the customer can try again at once.",
    elements: ["“The payment didn't go through. No money was taken.”", "**Pay** again"],
    go: [{ when: "Later, from My bookings", to: "customer-awaiting-payment" }],
  },
  "customer-awaiting-payment": {
    title: "Complete your payment",
    purpose: "An unpaid booking is held for a short time (15 minutes) and can be paid from here; if it isn't, it closes by itself and nothing is charged.",
    elements: ["“Payment not received yet. We're holding this booking until …”", "Booking details", "**Pay ₹660**"],
    go: [{ when: "**Pay**", to: "customer-searching" }],
  },
  "pro-decline": {
    title: "Why are you declining?",
    purpose: "Declining is quick; the reason is optional and helps send better jobs.",
    elements: ["Reasons: too far, busy right now, I don't do this service, something else", "**Decline without a reason**"],
    go: [{ when: "Pick a reason", to: "pro-declined" }],
  },
  "pro-declined": {
    title: "Back to waiting",
    purpose: "After declining, the professional is back on Home and still online for the next alert.",
    elements: ["Short note: “You declined the job”", "Online switch still on"],
  },
  "customer-no-professional": {
    title: "No professional was free",
    purpose: "If nobody accepts within the search time, the booking closes and the full amount is refunded automatically. The team gets an alert.",
    elements: ["“We're sorry. No professional was free near you.”", "Your money: refund of ₹660, in progress, and when it arrives", "Booking details"],
  },
  "customer-cancel": {
    title: "Cancel this booking?",
    purpose: "Shows what cancelling costs before the customer decides: free while searching, a fee once someone is on the way, free if they are late.",
    elements: ["What will be refunded, and to where", "Reason: plans changed, taking too long, booked by mistake, something else", "Refund timing (UPI minutes; cards 5–10 working days)", "**Cancel booking** / **Keep booking**"],
    go: [{ when: "**Cancel booking**", to: "customer-cancelled" }],
  },
  "customer-cancelled": {
    title: "Booking cancelled",
    purpose: "Confirms the cancellation and shows the refund.",
    elements: ["“You cancelled this booking at …”", "Your money: refund of ₹660 and its status", "**Browse services**"],
  },
  "pro-offer-withdrawn": {
    title: "Job no longer available",
    purpose: "If the customer cancels while the alert is open, the alert stops ringing and says so at once.",
    elements: ["“This job is no longer available”", "**Back to Home**"],
  },
};

/**
 * Stages in order. `screens` is every screen card in the stage; `storyboard` (optional) is the
 * main line of the flow; `steps` is the step table. `happy` marks the stages of the happy path.
 */
export const STAGES = [
  {
    id: "join",
    label: "Stage 1",
    happy: true,
    title: "A professional joins and goes online",
    who: "Team (admin) and professional (Hindi app)",
    inShort: "The team adds an approved applicant, who gets an email, sets a password on their phone and lands in the Hindi app. Once the team ticks “verified” and the phone passes the alert test, the professional can go **Online**.",
    goal: "The professional is verified, their phone receives alerts, and they are online.",
    screens: ["admin-login", "admin-professionals", "admin-pro-new", "admin-pro-details", "pro-set-password", "pro-home-unverified", "admin-pro-verify", "pro-checklist", "pro-test-alert", "pro-ready", "pro-online", "pro-login"],
    storyboard: ["admin-professionals", "admin-pro-new", "admin-pro-details", "pro-set-password", "pro-home-unverified", "admin-pro-verify", "pro-checklist", "pro-test-alert", "pro-ready", "pro-online"],
    steps: [
      { screen: "admin-professionals", short: "Add professional", user: "The team opens Professionals and taps **Add professional**.", system: "Shows every professional and their state.", next: "admin-pro-new" },
      { screen: "admin-pro-new", short: "Add and send email", user: "Enters name, mobile, email, gender, language, skills and base area; taps **Add and send email**.", system: "Creates the account (not verified yet) and emails a one-time set-password link.", next: "admin-pro-details" },
      { screen: "admin-pro-details", short: "Email link", user: "Checks the record: password not set yet.", system: "Waits for the professional to open the link; the team can resend it.", next: "pro-set-password" },
      { screen: "pro-set-password", short: "Set password", user: "The professional opens the email on their phone and sets a password.", system: "Saves it, logs them in and opens the Hindi app.", next: "pro-home-unverified" },
      { screen: "pro-home-unverified", short: "Team verifies", user: "Sees “your profile is being checked” and can start the phone setup.", system: "Keeps the Online switch locked until the team verifies them.", next: "admin-pro-verify" },
      { screen: "admin-pro-verify", short: "Checklist", user: "The team checks documents, ticks **Identity and work checked** and saves.", system: "Records who verified and when, and unlocks going online.", next: "pro-checklist" },
      { screen: "pro-checklist", short: "Test alert", user: "The professional taps **Send a test alert**.", system: "Sends a real alert to the phone.", next: "pro-test-alert" },
      { screen: "pro-test-alert", short: "Yes, it came", user: "Confirms the alert arrived.", system: "Marks alerts as working; location and battery are already done.", next: "pro-ready" },
      { screen: "pro-ready", short: "Go online", user: "Taps the Online switch.", system: "Checks the phone's location and marks them available.", next: "pro-online" },
      { screen: "pro-online", short: "", user: "Keeps the app open.", system: "Shares their location regularly; the nearest job alert will open by itself.", nextText: "Stage 5: a job alert" },
    ],
  },
  {
    id: "discover",
    label: "Stage 2",
    happy: true,
    title: "The customer finds a service",
    who: "Customer website, on a phone",
    inShort: "From the home page the customer picks a category, opens a service to see what's included and the price, adds it to the cart and checks the total. No account is needed to browse.",
    goal: "The service is in the cart and the customer taps Checkout.",
    screens: ["customer-home", "customer-home-categories", "customer-services", "customer-service-sheet", "customer-service-added", "customer-cart"],
    steps: [
      { screen: "customer-home", short: "Scroll", user: "Opens the website.", system: "Shows the promise, the hours and the categories.", next: "customer-home-categories" },
      { screen: "customer-home-categories", short: "Pick a category", user: "Taps **Salon for women**.", system: "Opens the services of that category.", next: "customer-services" },
      { screen: "customer-services", short: "Open a service", user: "Taps **Fruit facial**.", system: "Opens its details as a sheet, with its own link.", next: "customer-service-sheet" },
      { screen: "customer-service-sheet", short: "Add to cart", user: "Reads what's included and taps **Add to cart · ₹649**.", system: "Adds it to the cart (kept on this phone).", next: "customer-service-added" },
      { screen: "customer-service-added", short: "Go to cart", user: "Taps **Go to cart**.", system: "Shows the cart.", next: "customer-cart" },
      { screen: "customer-cart", short: "", user: "Checks the total and taps **Checkout**.", system: "Re-checks every price with the server; asks to log in if needed.", next: "customer-login" },
    ],
  },
  {
    id: "account",
    label: "Stage 3",
    happy: true,
    title: "The customer signs up or logs in",
    who: "Customer website",
    inShort: "Checkout needs an account. The customer logs in or creates one in a minute, and comes straight back to checkout. A forgotten password is reset by email.",
    goal: "The customer is logged in and back at checkout.",
    screens: ["customer-login", "customer-signup", "site-forgot", "site-forgot-sent", "site-reset"],
    storyboard: ["customer-login", "customer-signup"],
    steps: [
      { screen: "customer-login", short: "Create an account", user: "New here, taps **Create an account**. (A returning customer just logs in.)", system: "Keeps “go back to checkout” in the link.", next: "customer-signup" },
      { screen: "customer-signup", short: "", user: "Enters name, mobile, email and password; taps **Create account**.", system: "Creates the account, logs them in, and returns them to checkout.", next: "customer-checkout-new" },
      { screen: "site-forgot", short: "", user: "Forgot the password: enters the email and taps **Send link**.", system: "Emails a reset link that works for 30 minutes.", next: "site-forgot-sent" },
      { screen: "site-reset", short: "", user: "Opens the link and chooses a new password.", system: "Saves it and logs them in.", nextText: "Their home" },
    ],
  },
  {
    id: "checkout",
    label: "Stage 4",
    happy: true,
    title: "Checkout and payment",
    who: "Customer website",
    inShort: "The customer pins the exact address with the phone's location, chooses who they prefer, sees that professionals are free nearby and the arrival time, and pays online.",
    goal: "The payment is received and the booking starts searching.",
    screens: ["customer-checkout-new", "customer-address", "customer-checkout-ready", "customer-payment"],
    steps: [
      { screen: "customer-checkout-new", short: "Add address", user: "Taps **Add address**.", system: "Opens the address form.", next: "customer-address" },
      { screen: "customer-address", short: "Save address", user: "Taps **Use my current location**, fills the flat, street, city and PIN; saves.", system: "Stores the address with the exact pin.", next: "customer-checkout-ready" },
      { screen: "customer-checkout-ready", short: "Pay", user: "Adds a note, chooses Female, checks the total; taps **Pay ₹660**.", system: "Checks area, hours and who is free (with arrival time), creates the booking and opens the payment.", next: "customer-payment" },
      { screen: "customer-payment", short: "", user: "Pays (UPI, card or netbanking once Razorpay is on).", system: "Verifies the payment with Razorpay, then starts the search.", next: "customer-searching" },
    ],
  },
  {
    id: "matching",
    label: "Stage 5",
    happy: true,
    title: "Finding a professional",
    who: "Customer and professional, side by side",
    inShort: "The server alerts the nearest free professionals who match (skill, preference). The alert opens full screen with a sound; the first to accept gets the job. Everyone else's alert closes at once.",
    goal: "A professional accepts within seconds.",
    screens: ["customer-searching", "pro-alert"],
    steps: [
      { screen: "customer-searching", short: "Alert sent", user: "Waits on the booking page (or leaves; an email and the page keep them updated).", system: "Finds the nearest free professionals and alerts them, round by round, for up to 2 minutes.", next: "pro-alert" },
      { screen: "pro-alert", short: "", user: "The professional sees distance, services and earning; taps **Accept job**.", system: "Gives the job to the first to accept, closes the other alerts, and tells the customer.", next: "pro-on-the-way" },
    ],
  },
  {
    id: "arrival",
    label: "Stage 6",
    happy: true,
    title: "On the way and at the door",
    who: "Customer and professional",
    inShort: "The professional gets the full address and directions; the customer sees who is coming, when, and follows them live. At the door the customer shares a 4-digit code, and only that code starts the service.",
    goal: "The right code is entered and the service starts.",
    screens: ["customer-on-the-way", "pro-on-the-way", "customer-tracking", "customer-arrived", "pro-start", "pro-wrong-code"],
    storyboard: ["pro-on-the-way", "customer-on-the-way", "customer-tracking", "customer-arrived", "pro-start"],
    steps: [
      { screen: "pro-on-the-way", short: "Travels", user: "Taps **Navigate** and travels.", system: "Shares the professional's position every few seconds while the app is open.", next: "customer-on-the-way" },
      { screen: "customer-on-the-way", short: "Moves", user: "Sees the arrival time, the professional and the start code.", system: "Updates the arrival estimate.", next: "customer-tracking" },
      { screen: "customer-tracking", short: "Arrives", user: "Follows the professional live.", system: "Shows each new position at once.", next: "customer-arrived" },
      { screen: "customer-arrived", short: "Code", user: "Reads out the start code.", system: "Moves the code to the top when the professional taps **I've arrived** (checked against the address pin).", next: "pro-start" },
      { screen: "pro-start", short: "", user: "Types the 4 digits and taps **Start service**.", system: "Checks the code; a wrong code is refused (5 tries, then the team is alerted).", next: "pro-in-progress" },
    ],
  },
  {
    id: "service",
    label: "Stage 7",
    happy: true,
    title: "The service",
    who: "Customer, professional and team",
    inShort: "Both phones show the service running with a timer, and the team sees the job on the live board. When the professional completes it, the earning is added and the customer is asked for a rating.",
    goal: "The job is completed on both phones.",
    screens: ["customer-in-progress", "pro-in-progress", "admin-live", "pro-early-check", "customer-completed", "pro-completed"],
    storyboard: ["pro-in-progress", "customer-in-progress", "admin-live", "pro-early-check", "pro-completed", "customer-completed"],
    steps: [
      { screen: "pro-in-progress", short: "Both see it", user: "Does the service.", system: "Runs the timer on both phones.", next: "customer-in-progress" },
      { screen: "customer-in-progress", short: "Team sees it", user: "Relaxes.", system: "Shows the job on the team's live board.", next: "admin-live" },
      { screen: "admin-live", short: "Complete", user: "The team keeps an eye on live jobs.", system: "Refreshes every 10 seconds.", next: "pro-early-check" },
      { screen: "pro-early-check", short: "Confirm", user: "The professional taps **Complete service** (and confirms if it's early).", system: "Asks to confirm when the job is much shorter than usual.", next: "pro-completed" },
      { screen: "pro-completed", short: "Customer told", user: "Sees the earning.", system: "Adds the earning, frees the professional for the next job, and tells the customer.", next: "customer-completed" },
      { screen: "customer-completed", short: "", user: "Sees the service completed.", system: "Creates the invoice and asks for a rating.", next: "customer-rating" },
    ],
  },
  {
    id: "after",
    label: "Stage 8",
    happy: true,
    title: "After the service",
    who: "Customer and professional",
    inShort: "The customer rates the service, gets a GST invoice and finds every booking in their account. The professional sees their earnings and past jobs.",
    goal: "The booking is rated and invoiced; the earning is visible.",
    screens: ["customer-rating", "customer-rated", "customer-invoice", "customer-my-bookings", "customer-addresses", "customer-profile", "pro-earnings", "pro-jobs", "pro-profile"],
    storyboard: ["customer-rating", "customer-rated", "customer-invoice", "customer-my-bookings", "pro-earnings", "pro-jobs"],
    steps: [
      { screen: "customer-rating", short: "Submit", user: "Picks 5 stars, adds a comment, taps **Submit rating**.", system: "Saves the review and updates the professional's rating.", next: "customer-rated" },
      { screen: "customer-rated", short: "Invoice", user: "Taps **View invoice**.", system: "Opens the numbered GST invoice.", next: "customer-invoice" },
      { screen: "customer-invoice", short: "Account", user: "Prints or saves it as a PDF.", system: "—", next: "customer-my-bookings" },
      { screen: "customer-my-bookings", short: "Professional", user: "Finds the booking later in the account.", system: "Lists current and past bookings.", next: "pro-earnings" },
      { screen: "pro-earnings", short: "My jobs", user: "The professional checks today's earnings.", system: "Shows what is owed and paid out weekly.", next: "pro-jobs" },
      { screen: "pro-jobs", short: "", user: "Checks past jobs.", system: "Lists each job with its earning.", nextText: "Back to Home for the next alert" },
    ],
  },
  {
    id: "team",
    label: "Stage 9",
    happy: true,
    title: "The team's daily work",
    who: "Team (admin), on a computer",
    inShort: "The team watches the day on the dashboard, finds any booking, sees its full timeline and money, helps customers and professionals, issues refunds, hides abusive reviews, tracks payouts and changes the business rules, with every change recorded.",
    goal: "The team can answer any question about any booking, and act on it.",
    screens: ["admin-dashboard", "admin-bookings", "admin-booking", "admin-booking-timeline", "admin-customers", "admin-customer", "admin-payments", "admin-refunds", "admin-reviews", "admin-pro-performance", "admin-settings", "admin-settings-hours", "admin-audit"],
    storyboard: ["admin-dashboard", "admin-bookings", "admin-booking", "admin-customer", "admin-refunds", "admin-audit"],
    steps: [
      { screen: "admin-dashboard", short: "Bookings", user: "Opens the dashboard in the morning.", system: "Shows right now and today, and anything needing attention.", next: "admin-bookings" },
      { screen: "admin-bookings", short: "Open one", user: "Searches a booking by number, name or phone.", system: "Filters instantly; can export to a spreadsheet.", next: "admin-booking" },
      { screen: "admin-booking", short: "Customer", user: "Reads the summary, adds an internal note; refunds or cancels if needed.", system: "Records every action in the audit log and tells the customer.", next: "admin-customer" },
      { screen: "admin-customer", short: "Money", user: "Checks the customer's history; blocks if needed.", system: "Records the block with its reason.", next: "admin-refunds" },
      { screen: "admin-refunds", short: "Audit", user: "Checks refunds; retries a failed one.", system: "Sends the refund again through Razorpay.", next: "admin-audit" },
      { screen: "admin-audit", short: "", user: "Reviews what changed.", system: "Shows who changed what, when, before and after.", nextText: "—" },
    ],
  },
  {
    id: "catalogue",
    label: "Stage 10",
    happy: true,
    title: "Catalogue and messages",
    who: "Team (admin)",
    inShort: "The team keeps the services, prices and categories up to date in English and Hindi, and answers messages from the contact page.",
    goal: "The website always shows the right services and prices.",
    screens: ["admin-services", "admin-service-editor", "admin-categories", "admin-messages", "admin-message"],
    steps: [
      { screen: "admin-services", short: "Edit", user: "Opens a service.", system: "Shows its editor.", next: "admin-service-editor" },
      { screen: "admin-service-editor", short: "", user: "Changes a price or text and saves.", system: "Updates the website at once; carts re-check prices.", nextText: "Live on the website" },
      { screen: "admin-messages", short: "Open", user: "Opens a new message.", system: "Shows the message and its sender.", next: "admin-message" },
    ],
  },
  {
    id: "website",
    label: "Stage 11",
    happy: true,
    title: "The rest of the website",
    who: "Visitors",
    inShort: "About, contact, policies, joining as a professional, and a friendly page for wrong links.",
    goal: "Every visitor question has a page.",
    screens: ["site-about", "site-contact", "site-contact-sent", "site-policy", "site-join", "site-not-found"],
    steps: [
      { screen: "site-contact", short: "Send", user: "A visitor writes a question and taps **Send message**.", system: "Saves it for the team and emails the visitor a copy.", next: "site-contact-sent" },
      { screen: "site-contact-sent", short: "", user: "Sees the confirmation.", system: "The message appears in the team's Messages.", next: "admin-messages" },
    ],
  },
  {
    id: "other",
    label: "Other paths",
    happy: false,
    title: "When things don't go to plan",
    who: "Customer and professional",
    inShort: "A failed payment charges nothing and can be retried; an unpaid booking closes by itself. A professional can decline an alert. If nobody is free, the customer is refunded in full automatically. A customer can cancel for free while the search is on, and the professional's alert stops at once.",
    goal: "Nobody is ever stuck, and money always goes back automatically when a booking can't happen.",
    screens: ["customer-payment-failed", "customer-awaiting-payment", "pro-decline", "pro-declined", "customer-no-professional", "customer-cancel", "customer-cancelled", "pro-offer-withdrawn"],
    steps: [
      { screen: "customer-payment-failed", short: "My bookings", user: "The payment fails (or the customer closes it).", system: "Charges nothing; the booking waits 15 minutes for payment.", next: "customer-awaiting-payment" },
      { screen: "customer-awaiting-payment", short: "Pay", user: "Pays from the booking page.", system: "Starts the search.", next: "customer-searching" },
      { screen: "pro-decline", short: "Reason", user: "A professional declines the alert, with or without a reason.", system: "Alerts the next professionals.", next: "pro-declined" },
      { screen: "customer-no-professional", short: "", user: "Nobody accepts in time.", system: "Closes the booking, refunds the full amount and alerts the team.", nextText: "Refund in Admin → Refunds" },
      { screen: "customer-cancel", short: "Cancel", user: "The customer cancels while the search is on.", system: "Shows the refund (free while searching), then cancels and refunds.", next: "customer-cancelled" },
      { screen: "pro-offer-withdrawn", short: "", user: "The professional's open alert…", system: "…stops ringing and says the job is no longer available.", nextText: "Back to Home" },
    ],
  },
];
