import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { translator } from "../scripts/demo/flow.mjs";

/**
 * Every screen, start to end, for the project flow document (npm run flow-document): the
 * professional's onboarding, the customer's booking, the job on both phones, what comes after,
 * the other paths (failed payment, declined alert, nobody free, cancellation), the team's admin
 * and the rest of the website. Saves each screen and screens.json to Proposal/project-flow/;
 * scripts/demo/build-flow-document.mjs turns them into Proposal/Project_Flow.pdf.
 */

const API_URL = "http://localhost:4100";
const WEB_ORIGIN = "http://localhost:5175";
const OUT_DIR = process.env.FLOW_DOCUMENT_DIR ?? fileURLToPath(new URL("../../../../Proposal/project-flow/", import.meta.url));
const ADMIN = { email: "admin@e2e.test", password: "admin-e2e-password-1" };

// Sector 21C, Faridabad: the professional starts about 300 m from the customer and walks over.
const HOME = { latitude: 28.4111, longitude: 77.3196, accuracy: 12 };
const PRO_START = { latitude: 28.4089, longitude: 77.3178, accuracy: 10 };
const ROUTE = [
  { latitude: 28.4096, longitude: 77.3183, accuracy: 10 },
  { latitude: 28.4103, longitude: 77.3189, accuracy: 10 },
  { latitude: 28.411, longitude: 77.3195, accuracy: 10 },
];
const LAUNCH = { matching: { acceptWindowSeconds: 30, searchTimeoutSeconds: 120, stalePresenceSeconds: 60 }, serviceHours: { open: "08:00", close: "21:00" } };
const OPEN_ALL_DAY = { open: "00:00", close: "23:59" };

const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "en-IN", timezoneId: "Asia/Kolkata" };
const LAPTOP = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, locale: "en-IN", timezoneId: "Asia/Kolkata" };
const SCREENSHOT_STYLE = ".MuiSnackbar-root { visibility: hidden !important; }";

const en = translator("en");
const hi = translator("hi");
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function adminApi(request) {
  const { csrfToken } = await (await request.get(`${API_URL}/v1/session`)).json();
  const headers = { "x-csrf-token": csrfToken, Origin: WEB_ORIGIN };
  const login = await request.post(`${API_URL}/v1/auth/login`, { headers, data: ADMIN });
  expect(login.ok(), await login.text()).toBe(true);
  return {
    async changeSettings(change) {
      const current = await (await request.get(`${API_URL}/v1/admin/settings`)).json();
      const settings = structuredClone(current.settings);
      change(settings);
      const res = await request.put(`${API_URL}/v1/admin/settings`, { headers, data: { version: current.version, settings } });
      expect(res.ok(), await res.text()).toBe(true);
    },
  };
}

async function latestLink(request, to, contains) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const res = await request.get(`${API_URL}/__test__/emails/latest`, { params: { to } });
    if (res.ok()) {
      const link = (await res.json()).links.find((item) => item.includes(contains));
      if (link) return link.replace(/^https?:\/\/[^/]+/, "");
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No ${contains} link emailed to ${to}`);
}

async function settle(page) {
  await page.evaluate(() => document.fonts.ready);
  await page
    .waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== "running" || animation.effect?.getTiming().iterations === Infinity), undefined, { timeout: 5_000, polling: 100 })
    .catch(() => undefined);
  await page.waitForTimeout(300);
}

/** Headless browsers have no push service: a fake subscription, as in e2e/pro.spec.ts. */
function fakePush() {
  const endpoint = `https://push.example.test/flow-${Math.random().toString(36).slice(2)}`;
  const state = { subscribed: false };
  const subscription = {
    endpoint,
    expirationTime: null,
    toJSON: () => ({ endpoint, expirationTime: null, keys: { p256dh: "BOrlb0pKXsmL5H6CpGW0Qn4UZ9z2lQ", auth: "pq8d0tRkLdQ2bJ5w" } }),
    unsubscribe: async () => true,
  };
  if ("PushManager" in window) {
    PushManager.prototype.getSubscription = async () => (state.subscribed ? subscription : null);
    PushManager.prototype.subscribe = async () => {
      state.subscribed = true;
      return subscription;
    };
  }
}

/** The phone's language, set once (runs in the page, so the language comes in as an argument). */
function setLanguage(lang) {
  if (!window.sessionStorage.getItem("flow:init")) {
    window.localStorage.setItem("lang", lang);
    window.sessionStorage.setItem("flow:init", "1");
  }
}

test("every screen, start to end", async ({ browser, request }) => {
  test.setTimeout(900_000);
  if (!/project-flow[\\/]?$/.test(OUT_DIR)) throw new Error(`Refusing to clear ${OUT_DIR}`);
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const admin = await adminApi(request);
  const now = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
  const duringHours = now >= LAUNCH.serviceHours.open && now < LAUNCH.serviceHours.close;
  const launchValues = (settings) => {
    Object.assign(settings.matching, LAUNCH.matching);
    settings.operations.serviceHours = duringHours ? LAUNCH.serviceHours : OPEN_ALL_DAY;
  };
  await admin.changeSettings(launchValues);

  const tag = randomUUID().slice(0, 4);
  const people = {
    customer: { name: "Neha Kapoor", email: `neha.kapoor.${tag}@example.com`, phone: "98765 43210", password: "lantern-orchid-91-river" },
    pro: { name: "Meera Joshi", email: `meera.joshi.${tag}@example.com`, phone: "98123 45678", password: "mango-river-lantern-8" },
  };
  const customerFirst = "Neha";
  const proFirst = "Meera";

  const contexts = [];
  const newContext = async (options, lang, ...scripts) => {
    const context = await browser.newContext(options);
    await context.addInitScript(setLanguage, lang);
    for (const script of scripts) await context.addInitScript(script);
    contexts.push(context);
    return context;
  };
  const customerContext = await newContext({ ...PHONE, geolocation: HOME, permissions: ["geolocation"] }, "en");
  const proContext = await newContext({ ...PHONE, geolocation: PRO_START, permissions: ["geolocation", "notifications"] }, "hi", fakePush);
  const adminContext = await newContext(LAPTOP, "en");
  const guestContext = await newContext(PHONE, "en");
  const guestHindiContext = await newContext(PHONE, "hi");
  const pages = {
    customer: await customerContext.newPage(),
    pro: await proContext.newPage(),
    admin: await adminContext.newPage(),
    guest: await guestContext.newPage(),
    guestHi: await guestHindiContext.newPage(),
  };
  const { customer: cp, pro: pp, admin: ap, guest: gp } = pages;
  const live = { timeout: 45_000 };

  const screens = [];
  const shot = async (id, who, { focus, block, toast = false, bottom = false } = {}) => {
    const page = pages[who];
    const position = async () => {
      if (bottom) {
        await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
      } else if (focus) {
        await focus.evaluate((element, where) => element.scrollIntoView({ block: where, inline: "nearest", behavior: "instant" }), block ?? "center");
        if (block === "start") await page.evaluate(() => window.scrollBy({ top: -88, behavior: "instant" }));
      } else {
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      }
    };
    await position();
    await settle(page);
    // A page that has just loaded can reset its scroll once its data arrives: place it again.
    await position();
    await page.waitForTimeout(200);
    const file = `${id}.png`;
    // Toasts are hidden unless the toast is the point of the screen.
    await page.screenshot({ path: join(OUT_DIR, file), animations: "disabled", caret: "hide", ...(toast ? {} : { style: SCREENSHOT_STYLE }) });
    const url = new URL(page.url());
    const { width, height } = page.viewportSize();
    screens.push({ id, who: who.startsWith("guest") ? (who === "guestHi" ? "pro" : "customer") : who, file, path: `${url.pathname}${url.search}`, width, height });
    console.log(`  saved ${id}`);
  };
  const logIn = async (page, account, t) => {
    await page.getByLabel(t("auth:login.email"), { exact: true }).fill(account.email);
    await page.getByLabel(t("auth:login.password"), { exact: true }).fill(account.password);
  };
  const rowButton = (page, label, text) => page.getByRole("button", { name: label, exact: true }).or(page.getByRole("button", { name: new RegExp(`^${escape(text)}\\b`) })).first();
  const addFacialToCart = async () => {
    await cp.goto("/services?category=salon-for-women");
    const add = cp.getByRole("button", { name: en("public:services.addNamed", { name: "Fruit facial" }) });
    const inCart = cp.getByRole("group", { name: "Fruit facial" });
    await add.or(inCart).first().waitFor();
    // A booking paid from its own page (after a failed try) leaves the service in the cart.
    if (await add.isVisible()) await add.click();
    await cp.goto("/cart");
    await cp.getByRole("link", { name: new RegExp(`^(${escape(en("public:cart.checkout"))}|${escape(en("public:cart.checkoutShort"))})$`) }).filter({ visible: true }).first().click();
    await cp.waitForURL(/\/checkout$/);
    await cp.getByText(en("booking:checkout.quote.availableTitle"), { exact: true }).waitFor(live);
  };
  const payOnTestSheet = async (button) => {
    await button.click();
    const sheet = cp.getByRole("dialog", { name: en("booking:testPay.title") });
    await sheet.getByRole("button", { name: /^Pay ₹[\d,.]+$/ }).click();
    await cp.waitForURL(/\/bookings\/[a-f0-9]{24}$/, live);
    await cp.getByRole("heading", { name: en("booking:title.searching"), level: 1 }).waitFor(live);
    return /BK-\d+/.exec((await cp.getByText(/^BK-\d+ · /).first().textContent()) ?? "")?.[0] ?? "";
  };
  const payButton = () => cp.getByRole("button", { name: /^Pay ₹[\d,.]+$/ }).filter({ visible: true }).first();

  // ===== Stage 1: the team adds a professional, who gets ready and goes online =====
  await ap.goto("/login");
  await logIn(ap, ADMIN, en);
  await shot("admin-login", "admin");
  await ap.getByRole("button", { name: en("auth:login.submit") }).click();
  await ap.waitForURL(/\/admin$/);

  await ap.goto("/admin/professionals");
  await ap.getByRole("heading", { name: en("admin:professionals.title"), level: 1 }).waitFor();
  await rowButton(ap, en("admin:professionals.open", { name: "Priya Verma" }), "Priya Verma").waitFor();
  await shot("admin-professionals", "admin");

  await ap.goto("/admin/professionals/new");
  await ap.getByLabel(en("admin:proEditor.name")).fill(people.pro.name);
  await ap.getByLabel(en("admin:proEditor.phone")).fill(people.pro.phone);
  await ap.getByLabel(en("admin:proEditor.email"), { exact: true }).fill(people.pro.email);
  await ap.getByLabel("Salon for women (facials, waxing, threading)").check();
  await ap.getByLabel(en("admin:proEditor.baseArea")).fill("Sector 15, Faridabad");
  await shot("admin-pro-new", "admin");
  await ap.getByRole("button", { name: en("admin:proEditor.create") }).click();
  await ap.waitForURL(/\/admin\/professionals\/[a-f0-9]{24}$/);
  const proId = /professionals\/([a-f0-9]{24})$/.exec(ap.url())?.[1] ?? "";
  await ap.getByRole("heading", { level: 1 }).filter({ hasText: people.pro.name }).waitFor();
  await shot("admin-pro-details", "admin");

  // The emailed link opens the set-password page on their phone, in Hindi.
  await pp.goto(await latestLink(request, people.pro.email, "/reset-password"));
  const newPassword = pp.locator('input[type="password"]').first();
  await newPassword.waitFor();
  await newPassword.fill(people.pro.password);
  await shot("pro-set-password", "pro");
  await pp.locator('form button[type="submit"]').click();
  await pp.waitForURL(/\/pro$/);
  await pp.getByRole("heading", { name: hi("pro:home.greeting", { name: proFirst }) }).waitFor();
  await pp.getByText(hi("pro:home.verifyTitle")).waitFor();
  await shot("pro-home-unverified", "pro");

  await ap.goto(`/admin/professionals/${proId}/edit`);
  const verified = ap.getByLabel(en("admin:proEditor.verified"));
  await verified.check();
  await shot("admin-pro-verify", "admin", { focus: ap.getByRole("heading", { name: en("admin:proEditor.verification") }), block: "start" });
  await ap.getByRole("button", { name: en("admin:editor.save") }).click();
  await ap.waitForURL(new RegExp(`/admin/professionals/${proId}$`));

  await pp.reload();
  const checklist = pp.getByRole("heading", { name: hi("pro:readiness.title") });
  await checklist.waitFor();
  await shot("pro-checklist", "pro");
  const allow = pp.getByRole("button", { name: hi("pro:readiness.alerts.allow") });
  if (await allow.isVisible()) await allow.click();
  await pp.getByRole("button", { name: hi("pro:readiness.alerts.test") }).click();
  await pp.getByText(hi("pro:readiness.alerts.didArrive")).waitFor();
  await shot("pro-test-alert", "pro", { focus: pp.getByText(hi("pro:readiness.alerts.didArrive")) });
  await pp.getByRole("button", { name: hi("pro:readiness.alerts.yes") }).click();
  await checklist.waitFor({ state: "hidden" });
  await pp.getByRole("switch", { disabled: false }).waitFor();
  await shot("pro-ready", "pro");
  await pp.getByRole("switch").click();
  await pp.getByRole("switch", { checked: true }).waitFor();
  await shot("pro-online", "pro");

  // ===== Stage 2: the customer finds a service =====
  await cp.bringToFront();
  await cp.goto("/");
  await cp.getByRole("heading", { level: 1 }).waitFor();
  await shot("customer-home", "customer");
  const categories = cp.locator('a[href="/services?category=salon-for-women"]').first();
  await shot("customer-home-categories", "customer", { focus: categories });
  await categories.click();
  await cp.getByRole("link", { name: "Fruit facial", exact: true }).waitFor();
  await shot("customer-services", "customer");
  await cp.getByRole("link", { name: "Fruit facial", exact: true }).click();
  const sheet = cp.getByRole("dialog", { name: "Fruit facial" });
  const addToCart = sheet.getByRole("button", { name: /^Add to cart · / });
  await addToCart.and(cp.locator(":enabled")).waitFor();
  await shot("customer-service-sheet", "customer");
  await addToCart.click();
  await sheet.getByText(en("public:detail.inCart"), { exact: true }).waitFor().catch(() => undefined);
  await shot("customer-service-added", "customer");
  await sheet.getByText(en("public:detail.goToCart"), { exact: true }).click();
  await cp.waitForURL(/\/cart$/);
  const toCheckout = cp.getByRole("link", { name: new RegExp(`^(${escape(en("public:cart.checkout"))}|${escape(en("public:cart.checkoutShort"))})$`) }).filter({ visible: true }).first();
  await toCheckout.waitFor();
  await shot("customer-cart", "customer");

  // ===== Stage 3: account =====
  await toCheckout.click();
  await cp.waitForURL(/\/login\?/);
  await cp.getByRole("button", { name: en("auth:login.submit") }).waitFor();
  await shot("customer-login", "customer");
  await cp.getByRole("link", { name: en("auth:login.createAccount") }).click();
  await cp.waitForURL(/\/signup/);
  await cp.getByLabel(en("auth:signup.name")).fill(people.customer.name);
  await cp.getByLabel(en("auth:signup.phone")).fill(people.customer.phone);
  await cp.getByLabel(en("auth:signup.email"), { exact: true }).fill(people.customer.email);
  await cp.getByLabel(en("auth:signup.password"), { exact: true }).fill(people.customer.password);
  await shot("customer-signup", "customer");
  await cp.getByRole("button", { name: en("auth:signup.submit") }).click();
  await cp.waitForURL(/\/checkout$/, live);

  // ===== Stage 4: checkout and payment =====
  const addAddress = cp.getByRole("button", { name: en("booking:checkout.addAddress"), exact: true });
  await addAddress.waitFor(live);
  await shot("customer-checkout-new", "customer");
  await addAddress.click();
  const addressDialog = cp.getByRole("dialog", { name: en("booking:address.newTitle") });
  await addressDialog.getByRole("button", { name: en("booking:address.pinUse") }).click();
  const pinSet = addressDialog.getByText(/^Location set/);
  await pinSet.waitFor(live);
  await addressDialog.getByLabel(en("booking:address.house")).fill("Flat 12");
  await addressDialog.getByLabel(en("booking:address.street")).fill("Sector 21C");
  await addressDialog.getByLabel(en("booking:address.landmark")).fill("Town Park");
  await addressDialog.getByLabel(en("booking:address.city")).fill("Faridabad");
  await addressDialog.getByLabel(en("booking:address.pincode")).fill("121001");
  await shot("customer-address", "customer", { focus: pinSet, block: "start" });
  await addressDialog.getByRole("button", { name: en("booking:address.save") }).click();
  await addressDialog.waitFor({ state: "hidden" });
  await cp.getByLabel(en("booking:checkout.note")).fill("Ring the bell twice");
  const female = cp.getByRole("radio", { name: en("booking:checkout.female"), exact: true });
  await cp.locator("label").filter({ has: female }).click();
  const available = cp.getByText(en("booking:checkout.quote.availableTitle"), { exact: true });
  await available.waitFor(live);
  await shot("customer-checkout-ready", "customer", { focus: available });
  await payButton().click();
  const paySheet = cp.getByRole("dialog", { name: en("booking:testPay.title") });
  await paySheet.waitFor();
  await shot("customer-payment", "customer");
  await paySheet.getByRole("button", { name: /^Pay ₹[\d,.]+$/ }).click();
  await cp.waitForURL(/\/bookings\/[a-f0-9]{24}$/, live);
  await cp.getByRole("heading", { name: en("booking:title.searching"), level: 1 }).waitFor(live);
  const bookingNumber = /BK-\d+/.exec((await cp.getByText(/^BK-\d+ · /).first().textContent()) ?? "")?.[0] ?? "";

  // ===== Stage 5: the nearest professional gets the alert =====
  await pp.bringToFront();
  await pp.waitForURL(/\/pro\/offers\/[a-f0-9]{24}/, live);
  await pp.getByRole("button", { name: hi("pro:offer.accept") }).waitFor();
  await shot("customer-searching", "customer");
  await shot("pro-alert", "pro");
  await pp.getByRole("button", { name: hi("pro:offer.accept") }).click();
  await pp.waitForURL(/\/pro\/jobs\/[a-f0-9]{24}$/);
  await pp.getByRole("heading", { name: hi("pro:job.title.accepted", { name: customerFirst }), level: 1 }).waitFor();
  await cp.bringToFront();
  await cp.getByRole("heading", { name: en("booking:title.accepted", { name: proFirst }), level: 1 }).waitFor(live);
  await shot("customer-on-the-way", "customer");
  await shot("pro-on-the-way", "pro");

  // ===== Stage 6: on the way, at the door =====
  await pp.bringToFront();
  for (const point of ROUTE.slice(0, -1)) {
    await proContext.setGeolocation(point);
    await pp.waitForTimeout(1_500);
  }
  await cp.bringToFront();
  await cp.getByText(/^Updated (now|\d seconds? ago)$/).first().waitFor(live);
  await shot("customer-tracking", "customer", { focus: cp.getByText(/^Updated /).first() });
  await pp.bringToFront();
  await proContext.setGeolocation(ROUTE.at(-1));
  await pp.waitForTimeout(1_500);
  await pp.getByRole("button", { name: hi("pro:job.arrived") }).click();
  const startHeading = pp.getByRole("heading", { name: hi("pro:job.title.arrived"), level: 1 });
  const far = pp.getByRole("dialog", { name: hi("pro:job.farTitle") });
  await startHeading.or(far).first().waitFor();
  if (await far.isVisible()) await far.getByRole("button", { name: hi("pro:job.farConfirm") }).click();
  await startHeading.waitFor();
  await cp.bringToFront();
  await cp.getByRole("heading", { name: en("booking:title.arrived", { name: proFirst }), level: 1 }).waitFor(live);
  const otp = cp.getByLabel(/^Start OTP: \d \d \d \d$/);
  const code = ((await otp.textContent()) ?? "").replace(/\D/g, "");
  const firstDigit = pp.getByLabel(hi("otp.digit", { index: 1, count: 4 }));
  await shot("customer-arrived", "customer", { focus: otp });
  await shot("pro-start", "pro", { focus: firstDigit });
  await pp.bringToFront();
  await firstDigit.click();
  await pp.keyboard.type(`${code.slice(0, 3)}${(Number(code[3]) + 1) % 10}`, { delay: 60 });
  await pp.getByRole("button", { name: hi("pro:job.start"), exact: true }).click();
  await pp.getByText(hi("validation.otpWrong")).waitFor();
  await shot("pro-wrong-code", "pro", { focus: firstDigit });
  await firstDigit.click();
  await pp.keyboard.type(code, { delay: 60 });
  await pp.getByRole("button", { name: hi("pro:job.start"), exact: true }).click();

  // ===== Stage 7: the service =====
  await pp.getByRole("heading", { name: hi("pro:job.title.in_progress"), level: 1 }).waitFor();
  await cp.bringToFront();
  await cp.getByRole("heading", { name: en("booking:title.in_progress"), level: 1 }).waitFor(live);
  await shot("customer-in-progress", "customer");
  await shot("pro-in-progress", "pro");
  await ap.goto("/admin/live");
  await ap.getByRole("link", { name: bookingNumber }).first().waitFor(live);
  await shot("admin-live", "admin");
  await pp.bringToFront();
  await pp.getByRole("button", { name: hi("pro:job.complete") }).click();
  const early = pp.getByRole("dialog", { name: hi("pro:job.earlyTitle") });
  await early.waitFor();
  await shot("pro-early-check", "pro");
  await early.getByRole("button", { name: hi("pro:job.earlyConfirm") }).click();
  await pp.getByRole("heading", { name: hi("pro:job.title.completed"), level: 1 }).waitFor();
  await cp.bringToFront();
  await cp.getByRole("heading", { name: en("booking:title.completed"), level: 1 }).waitFor(live);
  await shot("customer-completed", "customer");
  await shot("pro-completed", "pro");

  // ===== Stage 8: after the service =====
  const fiveStars = cp.getByRole("radio", { name: en("booking:review.stars.5"), exact: true });
  await cp.locator("label").filter({ has: fiveStars }).click();
  const comment = cp.getByLabel(en("booking:review.comment"));
  await comment.fill("On time, careful and very polite.");
  await shot("customer-rating", "customer", { focus: comment });
  await cp.getByRole("button", { name: en("booking:review.submit") }).click();
  const yourRating = cp.getByRole("heading", { name: en("booking:review.doneTitle") });
  await yourRating.waitFor();
  await shot("customer-rated", "customer", { focus: yourRating });
  await cp.getByRole("link", { name: en("booking:completed.invoice") }).click();
  await cp.getByRole("heading", { name: en("booking:invoice.title"), level: 1 }).waitFor();
  await shot("customer-invoice", "customer");
  await cp.goto("/account/bookings");
  await cp.getByRole("link", { name: /Fruit facial/ }).first().waitFor();
  await shot("customer-my-bookings", "customer");
  await cp.goto("/account/addresses");
  await cp.getByRole("heading", { name: en("account:addresses.title"), level: 1 }).waitFor();
  await shot("customer-addresses", "customer");
  await cp.goto("/account");
  await cp.getByRole("heading", { level: 1 }).waitFor();
  await shot("customer-profile", "customer");

  await pp.bringToFront();
  await pp.getByRole("link", { name: hi("pro:nav.earnings"), exact: true }).click();
  await pp.getByRole("heading", { name: hi("pro:earnings.jobsTitle") }).waitFor();
  await shot("pro-earnings", "pro");
  await pp.getByRole("link", { name: hi("pro:nav.jobs"), exact: true }).click();
  await pp.getByRole("tab", { name: hi("pro:jobs.past") }).click();
  await pp.getByText(bookingNumber).first().waitFor();
  await shot("pro-jobs", "pro");
  await pp.getByRole("link", { name: hi("pro:nav.profile"), exact: true }).click();
  await pp.getByRole("heading", { name: people.pro.name }).waitFor();
  await shot("pro-profile", "pro");
  await pp.getByRole("link", { name: hi("pro:nav.home"), exact: true }).click();

  // ===== Other paths (short timers so "nobody free" happens within half a minute) =====
  await admin.changeSettings((settings) => {
    settings.matching.acceptWindowSeconds = 20;
    settings.matching.searchTimeoutSeconds = 30;
  });

  // A payment that doesn't go through, then paying from the booking page.
  await cp.bringToFront();
  await addFacialToCart();
  await payButton().click();
  await cp.getByRole("dialog", { name: en("booking:testPay.title") }).getByRole("button", { name: en("booking:testPay.fail") }).click();
  const failed = cp.getByText(en("booking:checkout.failed"));
  await failed.waitFor(live);
  await shot("customer-payment-failed", "customer", { focus: failed });
  await cp.goto("/account/bookings");
  await cp.getByRole("heading", { name: en("account:bookings.current") }).waitFor(live);
  await cp.locator("#current-bookings").locator("..").getByRole("link").first().click();
  await cp.getByRole("heading", { name: en("booking:title.awaiting_payment"), level: 1 }).waitFor(live);
  await shot("customer-awaiting-payment", "customer");
  const secondBooking = await payOnTestSheet(payButton());

  // The professional declines; nobody else is free.
  await pp.bringToFront();
  await pp.waitForURL(/\/pro\/offers\/[a-f0-9]{24}/, live);
  await pp.getByRole("button", { name: hi("pro:offer.decline") }).click();
  const declineDialog = pp.getByRole("dialog", { name: hi("pro:offer.declineTitle") });
  await declineDialog.waitFor();
  await shot("pro-decline", "pro");
  await declineDialog.getByRole("button", { name: hi("pro:offer.reasons.busy") }).click();
  // Back on Home, still online, with a short note.
  await pp.waitForURL(/\/pro$/, live);
  await pp.getByText(hi("pro:offer.declined")).waitFor(live);
  await shot("pro-declined", "pro", { toast: true });
  await cp.bringToFront();
  await cp.getByRole("heading", { name: en("booking:title.no_professional_found"), level: 1 }).waitFor({ timeout: 90_000 });
  await shot("customer-no-professional", "customer");
  await pp.getByRole("switch", { checked: true }).waitFor(live);

  // The customer cancels while the search is on.
  await addFacialToCart();
  const thirdBooking = await payOnTestSheet(payButton());
  await pp.bringToFront();
  await pp.waitForURL(/\/pro\/offers\/[a-f0-9]{24}/, live);
  await cp.bringToFront();
  await cp.getByRole("button", { name: en("booking:cancel.open") }).click();
  const cancelDialog = cp.getByRole("dialog", { name: en("booking:cancel.title") });
  await cancelDialog.getByText(en("booking:cancel.reasons.changed_plans")).click();
  await shot("customer-cancel", "customer");
  await cancelDialog.getByRole("button", { name: en("booking:cancel.confirm") }).click();
  await cp.getByRole("heading", { name: en("booking:title.cancelled"), level: 1 }).waitFor(live);
  await shot("customer-cancelled", "customer");
  await pp.bringToFront();
  await pp.getByText(hi("pro:offer.ended.revoked.title")).waitFor(live);
  await shot("pro-offer-withdrawn", "pro");

  await admin.changeSettings((settings) => {
    Object.assign(settings.matching, LAUNCH.matching);
    settings.operations.serviceHours = LAUNCH.serviceHours;
  });

  // ===== Stage 9: the team's view =====
  await ap.bringToFront();
  await ap.goto("/admin");
  await ap.getByRole("heading", { name: en("admin:dashboard.now") }).waitFor();
  await shot("admin-dashboard", "admin");
  await ap.goto("/admin/bookings");
  await rowButton(ap, en("admin:bookings.open", { number: thirdBooking }), thirdBooking).waitFor();
  await shot("admin-bookings", "admin");
  await rowButton(ap, en("admin:bookings.open", { number: bookingNumber }), bookingNumber).click();
  await ap.getByRole("heading", { level: 1 }).filter({ hasText: bookingNumber }).waitFor();
  await ap.getByLabel(en("admin:booking.addNote")).fill(`${customerFirst} would like ${proFirst} again next time.`);
  await ap.getByRole("button", { name: en("admin:booking.saveNote") }).click();
  await ap.getByText(en("admin:booking.noteSaved")).first().waitFor();
  await shot("admin-booking", "admin");
  await shot("admin-booking-timeline", "admin", { focus: ap.getByRole("region", { name: /^Offers/ }), block: "end" });
  await ap.goto("/admin/customers");
  await rowButton(ap, en("admin:customers.open", { name: people.customer.name }), people.customer.name).waitFor();
  await shot("admin-customers", "admin");
  await rowButton(ap, en("admin:customers.open", { name: people.customer.name }), people.customer.name).click();
  await ap.getByRole("heading", { name: people.customer.name, level: 1 }).waitFor();
  await shot("admin-customer", "admin");
  await ap.goto("/admin/payments");
  await rowButton(ap, en("admin:money.openBooking", { number: bookingNumber }), bookingNumber).waitFor();
  await shot("admin-payments", "admin");
  await ap.goto("/admin/payments?view=refunds");
  await rowButton(ap, en("admin:money.openBooking", { number: thirdBooking }), thirdBooking).waitFor();
  await shot("admin-refunds", "admin");
  await ap.goto("/admin/reviews");
  await ap.getByText("On time, careful and very polite.").first().waitFor();
  await shot("admin-reviews", "admin");
  await ap.goto(`/admin/professionals/${proId}`);
  const performance = ap.getByRole("region", { name: en("admin:performance.title") });
  await performance.waitFor();
  await ap.getByText(bookingNumber).first().waitFor();
  // The last section of the page.
  await shot("admin-pro-performance", "admin", { bottom: true });
  await ap.goto("/admin/settings");
  await ap.getByRole("heading", { name: en("admin:settings.title"), level: 1 }).waitFor();
  await shot("admin-settings", "admin");
  await shot("admin-settings-hours", "admin", { focus: ap.getByRole("heading", { name: en("admin:settings.hours") }), block: "start" });
  await ap.goto("/admin/audit");
  await ap.getByText(en("admin:audit.actions.booking.note")).first().waitFor();
  await shot("admin-audit", "admin");

  // ===== Stage 10: the rest of the website, sign-in help and the catalogue =====
  await gp.bringToFront();
  await gp.goto("/about");
  await gp.getByRole("heading", { level: 1 }).waitFor();
  await shot("site-about", "guest");
  await gp.goto("/contact");
  await gp.getByLabel(en("public:contact.name")).fill("Ritu Malhotra");
  await gp.getByLabel(en("public:contact.email"), { exact: true }).fill(`ritu.${tag}@example.com`);
  await gp.getByLabel(en("public:contact.message")).fill("Can someone come to Sector 21 this evening for a facial?");
  await shot("site-contact", "guest");
  await gp.getByRole("button", { name: en("public:contact.submit") }).click();
  await gp.getByRole("heading", { name: en("public:contact.sentTitle") }).waitFor();
  await shot("site-contact-sent", "guest");
  await gp.goto("/legal/cancellation-refund");
  await gp.getByRole("heading", { level: 1 }).waitFor();
  await shot("site-policy", "guest");
  await gp.goto("/register-as-professional");
  await gp.getByRole("heading", { level: 1 }).waitFor();
  await shot("site-join", "guest");
  await gp.goto("/this-page-does-not-exist");
  await gp.getByRole("heading", { level: 1 }).waitFor();
  await shot("site-not-found", "guest");
  await gp.goto("/forgot-password");
  await gp.getByLabel(en("auth:forgot.email"), { exact: true }).fill(people.customer.email);
  await shot("site-forgot", "guest");
  await gp.getByRole("button", { name: en("auth:forgot.submit") }).click();
  await gp.getByRole("heading", { name: en("auth:forgot.sentTitle") }).waitFor();
  await shot("site-forgot-sent", "guest");
  await gp.goto(await latestLink(request, people.customer.email, "/reset-password"));
  await gp.getByLabel(en("auth:reset.password"), { exact: true }).fill("new-lantern-river-42");
  await shot("site-reset", "guest");
  const gh = pages.guestHi;
  await gh.goto("/login");
  await gh.getByRole("button", { name: hi("auth:login.submit") }).waitFor();
  await shot("pro-login", "guestHi");

  await ap.bringToFront();
  await ap.goto("/admin/services");
  await rowButton(ap, en("admin:services.open", { name: "Fruit facial" }), "Fruit facial").waitFor();
  await shot("admin-services", "admin");
  await rowButton(ap, en("admin:services.open", { name: "Fruit facial" }), "Fruit facial").click();
  await ap.waitForURL(/\/admin\/services\/[a-f0-9]{24}\/edit$/);
  await ap.getByRole("heading", { level: 1 }).waitFor();
  await shot("admin-service-editor", "admin");
  await ap.goto("/admin/categories");
  await ap.getByRole("heading", { name: en("admin:categories.title"), level: 1 }).waitFor();
  await shot("admin-categories", "admin");
  await ap.goto("/admin/messages");
  await rowButton(ap, en("admin:messages.open", { name: "Ritu Malhotra" }), "Ritu Malhotra").waitFor();
  await shot("admin-messages", "admin");
  await rowButton(ap, en("admin:messages.open", { name: "Ritu Malhotra" }), "Ritu Malhotra").click();
  await ap.getByRole("dialog").waitFor();
  await shot("admin-message", "admin");

  writeFileSync(
    join(OUT_DIR, "screens.json"),
    JSON.stringify({ capturedAt: new Date().toISOString(), hoursOpenedForCapture: !duringHours, bookings: { happy: bookingNumber, noProfessional: secondBooking, cancelled: thirdBooking }, people: { customer: people.customer.name, pro: people.pro.name }, screens }, null, 2),
  );
  await Promise.all(contexts.map((context) => context.close()));
});
