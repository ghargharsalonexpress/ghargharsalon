import { readFileSync } from "node:fs";

/**
 * The happy path (plan Part E), written once for two outputs:
 * - `npm run demo` (live-demo.mjs) plays it on the running dev app with a caption per step;
 * - `npm run walkthrough` (e2e-tour + build-walkthrough.mjs) screenshots it into a PDF.
 *
 * It only does what a person would do on screen, and finds buttons by the app's own strings
 * (src/i18n/locales), so the professional's Hindi screens are driven by their Hindi labels.
 * The runner passes a `stage()` hook; every step that's worth showing calls it once.
 */

const LOCALES = new URL("../../src/i18n/locales/", import.meta.url);
const bundles = new Map();

function bundle(lang, ns) {
  const key = `${lang}/${ns}`;
  if (!bundles.has(key)) bundles.set(key, JSON.parse(readFileSync(new URL(`${lang}/${ns}.json`, LOCALES), "utf8")));
  return bundles.get(key);
}

/** `t("pro:job.arrived")` in one language; namespace `common` when none is given. The admin is English only. */
export function translator(lang) {
  // Some keys contain dots themselves (audit "booking.note"), so the longest key that exists wins.
  const find = (node, parts) => {
    if (parts.length === 0) return node;
    if (!node || typeof node !== "object") return undefined;
    for (let end = parts.length; end >= 1; end -= 1) {
      const key = parts.slice(0, end).join(".");
      const found = key in node ? find(node[key], parts.slice(end)) : undefined;
      if (found !== undefined) return found;
    }
    return undefined;
  };
  return (path, vars = {}) => {
    const [ns, key] = path.includes(":") ? path.split(":") : ["common", path];
    const root = bundle(ns === "admin" ? "en" : lang, ns);
    const lookup = (dotted) => find(root, dotted.split("."));
    let text = vars.count === undefined ? undefined : lookup(`${key}_${vars.count === 1 ? "one" : "other"}`);
    text ??= lookup(key);
    if (typeof text !== "string") throw new Error(`No ${lang} string for ${ns}:${key}`);
    return text.replace(/\{\{(\w+)\}\}/g, (_, name) => String(vars[name] ?? ""));
  };
}

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const startsWith = (text) => new RegExp(`^${escape(text)}`);
const firstName = (name) => name.trim().split(/\s+/)[0];

/**
 * A row's open button in an admin table: "Open BK-1001" on a wide screen; on a narrower one the
 * table turns into cards whose button is named by its contents (which include the same text).
 */
const rowButton = (page, label, text) => page.getByRole("button", { name: label, exact: true }).or(page.getByRole("button", { name: new RegExp(`^${escape(text)}\\b`) })).first();

/** The five parts, in order. */
export const PARTS = {
  A: { title: "The professional gets ready", who: "Professional app, in Hindi" },
  B: { title: "The customer books and pays", who: "Customer website on a phone, in English" },
  C: { title: "The job, live on both phones", who: "Customer and professional side by side" },
  D: { title: "After the job", who: "Rating, invoice, history and earnings" },
  E: { title: "The team's view", who: "Admin on a computer" },
};

/** Team login (admins): email and password, typed in. */
async function logInAsTeam(page, account, t) {
  await page.getByLabel(t("auth:team.email"), { exact: true }).fill(account.email);
  await page.getByLabel(t("auth:team.password"), { exact: true }).fill(account.password);
}

/**
 * Customers and professionals (ADR-0020): mobile number → "Get OTP" → the code screen. The code
 * comes from `codeFor` (the E2E stack's test route), or from the "Test code" line a local demo
 * server shows (SMS_DEV_CODE=1). Returns the code; typing it signs the person in.
 */
async function askForCode(page, account, t, codeFor) {
  await page.getByLabel(t("auth:login.phone"), { exact: true }).fill(account.phone);
  await page.getByRole("button", { name: t("auth:login.submit") }).click();
  const first = page.locator('input[autocomplete="one-time-code"]');
  await first.waitFor({ timeout: 30_000 });
  if (codeFor) return codeFor(account.phone);
  const line = page.getByText(startsWith(t("auth:code.devCode", { code: "" }).split(":")[0]));
  const text = await line.textContent({ timeout: 10_000 }).catch(() => null);
  const code = /(\d{6})\s*$/.exec(text ?? "")?.[1];
  if (!code) throw new Error("No test code on the login screen. Set SMS_DEV_CODE=1 (with SMS_TRANSPORT=log) in apps/api/.env and restart the API.");
  return code;
}

async function typeCode(page, code, typeDelay) {
  await page.locator('input[autocomplete="one-time-code"]').click();
  await page.keyboard.type(code, { delay: typeDelay });
}

/**
 * Runs the whole booking: the professional goes online, the customer books and pays, the
 * professional accepts, travels, arrives and starts with the customer's code, completes; the
 * customer rates and opens the invoice; the admin walks through every operations screen.
 *
 * ctx:
 * - customer, pro: Playwright pages (separate browser contexts); proContext moves the professional.
 * - openAdmin(): resolves to the admin page, opened when the team first looks (during the job).
 * - accounts: { customer, pro } with phone and name; { admin } with email and password.
 * - codeFor(phone): optional; the SMS login code (without it, the local demo's on-screen code).
 * - service: { slug, category, name }; preference: "female" | "any";
 * - address: { house, street, landmark, city, pincode, note }; route: points to the door (the last
 *   one within 200 m of the address pin).
 * - stage({ id, part, title, caption, shots: [{ who, focus?, block? }] }): show or capture a step.
 * - wait(ms), stepGapMs, typeDelay, review, adminNote, log(text), afterJob(): optional.
 */
export async function runHappyPath(ctx) {
  const { customer: cp, pro: pp, proContext, accounts, service, address, route, stage } = ctx;
  const en = translator("en");
  const hi = translator("hi");
  const wait = ctx.wait ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const typeDelay = ctx.typeDelay ?? 40;
  const proName = firstName(accounts.pro.name);
  const customerName = firstName(accounts.customer.name);
  const live = { timeout: 30_000 };

  // ---------- A. The professional gets ready (Hindi) ----------
  await pp.goto("/login");
  await typeCode(pp, await askForCode(pp, accounts.pro, hi, ctx.codeFor), typeDelay);
  await pp.waitForURL(/\/pro$/);
  const toggle = pp.getByRole("switch");
  await toggle.waitFor();
  if ((await toggle.getAttribute("aria-checked")) !== "true") {
    await pp
      .getByRole("switch", { disabled: false })
      .waitFor({ timeout: 20_000 })
      .catch(() => {
        throw new Error("The professional's Online switch stayed locked. Check that VAPID keys are set in apps/api/.env and the professional is verified.");
      });
    await stage({
      id: "a1-pro-home",
      part: "A",
      title: "Ready for job alerts",
      caption: "The professional's app is in Hindi. The Online switch unlocks only once job alerts and location work on their phone, as they do here.",
      shots: [{ who: "pro" }],
    });
    await toggle.click();
  }
  await pp.getByRole("switch", { checked: true }).waitFor();
  await stage({
    id: "a2-pro-online",
    part: "A",
    title: "Online with one tap",
    caption: "Now job alerts nearby reach them. The app shares their location while online and keeps the screen awake.",
    shots: [{ who: "pro" }],
  });

  // ---------- B. The customer books and pays (English) ----------
  await cp.bringToFront();
  await cp.goto("/");
  await cp.getByRole("heading", { level: 1 }).waitFor();
  await cp.locator(`a[href="/services?category=${service.category}"]`).first().waitFor();
  await stage({
    id: "b1-home",
    part: "B",
    title: "Home page",
    caption: "The promise up front: a verified professional at the door in 10–15 minutes. Services are grouped by category.",
    shots: [{ who: "customer" }],
  });

  await cp.locator(`a[href="/services?category=${service.category}"]`).first().click();
  const serviceLink = cp.getByRole("link", { name: service.name, exact: true });
  await serviceLink.first().waitFor();
  await stage({
    id: "b2-services",
    part: "B",
    title: "Services and prices",
    caption: "Each category lists its services with clear prices that include taxes. Filters and search help find one fast.",
    shots: [{ who: "customer" }],
  });

  await serviceLink.first().click();
  const sheet = cp.getByRole("dialog", { name: service.name });
  const addToCart = sheet.getByRole("button", { name: startsWith(en("public:detail.addToCart", { price: "" })) });
  await addToCart.and(cp.locator(":enabled")).waitFor();
  await stage({
    id: "b3-service",
    part: "B",
    title: "Service details",
    caption: "A service opens as a sheet: what's included, how long it takes, and the price. One tap adds it to the cart.",
    shots: [{ who: "customer" }],
  });

  await addToCart.click();
  await sheet.getByText(en("public:detail.goToCart"), { exact: true }).click();
  await cp.waitForURL(/\/cart$/);
  const toCheckout = cp
    .getByRole("link", { name: new RegExp(`^(${escape(en("public:cart.checkout"))}|${escape(en("public:cart.checkoutShort"))})$`) })
    .filter({ visible: true })
    .first();
  await toCheckout.waitFor(live);
  await stage({
    id: "b4-cart",
    part: "B",
    title: "Cart",
    caption: "The cart checks the latest price with the server. One small platform fee per booking, and nothing extra at the door.",
    shots: [{ who: "customer" }],
  });

  await toCheckout.click();
  await cp.waitForURL(/\/login\?/);
  const customerCode = await askForCode(cp, accounts.customer, en, ctx.codeFor);
  await stage({
    id: "b5-login",
    part: "B",
    title: "Log in with a mobile number",
    caption: "Anyone can browse. To book, the customer types their mobile number and the 6-digit code that comes by SMS (a new number just adds a name), then comes straight back to checkout.",
    shots: [{ who: "customer" }],
  });
  await typeCode(cp, customerCode, typeDelay);
  await cp.waitForURL(/\/checkout$/);

  const addAddress = cp.getByRole("button", { name: en("booking:checkout.addAddress"), exact: true });
  const editAddress = cp.getByRole("button", { name: en("booking:checkout.editAddress"), exact: true });
  await addAddress.or(editAddress).first().waitFor(live);
  if (await addAddress.isVisible()) {
    await addAddress.click();
    const dialog = cp.getByRole("dialog", { name: en("booking:address.newTitle") });
    await dialog.getByRole("button", { name: en("booking:address.pinUse") }).click();
    const pinSet = dialog.getByText(startsWith(en("booking:address.pinSet", { accuracy: "" }).split("(")[0].trim()));
    await pinSet.waitFor(live);
    await dialog.getByLabel(en("booking:address.house")).pressSequentially(address.house, { delay: typeDelay });
    await dialog.getByLabel(en("booking:address.street")).pressSequentially(address.street, { delay: typeDelay });
    await dialog.getByLabel(en("booking:address.landmark")).pressSequentially(address.landmark, { delay: typeDelay });
    await dialog.getByLabel(en("booking:address.city")).fill(address.city);
    await dialog.getByLabel(en("booking:address.pincode")).fill(address.pincode);
    await stage({
      id: "b6-address",
      part: "B",
      title: "The exact address",
      caption: "The first address is pinned with the phone's location, so the professional reaches the right door.",
      shots: [{ who: "customer", focus: pinSet, block: "start" }],
    });
    await dialog.getByRole("button", { name: en("booking:address.save") }).click();
    await dialog.waitFor({ state: "hidden" });
  }

  await cp.getByLabel(en("booking:checkout.note")).fill(address.note);
  if (ctx.preference === "female") {
    // The segment's visible label (the radio inside it is visually hidden).
    const female = cp.getByRole("radio", { name: en("booking:checkout.female"), exact: true });
    await cp.locator("label").filter({ has: female }).click();
    await cp.getByRole("radio", { name: en("booking:checkout.female"), exact: true, checked: true }).waitFor();
  }
  const available = cp.getByText(en("booking:checkout.quote.availableTitle"), { exact: true });
  const problems = ["outside_area", "outside_hours", "none_free", "skill_unavailable"].map((reason) => en(`booking:checkout.quote.${reason}.title`));
  const problem = cp.getByText(new RegExp(`^(${problems.map(escape).join("|")})$`));
  await available.or(problem).first().waitFor(live);
  if (!(await available.isVisible())) throw new Error(`Checkout says: "${await problem.first().textContent()}"`);
  await stage({
    id: "b7-checkout",
    part: "B",
    title: "Check and pay",
    caption: "The customer can ask for a female professional, sees that someone is free nearby and when they'll arrive, then pays.",
    shots: [{ who: "customer", focus: available }],
  });

  await cp.getByRole("button", { name: /^Pay ₹[\d,.]+$/ }).filter({ visible: true }).first().click();
  const payment = cp.getByRole("dialog", { name: en("booking:testPay.title") });
  await payment.waitFor();
  await stage({
    id: "b8-payment",
    part: "B",
    title: "Payment",
    caption: "A test payment screen on this setup. Razorpay (UPI, cards, netbanking) appears here once its keys are added.",
    shots: [{ who: "customer" }],
  });
  await payment.getByRole("button", { name: /^Pay ₹[\d,.]+$/ }).click();

  // ---------- C. The job, live on both phones ----------
  await cp.waitForURL(/\/bookings\/[a-f0-9]{24}$/, live);
  await cp.getByRole("heading", { name: en("booking:title.searching"), level: 1 }).waitFor(live);
  const meta = (await cp.getByText(/^BK-\d+ · /).first().textContent()) ?? "";
  const bookingNumber = /BK-\d+/.exec(meta)?.[0] ?? "";
  ctx.log?.(`Booking ${bookingNumber} paid; waiting for the job alert…`);

  await pp.bringToFront();
  await pp.waitForURL(/\/pro\/offers\/[a-f0-9]{24}/, { timeout: 45_000 });
  const accept = pp.getByRole("button", { name: hi("pro:offer.accept") });
  await accept.waitFor();
  await stage({
    id: "c1-alert",
    part: "C",
    title: "A job alert in seconds",
    caption: "Payment done, the search starts. The nearest free professional gets a full-screen alert with a sound and a countdown. The exact address stays hidden until they accept.",
    shots: [{ who: "customer" }, { who: "pro" }],
  });

  await accept.click();
  await pp.waitForURL(/\/pro\/jobs\/[a-f0-9]{24}$/);
  await pp.getByRole("heading", { name: hi("pro:job.title.accepted", { name: customerName }), level: 1 }).waitFor();
  await cp.bringToFront();
  await cp.getByRole("heading", { name: en("booking:title.accepted", { name: proName }), level: 1 }).waitFor(live);
  await stage({
    id: "c2-accepted",
    part: "C",
    title: "Accepted",
    caption: "One tap to accept. The professional now sees the address, the customer's note and directions. The customer sees who is coming, and when.",
    shots: [{ who: "customer" }, { who: "pro" }],
  });

  // The professional walks over: the panel shares each move (every 5 s or 25 m).
  await pp.bringToFront();
  for (const point of route.slice(0, -1)) {
    await proContext.setGeolocation(point);
    await wait(ctx.stepGapMs ?? 1_500);
  }
  await cp.bringToFront();
  // A position from the walk just now, not an older one ("Updated 4 seconds ago").
  const updatedPrefix = en("map.updatedAgo", { time: "" }).trim();
  await cp.getByText(new RegExp(`^${escape(updatedPrefix)} (now|\\d seconds? ago)$`)).first().waitFor(live);
  const updated = cp.getByText(startsWith(updatedPrefix));
  await stage({
    id: "c3-tracking",
    part: "C",
    title: "Live tracking",
    caption: "As the professional moves, the customer's page follows them. A live map appears here once the Google Maps key is added.",
    shots: [{ who: "customer", focus: updated.first() }],
  });

  await pp.bringToFront();
  await proContext.setGeolocation(route.at(-1));
  await wait(ctx.stepGapMs ?? 1_500);
  await pp.getByRole("button", { name: hi("pro:job.arrived") }).click();
  const startHeading = pp.getByRole("heading", { name: hi("pro:job.title.arrived"), level: 1 });
  const far = pp.getByRole("dialog", { name: hi("pro:job.farTitle") });
  await startHeading.or(far).first().waitFor();
  if (await far.isVisible()) await far.getByRole("button", { name: hi("pro:job.farConfirm") }).click();
  await startHeading.waitFor();
  await cp.bringToFront();
  await cp.getByRole("heading", { name: en("booking:title.arrived", { name: proName }), level: 1 }).waitFor(live);
  const otp = cp.getByLabel(new RegExp(`^${escape(en("otp.startTitle"))}: \\d \\d \\d \\d$`));
  const code = ((await otp.textContent()) ?? "").replace(/\D/g, "");
  if (!/^\d{4}$/.test(code)) throw new Error("Couldn't read the start code on the customer's page.");
  const firstDigit = pp.getByLabel(hi("otp.digit", { index: 1, count: 4 }));
  await pp.bringToFront();
  await firstDigit.click();
  await pp.keyboard.type(code, { delay: Math.max(typeDelay, 60) });
  await stage({
    id: "c4-arrived",
    part: "C",
    title: "At the door",
    caption: "The professional taps “I've arrived”. The customer shares a 4-digit code (OTP) and the professional enters it: the service can only start with it.",
    shots: [
      { who: "customer", focus: otp },
      { who: "pro", focus: firstDigit },
    ],
  });
  await pp.getByRole("button", { name: hi("pro:job.start"), exact: true }).click();
  await pp.getByRole("heading", { name: hi("pro:job.title.in_progress"), level: 1 }).waitFor();
  await cp.bringToFront();
  await cp.getByRole("heading", { name: en("booking:title.in_progress"), level: 1 }).waitFor(live);
  await stage({
    id: "c5-in-progress",
    part: "C",
    title: "Service in progress",
    caption: "The right code starts the service. Both phones show how long it has been running.",
    shots: [{ who: "customer" }, { who: "pro" }],
  });

  // Meanwhile the team watches it on the admin's live board.
  const ap = await ctx.openAdmin();
  await ap.goto("/admin/login");
  await logInAsTeam(ap, accounts.admin, en);
  await ap.getByRole("button", { name: en("auth:team.submit") }).click();
  await ap.waitForURL(/\/admin$/);
  await ap.goto("/admin/live");
  await ap.getByRole("heading", { name: en("admin:live.title"), level: 1 }).waitFor();
  await ap.getByRole("link", { name: bookingNumber }).first().waitFor(live);
  await stage({
    id: "c6-live-board",
    part: "C",
    title: "The team sees it live",
    caption: "Meanwhile the admin's live board lists every job in progress, any booking still searching, and the professionals online. It refreshes every 10 seconds.",
    shots: [{ who: "admin" }],
  });

  await pp.bringToFront();
  await pp.getByRole("button", { name: hi("pro:job.complete") }).click();
  const completedHeading = pp.getByRole("heading", { name: hi("pro:job.title.completed"), level: 1 });
  const early = pp.getByRole("dialog", { name: hi("pro:job.earlyTitle") });
  await early.or(completedHeading).first().waitFor();
  if (await early.isVisible()) {
    await stage({
      id: "c7-early",
      part: "C",
      title: "A check before finishing",
      caption: "Finishing much sooner than the service usually takes? The app asks the professional to confirm first.",
      shots: [{ who: "pro" }],
    });
    await early.getByRole("button", { name: hi("pro:job.earlyConfirm") }).click();
  }
  await completedHeading.waitFor();
  await cp.bringToFront();
  await cp.getByRole("heading", { name: en("booking:title.completed"), level: 1 }).waitFor(live);
  await stage({
    id: "c8-completed",
    part: "C",
    title: "Done",
    caption: "The job is complete. The professional's earning is added at once, and the customer is asked for a rating.",
    shots: [{ who: "customer" }, { who: "pro" }],
  });
  await ctx.afterJob?.();

  // ---------- D. After the job ----------
  // The fifth star (a label around a visually hidden radio).
  const fiveStars = cp.getByRole("radio", { name: en("booking:review.stars.5"), exact: true });
  await cp.locator("label").filter({ has: fiveStars }).click();
  await cp.getByRole("radio", { name: en("booking:review.stars.5"), exact: true, checked: true }).waitFor();
  const comment = cp.getByLabel(en("booking:review.comment"));
  await comment.pressSequentially(ctx.review ?? "On time, careful and very polite.", { delay: typeDelay });
  await stage({
    id: "d1-rating",
    part: "D",
    title: "Rating",
    caption: "The customer rates the service once, with an optional comment. It updates the professional's rating.",
    shots: [{ who: "customer", focus: comment }],
  });
  await cp.getByRole("button", { name: en("booking:review.submit") }).click();
  await cp.getByText(en("booking:review.thanks")).first().waitFor();

  await cp.getByRole("link", { name: en("booking:completed.invoice") }).click();
  await cp.getByRole("heading", { name: en("booking:invoice.title"), level: 1 }).waitFor();
  await stage({
    id: "d2-invoice",
    part: "D",
    title: "GST invoice",
    caption: "A numbered tax invoice is ready at once. It can be printed or saved as a PDF.",
    shots: [{ who: "customer" }],
  });

  await cp.goto("/account/bookings");
  await cp.getByRole("link", { name: new RegExp(escape(service.name)) }).first().waitFor();
  await stage({
    id: "d3-bookings",
    part: "D",
    title: "My bookings",
    caption: "Every booking stays in the customer's account, with its status and receipt.",
    shots: [{ who: "customer" }],
  });

  await pp.bringToFront();
  await pp.getByRole("link", { name: hi("pro:nav.earnings"), exact: true }).click();
  await pp.getByRole("heading", { name: hi("pro:earnings.jobsTitle") }).waitFor();
  await stage({
    id: "d4-earnings",
    part: "D",
    title: "Earnings",
    caption: "The professional sees today's and this week's earnings, and what is still to be paid out to their bank.",
    shots: [{ who: "pro" }],
  });

  await pp.getByRole("link", { name: hi("pro:nav.jobs"), exact: true }).click();
  await pp.getByRole("tab", { name: hi("pro:jobs.past") }).click();
  await pp.getByText(bookingNumber, { exact: false }).first().waitFor();
  await stage({
    id: "d5-jobs",
    part: "D",
    title: "Past jobs",
    caption: "Every completed job, with what they earned for it.",
    shots: [{ who: "pro" }],
  });

  // ---------- E. The team's view (admin, English) ----------
  await ap.bringToFront();
  await ap.goto("/admin");
  await ap.getByRole("heading", { name: en("admin:dashboard.now") }).waitFor();
  await stage({
    id: "e1-dashboard",
    part: "E",
    title: "Dashboard",
    caption: "The team's home: what's happening right now, and today's bookings, revenue, no-match rate and time to accept.",
    shots: [{ who: "admin" }],
  });

  await ap.goto("/admin/bookings");
  const search = ap.getByLabel(en("admin:bookings.search"));
  await search.pressSequentially(bookingNumber, { delay: typeDelay });
  await ap.waitForURL(new RegExp(`[?&]q=${escape(bookingNumber)}`));
  const openBooking = rowButton(ap, en("admin:bookings.open", { number: bookingNumber }), bookingNumber);
  await openBooking.waitFor();
  await stage({
    id: "e2-bookings",
    part: "E",
    title: "Bookings",
    caption: "Any booking can be found by its number or the customer's name, email or phone, filtered by status and date, or exported to a spreadsheet.",
    shots: [{ who: "admin" }],
  });

  await openBooking.click();
  await ap.waitForURL(/\/admin\/bookings\/[a-f0-9]{24}$/);
  await ap.getByRole("heading", { level: 1 }).filter({ hasText: bookingNumber }).waitFor();
  await ap.getByLabel(en("admin:booking.addNote")).pressSequentially(ctx.adminNote ?? `${customerName} would like ${proName} again next time.`, { delay: typeDelay });
  await ap.getByRole("button", { name: en("admin:booking.saveNote") }).click();
  await ap.getByText(en("admin:booking.noteSaved")).first().waitFor();
  await stage({
    id: "e3-booking",
    part: "E",
    title: "One booking, in full",
    caption: "Who booked, who came, where, the price and the payment, with internal notes only the team can see. Refund, cancel or reassign from here.",
    shots: [{ who: "admin" }],
  });

  await stage({
    id: "e4-booking-timeline",
    part: "E",
    title: "Timeline and alerts",
    caption: "Every step with its time, which professionals were alerted, how far away they were, and who accepted.",
    shots: [{ who: "admin", focus: ap.getByRole("region", { name: startsWith(en("admin:booking.offers", { count: 2 }).split("(")[0].trim()) }), block: "end" }],
  });

  await ap.getByRole("link", { name: accounts.customer.name, exact: true }).first().click();
  await ap.waitForURL(/\/admin\/customers\/[a-f0-9]{24}$/);
  await ap.getByRole("heading", { name: accounts.customer.name, level: 1 }).waitFor();
  await stage({
    id: "e5-customer",
    part: "E",
    title: "Customer profile",
    caption: "Each customer's details and bookings. The team can block a customer if needed, and every block is recorded.",
    shots: [{ who: "admin" }],
  });

  await ap.goto("/admin/payments");
  await rowButton(ap, en("admin:money.openBooking", { number: bookingNumber }), bookingNumber).waitFor();
  await stage({
    id: "e6-payments",
    part: "E",
    title: "Payments and refunds",
    caption: "Every payment and refund in one place. A refund that failed can be sent again with one click.",
    shots: [{ who: "admin" }],
  });

  await ap.goto("/admin/reviews");
  await ap.getByText(ctx.review ?? "On time, careful and very polite.").first().waitFor();
  await stage({
    id: "e7-reviews",
    part: "E",
    title: "Reviews",
    caption: "All customer reviews. Hiding an abusive review also removes it from the professional's rating.",
    shots: [{ who: "admin" }],
  });

  await ap.goto("/admin/professionals");
  await rowButton(ap, en("admin:professionals.open", { name: accounts.pro.name }), accounts.pro.name).click();
  const performance = ap.getByRole("region", { name: en("admin:performance.title") });
  await performance.waitFor();
  await ap.getByText(bookingNumber).first().waitFor();
  await stage({
    id: "e8-performance",
    part: "E",
    title: "Professional performance",
    caption: "Jobs completed, accept rate, rating and cancellations, and what they're owed. Payouts are marked here after the bank transfer.",
    shots: [{ who: "admin", focus: performance, block: "end" }],
  });

  await ap.goto("/admin/settings");
  await ap.getByRole("heading", { name: en("admin:settings.title"), level: 1 }).waitFor();
  await stage({
    id: "e9-settings",
    part: "E",
    title: "Settings",
    caption: "Fees, commission, GST, search radius, time to accept, hours and areas. Each change is previewed before saving and applies to new bookings.",
    shots: [{ who: "admin" }],
  });

  await ap.goto("/admin/audit");
  await ap.getByRole("heading", { name: en("admin:audit.title"), level: 1 }).waitFor();
  await ap.getByText(en("admin:audit.actions.booking.note")).first().waitFor();
  await stage({
    id: "e10-audit",
    part: "E",
    title: "Audit log",
    caption: "Every sensitive change by the team is recorded: who did it, when, and the values before and after.",
    shots: [{ who: "admin" }],
  });

  return { bookingNumber };
}
