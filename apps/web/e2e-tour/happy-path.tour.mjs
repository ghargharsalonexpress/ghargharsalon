import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { PARTS, runHappyPath } from "../scripts/demo/flow.mjs";

/**
 * The happy path screen by screen (npm run walkthrough): the shared flow in scripts/demo, with
 * every step saved as a screenshot plus steps.json; build-walkthrough.mjs turns them into
 * Proposal/Happy_Path.pdf. Phones are 390×844 at 2x; the admin is a 1440×900 laptop screen.
 */

const API_URL = "http://localhost:4100";
const WEB_ORIGIN = "http://localhost:5175";
const OUT_DIR = process.env.WALKTHROUGH_DIR ?? fileURLToPath(new URL("../../../../Proposal/happy-path/", import.meta.url));
const ADMIN = { email: "admin@e2e.test", password: "admin-e2e-password-1" };

// Sector 21C, Faridabad: the professional starts about 300 m from the customer and walks over.
const HOME = { latitude: 28.4111, longitude: 77.3196, accuracy: 12 };
const PRO_START = { latitude: 28.4089, longitude: 77.3178, accuracy: 10 };
const ROUTE = [
  { latitude: 28.4096, longitude: 77.3183, accuracy: 10 },
  { latitude: 28.4103, longitude: 77.3189, accuracy: 10 },
  { latitude: 28.411, longitude: 77.3195, accuracy: 10 },
];

// The E2E API starts with long timers for slow test machines; the walkthrough shows the launch
// values instead (packages/shared/src/settings.ts DEFAULT_SETTINGS). Outside service hours the
// hours are opened for the capture and put back after the job, as `npm run demo` does.
const LAUNCH = { matching: { acceptWindowSeconds: 30, searchTimeoutSeconds: 120, stalePresenceSeconds: 60 }, serviceHours: { open: "08:00", close: "21:00" } };
const OPEN_ALL_DAY = { open: "00:00", close: "23:59" };

const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "en-IN", timezoneId: "Asia/Kolkata" };
const LAPTOP = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, locale: "en-IN", timezoneId: "Asia/Kolkata" };
// Toasts come and go; they'd cover the bottom of a still picture.
const SCREENSHOT_STYLE = ".MuiSnackbar-root { visibility: hidden !important; }";

async function createUser(request, user) {
  const res = await request.post(`${API_URL}/__test__/users`, { data: user });
  expect(res.status(), await res.text()).toBe(201);
}

/** A number no other account on the E2E server has: one account per number (ADR-0020). */
const newPhone = () => `9${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;

/** The SMS login code the E2E API "sent" (customers and professionals log in with it). */
async function latestCode(request, phone) {
  const res = await request.get(`${API_URL}/__test__/sms/latest`, { params: { phone } });
  expect(res.ok(), `no SMS code for ${phone}`).toBe(true);
  return (await res.json()).code;
}

/** The admin API, logged in with the request fixture (CSRF header and Origin as the web app sends them). */
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

/** Fonts loaded and entrance animations finished (endless ones, like the live dot, don't count). */
async function settle(page) {
  await page.evaluate(() => document.fonts.ready);
  await page
    .waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== "running" || animation.effect?.getTiming().iterations === Infinity), undefined, { timeout: 5_000, polling: 100 })
    .catch(() => undefined);
  await page.waitForTimeout(300);
}

test("the happy path, screen by screen", async ({ browser, request }) => {
  if (!/happy-path[\\/]?$/.test(OUT_DIR)) throw new Error(`Refusing to clear ${OUT_DIR}`);
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const admin = await adminApi(request);
  const now = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
  const duringHours = now >= LAUNCH.serviceHours.open && now < LAUNCH.serviceHours.close;
  await admin.changeSettings((settings) => {
    Object.assign(settings.matching, LAUNCH.matching);
    settings.operations.serviceHours = duringHours ? LAUNCH.serviceHours : OPEN_ALL_DAY;
  });

  const tag = randomUUID().slice(0, 4);
  const accounts = {
    customer: { name: "Neha Kapoor", email: `neha.kapoor.${tag}@example.com`, phone: newPhone() },
    pro: { name: "Meera Joshi", email: `meera.joshi.${tag}@example.com`, phone: newPhone() },
    admin: ADMIN,
  };
  await createUser(request, { role: "customer", ...accounts.customer, locale: "en" });
  await createUser(request, { role: "professional", ...accounts.pro, locale: "hi", verified: true });

  const customerContext = await browser.newContext({ ...PHONE, geolocation: HOME, permissions: ["geolocation"] });
  const proContext = await browser.newContext({ ...PHONE, geolocation: PRO_START, permissions: ["geolocation", "notifications"] });
  await customerContext.addInitScript(() => {
    if (!window.sessionStorage.getItem("tour:init")) {
      window.localStorage.setItem("lang", "en");
      window.sessionStorage.setItem("tour:init", "1");
    }
  });
  // This phone has already proved alerts work and done the battery steps (Phase 4 checklist).
  await proContext.addInitScript(() => {
    window.localStorage.setItem("pro:alertTested", "1");
    window.localStorage.setItem("pro:batteryDone", "1");
    if (!window.sessionStorage.getItem("tour:init")) {
      window.localStorage.setItem("lang", "hi");
      window.sessionStorage.setItem("tour:init", "1");
    }
  });
  const pages = { customer: await customerContext.newPage(), pro: await proContext.newPage(), admin: null };
  const contexts = [customerContext, proContext];

  const stages = [];
  const stage = async (info) => {
    const shots = [];
    for (const spec of info.shots) {
      const page = pages[spec.who];
      if (spec.focus) {
        await spec.focus.evaluate((element, block) => element.scrollIntoView({ block, inline: "nearest", behavior: "instant" }), spec.block ?? "center");
        // Below the sticky top bar.
        if (spec.block === "start") await page.evaluate(() => window.scrollBy({ top: -88, behavior: "instant" }));
      } else {
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      }
      await settle(page);
      const file = `${info.id}-${spec.who}.png`;
      await page.screenshot({ path: join(OUT_DIR, file), animations: "disabled", caret: "hide", style: SCREENSHOT_STYLE });
      const { width, height } = page.viewportSize();
      shots.push({ who: spec.who, file, width, height });
    }
    stages.push({ id: info.id, part: info.part, title: info.title, caption: info.caption, shots });
  };

  const { bookingNumber } = await runHappyPath({
    customer: pages.customer,
    pro: pages.pro,
    proContext,
    accounts,
    codeFor: (phone) => latestCode(request, phone),
    service: { slug: "fruit-facial", category: "salon-for-women", name: "Fruit facial" },
    preference: "female",
    address: { house: "Flat 12", street: "Sector 21C", landmark: "Town Park", city: "Faridabad", pincode: "121001", note: "Ring the bell twice" },
    route: ROUTE,
    stage,
    log: (text) => console.log(text),
    openAdmin: async () => {
      const context = await browser.newContext(LAPTOP);
      contexts.push(context);
      pages.admin = await context.newPage();
      return pages.admin;
    },
    afterJob: duringHours
      ? undefined
      : () =>
          admin.changeSettings((settings) => {
            settings.operations.serviceHours = LAUNCH.serviceHours;
          }),
  });

  writeFileSync(
    join(OUT_DIR, "steps.json"),
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        hoursOpenedForCapture: !duringHours,
        bookingNumber,
        people: { customer: accounts.customer.name, pro: accounts.pro.name },
        service: "Fruit facial",
        parts: PARTS,
        stages,
      },
      null,
      2,
    ),
  );
  await Promise.all(contexts.map((context) => context.close()));
});
