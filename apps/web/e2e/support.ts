import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { type APIRequestContext, expect, type Page } from "@playwright/test";

export type Lang = "en" | "hi";
export type Brand = "berry" | "teal";

/** 4:31 pm on 5 Oct 2026 IST: countdowns and relative times render identically on every run. */
export const FIXED_NOW = new Date("2026-10-05T16:31:00+05:30");

export const PAGES = ["/styleguide", "/samples/home", "/samples/checkout", "/samples/job-alert", "/samples/admin"] as const;
export const AUTH_PAGES = ["/login", "/signup", "/forgot-password", "/reset-password?token=not-a-real-token-but-long-enough-0123456789"] as const;

/** The E2E API (apps/api/scripts/e2e-server.ts). */
export const API_URL = "http://localhost:4100";

/** Seeded by the E2E API. */
export const SEEDED = {
  admin: { email: "admin@e2e.test", password: "admin-e2e-password-1" },
  professional: { email: "pro@e2e.test", password: "pro-e2e-password-1" },
} as const;

export const STRONG_PASSWORD = "lantern-orchid-91-river";

/** Opens a page in a given language and brand with frozen time and loaded fonts. */
export async function openPage(page: Page, path: string, { lang = "en", brand = "berry" }: { lang?: Lang; brand?: Brand } = {}) {
  await page.clock.setFixedTime(FIXED_NOW);
  await page.addInitScript(
    ([l, b]) => {
      if (!window.sessionStorage.getItem("e2e-init")) {
        window.localStorage.setItem("lang", l);
        window.localStorage.setItem("brandDirection", b);
        window.sessionStorage.setItem("e2e-init", "1");
      }
    },
    [lang, brand] as const,
  );
  await page.goto(path);
  await page.locator("main").first().waitFor();
  await page.evaluate(() => document.fonts.ready);
}

export const uniqueEmail = (prefix = "e2e") => `${prefix}.${randomUUID().slice(0, 8)}@example.com`;

/** Creates an account through the E2E API; without a password it returns the set-password link. */
export async function createUser(
  request: APIRequestContext,
  user: {
    role: "customer" | "professional" | "admin";
    email: string;
    name?: string;
    phone?: string;
    password?: string;
    locale?: Lang;
    /** Professionals only: verified, and online at this point. */
    verified?: boolean;
    online?: { lat: number; lng: number };
  },
): Promise<{ id: string; setPasswordUrl: string | null }> {
  const res = await request.post(`${API_URL}/__test__/users`, {
    data: { name: user.name ?? "Test Person", phone: user.phone ?? "9876543210", ...user },
  });
  expect(res.status(), await res.text()).toBe(201);
  return (await res.json()) as { id: string; setPasswordUrl: string | null };
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

export async function logIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** axe on the current page (WCAG 2.2 AA, plan B11), with a readable summary on failure. */
export async function expectNoViolations(page: Page, include?: string) {
  // Let entering toasts and dialogs finish fading in, so axe judges their final colours
  // (endless animations such as the "live" dot are ignored).
  await page
    .waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== "running" || animation.effect?.getTiming().iterations === Infinity), undefined, { timeout: 5_000 })
    .catch(() => undefined);
  const builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  if (include) builder.include(include);
  const { violations } = await builder.analyze();
  const summary = violations.map((v) => ({ rule: v.id, impact: v.impact, help: v.help, targets: v.nodes.map((n) => n.target.join(" ")) }));
  expect(summary).toEqual([]);
}
