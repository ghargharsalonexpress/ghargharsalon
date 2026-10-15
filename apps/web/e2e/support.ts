import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { type APIRequestContext, expect, type Page } from "@playwright/test";

export type Lang = "en" | "hi";
export type Brand = "orange" | "berry" | "teal";

/** 4:31 pm on 5 Oct 2026 IST: countdowns and relative times render identically on every run. */
export const FIXED_NOW = new Date("2026-10-05T16:31:00+05:30");

export const PAGES = ["/styleguide", "/samples/home", "/samples/checkout", "/samples/job-alert", "/samples/admin"] as const;
export const AUTH_PAGES = ["/login", "/admin/login", "/forgot-password", "/reset-password?token=not-a-real-token-but-long-enough-0123456789"] as const;

/** The E2E API (apps/api/scripts/e2e-server.ts). */
export const API_URL = "http://localhost:4100";

/** Seeded by the E2E API: the admin uses Team login, the professional their mobile number (ADR-0020). */
export const SEEDED = {
  admin: { email: "admin@e2e.test", password: "admin-e2e-password-1", phone: "9000000001" },
  professional: { email: "pro@e2e.test", phone: "9000000002" },
} as const;

/** Opens a page in a given language and brand with frozen time and loaded fonts. */
export async function openPage(page: Page, path: string, { lang = "en", brand = "orange" }: { lang?: Lang; brand?: Brand } = {}) {
  await page.clock.setFixedTime(FIXED_NOW);
  await page.addInitScript(
    ([l]) => {
      if (!window.sessionStorage.getItem("e2e-init")) {
        window.localStorage.setItem("lang", l);
        window.sessionStorage.setItem("e2e-init", "1");
      }
    },
    [lang] as const,
  );
  // ?brand= pins a hand-made colour ramp for the visit, so a spec that changes the site's colour
  // (Admin → Website, website.spec) never changes what the others see.
  await page.goto(`${path}${path.includes("?") ? "&" : "?"}brand=${brand}`);
  await page.locator("main").first().waitFor();
  await page.evaluate(() => document.fonts.ready);
}

export const uniqueEmail = (prefix = "e2e") => `${prefix}.${randomUUID().slice(0, 8)}@example.com`;

/** A mobile number no other E2E account has (one account per number, ADR-0020). */
export const uniquePhone = () => `9${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;

/** Creates an account through the E2E API. Only admins can have a password. */
export async function createUser(
  request: APIRequestContext,
  user: {
    role: "customer" | "professional" | "admin";
    email?: string;
    name?: string;
    phone?: string;
    password?: string;
    locale?: Lang;
    /** Professionals only: verified, and online at this point. */
    verified?: boolean;
    online?: { lat: number; lng: number };
  },
): Promise<{ id: string; phone: string }> {
  const phone = user.phone ?? uniquePhone();
  const res = await request.post(`${API_URL}/__test__/users`, {
    data: { name: user.name ?? "Test Person", ...user, phone },
  });
  expect(res.status(), await res.text()).toBe(201);
  const { id } = (await res.json()) as { id: string };
  return { id, phone };
}

/** The newest SMS login code the E2E API "sent" to a number. */
export async function latestCode(request: APIRequestContext, phone: string): Promise<string> {
  const res = await request.get(`${API_URL}/__test__/sms/latest`, { params: { phone } });
  expect(res.ok(), `no SMS code for ${phone}`).toBe(true);
  return ((await res.json()) as { code: string }).code;
}

/** The link in the newest email sent to an address. */
export async function latestEmailLink(request: APIRequestContext, to: string, contains = "/reset-password"): Promise<string> {
  const res = await request.get(`${API_URL}/__test__/emails/latest`, { params: { to } });
  expect(res.ok(), `no email for ${to}`).toBe(true);
  const { links } = (await res.json()) as { links: string[] };
  const link = links.find((candidate) => candidate.includes(contains));
  if (!link) throw new Error(`no ${contains} link in the email to ${to}`);
  return link;
}

/**
 * Customers and professionals: mobile number → "Get OTP" → the 6-digit code (typed like a
 * person; the last digit submits it). Works in English and Hindi. Waits until /login is left.
 */
export async function logIn(page: Page, phone: string) {
  await page.goto("/login");
  await page.locator('input[autocomplete="tel-national"]').fill(phone);
  await page.locator('form button[type="submit"]').click();
  const first = page.locator('input[autocomplete="one-time-code"]');
  await first.waitFor();
  const code = await latestCode(page.request, phone);
  await first.click();
  await page.keyboard.type(code);
  await page.waitForURL((url) => url.pathname !== "/login");
}

/** Admins: Team login with email + password. */
export async function logInAsTeam(page: Page, email: string, password: string) {
  await page.goto("/admin/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** axe on the current page (WCAG 2.2 AA, plan B11), with a readable summary on failure. */
export async function expectNoViolations(page: Page, include?: string) {
  // Let entering toasts and dialogs finish fading in, so axe judges their final colours
  // (endless animations such as the "live" dot are ignored). A toast can appear a tick after
  // the action that caused it, so settle twice: the first pass can run before it has started,
  // and axe would then read a half-faded grey instead of the real colours.
  const settled = () =>
    page
      .waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== "running" || animation.effect?.getTiming().iterations === Infinity), undefined, { timeout: 5_000 })
      .catch(() => undefined);
  await settled();
  await page.waitForTimeout(100);
  await settled();
  // Whatever the animations say, never judge a surface that is still see-through.
  await page
    .waitForFunction(
      () =>
        [...document.querySelectorAll<HTMLElement>(".MuiSnackbar-root, .MuiSnackbarContent-root, .MuiDialog-paper")].every(
          (element) => Number(getComputedStyle(element).opacity) === 1,
        ),
      undefined,
      { timeout: 5_000 },
    )
    .catch(() => undefined);
  const builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  if (include) builder.include(include);
  const { violations } = await builder.analyze();
  // failureSummary carries the detail that makes a contrast failure fixable (the two colours and the ratio).
  const summary = violations.map((v) => ({ rule: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n) => ({ target: n.target.join(" "), why: n.failureSummary })) }));
  expect(summary).toEqual([]);
}
