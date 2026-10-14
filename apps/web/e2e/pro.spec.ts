import { randomUUID } from "node:crypto";
import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { API_URL, latestEmailLink, logIn, SEEDED } from "./support";

/** Plan workflows W11 (onboarding) and W12 (go online / offline), Phase 4. */

const ORIGIN = "http://localhost:5175";
const FARIDABAD = { latitude: 28.4089, longitude: 77.3178 };

/**
 * Headless browsers have no push service, so PushManager is replaced with a fake subscription
 * whose (https) endpoint the E2E API records alerts for. Everything else is the real code path.
 */
async function preparePhone(context: BrowserContext, page: Page) {
  await context.grantPermissions(["notifications", "geolocation"], { origin: ORIGIN });
  await context.setGeolocation(FARIDABAD);
  await page.addInitScript(() => {
    const endpoint = `https://push.example.test/e2e-${Math.random().toString(36).slice(2)}`;
    const state = { subscribed: false };
    const subscription = {
      endpoint,
      expirationTime: null,
      toJSON: () => ({ endpoint, expirationTime: null, keys: { p256dh: "BOrlb0pKXsmL5H6CpGW0Qn4UZ9z2lQ", auth: "pq8d0tRkLdQ2bJ5w" } }),
      unsubscribe: async () => true,
    };
    (window as unknown as { __e2eEndpoint: string }).__e2eEndpoint = endpoint;
    if ("PushManager" in window) {
      PushManager.prototype.getSubscription = async () => (state.subscribed ? (subscription as unknown as PushSubscription) : null);
      PushManager.prototype.subscribe = async () => {
        state.subscribed = true;
        return subscription as unknown as PushSubscription;
      };
    }
  });
}

test.describe("Onboarding (W11)", () => {
  test("the admin adds a professional, who sets a password and sees what's left before going online", async ({ page, request }) => {
    // Three accounts' pages in one test; the first test of a run also meets a cold dev server.
    test.setTimeout(60_000);
    const email = `kiran.${randomUUID().slice(0, 6)}@example.com`;
    await logIn(page, SEEDED.admin.email, SEEDED.admin.password);
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto("/admin/professionals/new");
    await page.getByLabel("Full name").fill("Kiran Yadav");
    await page.getByLabel("Mobile number").fill("98123 45678");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Salon for women (facials, waxing, threading)").check();
    await page.getByLabel("Base area").fill("Sector 21, Faridabad");
    await page.getByRole("button", { name: "Add and send email" }).click();

    await expect(page.getByText("Professional added. We emailed them a link to set their password.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/professionals\/[a-f0-9]{24}$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Kiran Yadav");
    await expect(page.getByText("Not set yet")).toBeVisible();
    await page.getByRole("button", { name: "Log out" }).click();

    const link = await latestEmailLink(request, email);
    await page.goto(link);
    await expect(page.getByRole("heading", { name: "Set your password" })).toBeVisible();
    await page.getByLabel("New password", { exact: true }).fill("mango-river-lantern-8");
    await page.getByRole("button", { name: "Set password and continue" }).click();

    await expect(page).toHaveURL(/\/pro$/);
    await expect(page.getByRole("heading", { name: "नमस्ते, Kiran" })).toBeVisible();
    await expect(page.getByText("आपकी प्रोफ़ाइल की जाँच चल रही है")).toBeVisible();
    await expect(page.getByRole("switch")).toBeDisabled();
    await expect(page.getByText("प्रोफ़ाइल वेरिफ़ाई होने के बाद आप ऑनलाइन हो सकेंगे।")).toBeVisible();
  });
});

test.describe("Going online (W12)", () => {
  test("a verified professional proves alerts work, goes online, shows up for the admin, and goes offline", async ({ page, context, request, browser }) => {
    test.setTimeout(90_000);
    await preparePhone(context, page);
    await logIn(page, SEEDED.professional.email, SEEDED.professional.password);
    await expect(page).toHaveURL(/\/pro$/);
    const toggle = page.getByRole("switch");
    await expect(toggle).toBeDisabled();

    // Alerts: subscribe this "phone" and send a real test alert through the API.
    await page.getByRole("button", { name: "टेस्ट अलर्ट भेजें" }).click();
    await expect(page.getByText("क्या टेस्ट अलर्ट आपके फ़ोन पर आया?")).toBeVisible();
    const endpoint = await page.evaluate(() => (window as unknown as { __e2eEndpoint: string }).__e2eEndpoint);
    const pushes = (await (await request.get(`${API_URL}/__test__/pushes`, { params: { endpoint } })).json()) as Array<{ kind: string; title: string }>;
    expect(pushes.map((push) => push.kind)).toContain("test");
    await page.getByRole("button", { name: "हाँ, आ गया" }).click();

    // Location is already allowed (granted for this origin), so every step is done:
    // the checklist folds away and the switch unlocks.
    await expect(page.getByRole("heading", { name: "काम के अलर्ट के लिए तैयार हों" })).toBeHidden();
    await expect(toggle).toBeEnabled();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await expect(page.getByText("ऑनलाइन").first()).toBeVisible();
    await expect(page.getByText("सबसे जल्दी काम पाने के लिए यह स्क्रीन खुली रखें।", { exact: false })).toBeVisible();

    // The admin sees her online.
    const adminPage = await browser.newPage();
    await logIn(adminPage, SEEDED.admin.email, SEEDED.admin.password);
    await expect(adminPage).toHaveURL(/\/admin$/);
    await adminPage.goto("/admin/professionals?online=1");
    await expect(adminPage.getByRole("button", { name: "Open Priya Verma" })).toBeVisible();
    await adminPage.close();

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  test("the bottom tabs reach jobs, earnings and profile", async ({ page }) => {
    await logIn(page, SEEDED.professional.email, SEEDED.professional.password);
    await expect(page).toHaveURL(/\/pro$/);
    await page.getByRole("link", { name: "मेरे काम" }).click();
    await expect(page.getByRole("heading", { name: "अभी कोई काम नहीं" })).toBeVisible();
    // The open tab is the one marked, not Home (whose address starts every other one).
    await expect(page.getByRole("link", { name: "मेरे काम", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("link", { name: "होम", exact: true })).not.toHaveAttribute("aria-current", "page");
    await page.getByRole("link", { name: "कमाई" }).click();
    await expect(page.getByRole("heading", { name: "अभी कोई कमाई नहीं" })).toBeVisible();
    await expect(page.getByRole("link", { name: "कमाई", exact: true })).toHaveAttribute("aria-current", "page");
    await page.getByRole("link", { name: "प्रोफ़ाइल" }).click();
    await expect(page.getByRole("heading", { name: "Priya Verma" })).toBeVisible();
    await expect(page.getByText("वेरिफ़ाइड", { exact: true })).toBeVisible();
  });
});
