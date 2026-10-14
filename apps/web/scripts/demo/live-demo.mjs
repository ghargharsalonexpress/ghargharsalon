import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { chromium, request } from "@playwright/test";
import { PARTS, runHappyPath } from "./flow.mjs";

/**
 * npm run demo: the whole happy path, played on this computer against the running dev app
 * (web http://localhost:5174, API http://localhost:4000, see docs/runbooks/local-development.md).
 *
 * Edge opens the customer (English) on the left and the professional's phone (Hindi) on the
 * right; the admin window opens for the last part. Each step shows a caption and pauses.
 * Uses the demo logins (apps/api/.data/demo-accounts.txt) and the admin login (apps/api/.env).
 *
 * Outside service hours the hours are opened for the demo and put back after the job (and on
 * exit, even after Ctrl+C). DEMO_SPEED=2 halves the pauses; DEMO_SPEED=0.5 doubles them;
 * DEMO_MUTE=1 silences the job alarm; DEMO_EXIT_WHEN_DONE=1 closes everything at the end.
 */

const WEB = process.env.DEMO_WEB_URL ?? "http://localhost:5174";
const API = process.env.DEMO_API_URL ?? "http://localhost:4000";
const SPEED = Math.min(4, Math.max(0.25, Number(process.env.DEMO_SPEED) || 1));
const PAUSE_MS = 3_500 / SPEED;
const API_DIR = new URL("../../../api/", import.meta.url);
const HOURS_FILE = new URL(".data/demo-hours.json", API_DIR);
const OPEN_ALL_DAY = { open: "00:00", close: "23:59" };
const SERVICE = { slug: process.env.DEMO_SERVICE ?? "vitamin-c-brightening-facial", category: "salon-for-women" };

// Sector 21C, Faridabad (inside the Delhi NCR service area). The professional starts about
// 300 m away and walks over; the last point is at the door (inside the 200 m arrival check).
const HOME = { latitude: 28.4111, longitude: 77.3196, accuracy: 12 };
const PRO_START = { latitude: 28.4089, longitude: 77.3178, accuracy: 10 };
const ROUTE = [
  { latitude: 28.4096, longitude: 77.3183, accuracy: 10 },
  { latitude: 28.4103, longitude: 77.3189, accuracy: 10 },
  { latitude: 28.411, longitude: 77.3195, accuracy: 10 },
];
const ADDRESS = { house: "Flat 12", street: "Sector 21C", landmark: "Town Park", city: "Faridabad", pincode: "121001", note: "Ring the bell twice" };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const say = (text) => console.log(text);

function fail(text) {
  console.error(`\n${text}\n`);
  process.exit(1);
}

// ---------- logins (read here, never printed) ----------

function readAccounts() {
  const file = (name) => {
    const url = new URL(name, API_DIR);
    if (!existsSync(url)) fail(`Missing apps/api/${name}. Run "npm run seed:demo" in apps/api first (see docs/runbooks/local-development.md).`);
    return readFileSync(url, "utf8");
  };
  const demo = file(".data/demo-accounts.txt");
  const env = file(".env");
  const login = (role) => {
    const match = new RegExp(`^${role}:\\s*(\\S+)\\s*/\\s*(\\S+)\\s*$`, "m").exec(demo);
    if (!match) fail(`No ${role} login in apps/api/.data/demo-accounts.txt. Run "npm run seed:demo" in apps/api.`);
    return { email: match[1], password: match[2] };
  };
  const envValue = (key) => {
    const match = new RegExp(`^${key}=(.*)$`, "m").exec(env);
    const value = match?.[1].trim().replace(/^(["'])(.*)\1$/, "$2");
    if (!value) fail(`${key} is missing in apps/api/.env.`);
    return value;
  };
  return { customer: login("customer"), pro: login("professional"), admin: { email: envValue("ADMIN_EMAIL"), password: envValue("ADMIN_PASSWORD") } };
}

/** A logged-in API session (cookie, CSRF header and Origin, as the web app sends them). */
async function apiSession(account) {
  const http = await request.newContext({ baseURL: API, extraHTTPHeaders: { Origin: WEB } });
  const csrf = (await (await http.get("/v1/session")).json()).csrfToken;
  const call = async (method, path, data) => {
    const res = await http.fetch(path, { method, headers: { "x-csrf-token": csrf }, ...(data === undefined ? {} : { data }) });
    const text = await res.text();
    if (!res.ok()) throw new Error(`${method} ${path} answered ${res.status()}: ${text.slice(0, 200)}`);
    return text ? JSON.parse(text) : null;
  };
  try {
    const { user } = await call("POST", "/v1/auth/login", { email: account.email, password: account.password });
    return { call, user, close: () => http.dispose() };
  } catch (error) {
    await http.dispose();
    throw error;
  }
}

async function asAdmin(accounts, action) {
  const admin = await apiSession(accounts.admin);
  try {
    return await action(admin);
  } finally {
    await admin.close();
  }
}

// ---------- service hours ----------

const istClock = () => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());

async function setHours(admin, hours) {
  const { version, settings } = await admin.call("GET", "/v1/admin/settings");
  settings.operations.serviceHours = hours;
  await admin.call("PUT", "/v1/admin/settings", { version, settings });
}

/** Puts back the hours an earlier step opened (only if nobody changed them since). */
async function restoreHours(accounts) {
  if (!existsSync(HOURS_FILE)) return;
  const original = JSON.parse(readFileSync(HOURS_FILE, "utf8"));
  await asAdmin(accounts, async (admin) => {
    const { settings } = await admin.call("GET", "/v1/admin/settings");
    const hours = settings.operations.serviceHours;
    if (hours.open === OPEN_ALL_DAY.open && hours.close === OPEN_ALL_DAY.close) {
      await setHours(admin, original);
      say(`Service hours are back to ${original.open}–${original.close}.`);
    }
  });
  rmSync(HOURS_FILE);
}

// ---------- browser windows ----------

/** A small caption bar on every page (it ignores the mouse, and survives page loads). */
function captionScript() {
  const KEY = "demo:caption";
  const render = () => {
    const text = window.sessionStorage.getItem(KEY);
    let bar = document.getElementById("demo-caption");
    if (!text) {
      bar?.remove();
      return;
    }
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "demo-caption";
      bar.setAttribute("aria-hidden", "true");
      Object.assign(bar.style, {
        position: "fixed",
        top: "8px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: "2147483647",
        width: "max-content",
        maxWidth: "calc(100vw - 24px)",
        boxSizing: "border-box",
        padding: "8px 14px",
        borderRadius: "10px",
        background: "rgba(31, 28, 25, 0.9)",
        color: "#fff",
        font: "500 14px/1.45 'Segoe UI', 'Noto Sans', Arial, sans-serif",
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.25)",
        pointerEvents: "none",
      });
      document.body.appendChild(bar);
    }
    bar.textContent = text;
  };
  window.__demoCaption = (text) => {
    window.sessionStorage.setItem(KEY, text);
    render();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
  else render();
}

/** Moves and sizes a window; returns where it really is (Edge has a minimum width). */
async function place(page, bounds) {
  const cdp = await page.context().newCDPSession(page);
  try {
    const { windowId } = await cdp.send("Browser.getWindowForTarget");
    await cdp.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "normal" } });
    await cdp.send("Browser.setWindowBounds", { windowId, bounds });
    return (await cdp.send("Browser.getWindowBounds", { windowId })).bounds;
  } finally {
    await cdp.detach().catch(() => undefined);
  }
}

// ---------- the demo ----------

async function main() {
  say("Happy path demo: checking the local app…");
  const reachable = async (url) => {
    try {
      return (await fetch(url)).ok;
    } catch {
      return false;
    }
  };
  if (!(await reachable(`${API}/health/ready`)) || !(await reachable(WEB))) {
    fail(`The local app isn't running (API ${API}, web ${WEB}). Start it first: docs/runbooks/local-development.md.`);
  }

  const accounts = readAccounts();
  const service = await (async () => {
    const res = await fetch(`${API}/v1/services/${SERVICE.slug}`);
    if (res.ok) {
      const found = await res.json();
      return { ...SERVICE, name: found.name.en, category: found.categorySlugs.includes(SERVICE.category) ? SERVICE.category : found.categorySlugs[0] };
    }
    const catalog = await (await fetch(`${API}/v1/catalog`)).json();
    const first = catalog.services.find((item) => item.categorySlugs.includes(SERVICE.category));
    if (!first) fail(`No service in "${SERVICE.category}" to book. Seed the catalogue first.`);
    return { slug: first.slug, category: SERVICE.category, name: first.name.en };
  })();

  // Clean start: the demo professional free and offline, no booking of theirs still open,
  // and the hours open if it's outside them right now.
  const setup = await asAdmin(accounts, async (admin) => {
    const pros = await admin.call("GET", "/v1/admin/professionals");
    const row = (Array.isArray(pros) ? pros : pros.rows).find((item) => item.email.toLowerCase() === accounts.pro.email.toLowerCase());
    if (!row) fail(`The demo professional isn't in the database. Run "npm run seed:demo" in apps/api.`);
    if (!row.verifiedAt || row.status !== "active") fail("The demo professional must be verified and active (Admin → Professionals).");
    const customers = await admin.call("GET", `/v1/admin/customers?q=${encodeURIComponent(accounts.customer.email)}`);
    const customer = customers.rows.find((item) => item.email?.toLowerCase() === accounts.customer.email.toLowerCase()) ?? customers.rows[0];
    if (!customer) fail(`The demo customer isn't in the database. Run "npm run seed:demo" in apps/api.`);

    const open = [
      ...(await admin.call("GET", `/v1/admin/bookings?view=active&professionalId=${row.id}`)).rows,
      ...(await admin.call("GET", `/v1/admin/bookings?view=searching&q=${encodeURIComponent(accounts.customer.email)}`)).rows,
    ];
    for (const booking of new Map(open.map((item) => [item.id, item])).values()) {
      await admin.call("POST", `/v1/admin/bookings/${booking.id}/cancel`, { reason: "Closed before a demo run", feePaise: 0 });
      say(`Closed an earlier booking, ${booking.number}, with a full refund.`);
    }

    const { settings } = await admin.call("GET", "/v1/admin/settings");
    const hours = settings.operations.serviceHours;
    const now = istClock();
    if (!(now >= hours.open && now < hours.close)) {
      // A run that stopped half way left its file: keep the hours it saved.
      if (!existsSync(HOURS_FILE)) writeFileSync(HOURS_FILE, JSON.stringify(hours));
      await setHours(admin, OPEN_ALL_DAY);
      say(`It's ${now} in India, outside service hours (${hours.open}–${hours.close}). Hours are open all day for this demo and go back after the job.`);
    }
    return { pro: row, customerName: customer.name };
  });
  accounts.pro.name = setup.pro.name;
  accounts.customer.name = setup.customerName;
  if (setup.pro.presence.state !== "offline") {
    const pro = await apiSession(accounts.pro);
    await pro.call("POST", "/v1/pro/presence", { online: false }).finally(() => pro.close());
  }

  // Our own signal handlers close everything (the professional goes offline, hours go back).
  const browser = await chromium.launch({
    channel: "msedge",
    headless: false,
    slowMo: Math.round(100 / SPEED),
    args: process.env.DEMO_MUTE === "1" ? ["--mute-audio"] : [],
    handleSIGINT: false,
    handleSIGTERM: false,
    handleSIGHUP: false,
  });
  const contexts = [];
  const pages = { customer: null, pro: null, admin: null };

  let cleaning = null;
  const cleanup = () =>
    (cleaning ??= (async () => {
      try {
        const pro = await apiSession(accounts.pro);
        try {
          await pro.call("POST", "/v1/pro/presence", { online: false });
        } catch (error) {
          if (!String(error.message).includes("PRO_BUSY")) throw error;
          // Stopped in the middle of a job: close it (full refund) so the professional is free.
          await asAdmin(accounts, async (admin) => {
            for (const booking of (await admin.call("GET", `/v1/admin/bookings?view=active&professionalId=${setup.pro.id}`)).rows) {
              await admin.call("POST", `/v1/admin/bookings/${booking.id}/cancel`, { reason: "Demo closed before the job ended", feePaise: 0 });
              say(`Closed ${booking.number}, which was still open, with a full refund.`);
            }
          });
          await pro.call("POST", "/v1/pro/presence", { online: false });
        } finally {
          await pro.close();
        }
        say(`${accounts.pro.name} is offline again.`);
      } catch (error) {
        console.warn(`Couldn't set the professional offline: ${error.message}`);
      }
      await restoreHours(accounts).catch((error) => console.warn(`Couldn't put the service hours back: ${error.message}. Change them in Admin → Settings.`));
      await browser.close().catch(() => undefined);
    })());
  const exit = (code) => void cleanup().finally(() => process.exit(code));
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"]) process.on(signal, () => exit(0));
  browser.on("disconnected", () => exit(0));

  const newContext = async (options) => {
    const context = await browser.newContext({ viewport: null, baseURL: WEB, timezoneId: "Asia/Kolkata", ...options });
    await context.addInitScript(captionScript);
    contexts.push(context);
    return context;
  };
  const watchClose = (page) =>
    page.on("close", () => {
      if (contexts.every((context) => context.pages().length === 0)) exit(0);
    });

  const customerContext = await newContext({ locale: "en-IN", geolocation: HOME, permissions: ["geolocation"] });
  await customerContext.addInitScript(() => {
    if (!window.sessionStorage.getItem("demo:init")) {
      window.localStorage.setItem("lang", "en");
      window.sessionStorage.setItem("demo:init", "1");
    }
  });
  const proContext = await newContext({ locale: "hi-IN", geolocation: PRO_START, permissions: ["geolocation", "notifications"] });
  // This "phone" has already proved alerts work and done the battery steps (Phase 4 checklist).
  await proContext.addInitScript(() => {
    window.localStorage.setItem("pro:alertTested", "1");
    window.localStorage.setItem("pro:batteryDone", "1");
    if (!window.sessionStorage.getItem("demo:init")) {
      window.localStorage.setItem("lang", "hi");
      window.sessionStorage.setItem("demo:init", "1");
    }
  });

  pages.customer = await customerContext.newPage();
  pages.pro = await proContext.newPage();
  watchClose(pages.customer);
  watchClose(pages.pro);
  const screen = await pages.customer.evaluate(() => ({ left: window.screen.availLeft ?? 0, top: window.screen.availTop ?? 0, width: window.screen.availWidth, height: window.screen.availHeight }));
  // The professional's "phone" on the right; if Edge makes it wider than asked, it moves back on screen.
  const asked = Math.max(420, Math.min(480, Math.round(screen.width * 0.3)));
  const proBounds = await place(pages.pro, { left: screen.left + screen.width - asked, top: screen.top, width: asked, height: screen.height });
  const proLeft = screen.left + screen.width - proBounds.width;
  if (proBounds.left !== proLeft) await place(pages.pro, { left: proLeft, top: screen.top, width: proBounds.width, height: screen.height });
  const leftArea = { left: screen.left, top: screen.top, width: proLeft - screen.left, height: screen.height };
  await place(pages.customer, leftArea);

  let step = 0;
  const caption = async (text, proText = text) => {
    await Promise.all(
      Object.entries(pages)
        .filter(([, page]) => page && !page.isClosed())
        .map(([who, page]) => page.evaluate((value) => window.__demoCaption?.(value), who === "pro" ? proText : text).catch(() => undefined)),
    );
  };
  const stage = async (info) => {
    step += 1;
    const heading = `${step}. ${info.title}`;
    say(`\n[${info.part}. ${PARTS[info.part].title}] ${heading}\n   ${info.caption}`);
    for (const shot of info.shots) await shot.focus?.scrollIntoViewIfNeeded().catch(() => undefined);
    await caption(`${heading} — ${info.caption}`, heading);
    await sleep(PAUSE_MS + (info.shots.length > 1 ? 1_000 / SPEED : 0));
  };

  say(`\nCustomer: ${accounts.customer.name} (left) · Professional: ${accounts.pro.name}, in Hindi (right) · Service: ${service.name}`);
  try {
    await runHappyPath({
      customer: pages.customer,
      pro: pages.pro,
      proContext,
      accounts,
      service,
      preference: setup.pro.gender === "female" ? "female" : "any",
      address: ADDRESS,
      route: ROUTE,
      stage,
      wait: sleep,
      stepGapMs: 2_500 / SPEED,
      typeDelay: 70,
      log: say,
      afterJob: () => restoreHours(accounts),
      openAdmin: async () => {
        const adminContext = await newContext({ locale: "en-IN" });
        pages.admin = await adminContext.newPage();
        watchClose(pages.admin);
        // The whole screen: the admin is a computer screen. Each step brings its own window forward.
        await place(pages.admin, { left: screen.left, top: screen.top, width: screen.width, height: screen.height });
        return pages.admin;
      },
    });
    await caption("Demo complete. Look around as long as you like; press Ctrl+C in the terminal to close these windows.", "Demo complete");
    say("\nDemo complete. The windows stay open so you can look around. Press Ctrl+C here to close them.");
    if (process.env.DEMO_EXIT_WHEN_DONE === "1") {
      await sleep(PAUSE_MS);
      exit(0);
    }
  } catch (error) {
    console.error(`\nThe demo stopped: ${error.message.split("\n")[0]}`);
    say("The windows stay open so you can see where it stopped. Press Ctrl+C here to close them.");
    await caption("The demo stopped here. See the terminal for why.").catch(() => undefined);
    if (process.env.DEMO_EXIT_WHEN_DONE === "1") exit(1);
  }
  // Wait for Ctrl+C or the windows being closed.
  await new Promise(() => undefined);
}

await main();
