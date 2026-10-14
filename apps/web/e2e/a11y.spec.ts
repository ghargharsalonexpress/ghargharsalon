import { expect, test } from "@playwright/test";
import { AUTH_PAGES, type Brand, expectNoViolations, type Lang, logIn, openPage, PAGES, SEEDED } from "./support";

const MATRIX: Array<{ lang: Lang; brand: Brand; width: number }> = [
  { lang: "en", brand: "orange", width: 1440 },
  { lang: "en", brand: "orange", width: 360 },
  { lang: "hi", brand: "orange", width: 360 },
  { lang: "en", brand: "teal", width: 1440 },
];

test.describe("WCAG 2.2 AA (axe)", () => {
  for (const path of PAGES) {
    for (const { lang, brand, width } of MATRIX) {
      test(`${path} · ${lang} · ${brand} · ${width}px`, async ({ page }) => {
        // The style guide is a very long page; axe needs more than the default time on a busy machine.
        if (path === "/styleguide") test.setTimeout(120_000);
        await page.setViewportSize({ width, height: 900 });
        await openPage(page, path, { lang, brand });
        await expectNoViolations(page);
      });
    }
  }

  for (const path of AUTH_PAGES) {
    for (const { lang, width } of [
      { lang: "en", width: 360 },
      { lang: "hi", width: 360 },
      { lang: "en", width: 1440 },
    ] as const) {
      test(`${path.split("?")[0]} · ${lang} · ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await openPage(page, path, { lang });
        await expectNoViolations(page);
      });
    }
  }

  // Public website (Phase 3), on the E2E fixture catalogue.
  const PUBLIC_PAGES = [
    "/",
    "/services",
    "/services?category=salon-for-women",
    "/services/korean-glow-facial",
    "/cart",
    "/about",
    "/contact",
    "/legal/privacy",
    "/register-as-professional",
  ] as const;
  for (const path of PUBLIC_PAGES) {
    for (const { lang, width } of [
      { lang: "en", width: 1440 },
      { lang: "en", width: 360 },
      { lang: "hi", width: 360 },
    ] as const) {
      test(`${path} · ${lang} · ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await openPage(page, path, { lang });
        // Wait for the catalogue so the real content is checked, not the skeleton.
        if (path === "/services/korean-glow-facial") {
          await expect(page.getByRole("dialog")).toBeVisible();
          await page.waitForLoadState("networkidle");
        }
        else if (path.startsWith("/services")) await expect(page.getByRole("heading", { level: 3 }).first()).toBeVisible();
        await expectNoViolations(page);
      });
    }
  }

  test("cart with services · hi · 360px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await openPage(page, "/services/fruit-facial", { lang: "hi" });
    await page.getByRole("button", { name: /कार्ट में जोड़ें/ }).click();
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "आपका कार्ट", level: 1 })).toBeVisible();
    await expect(page.getByText("₹660").first()).toBeVisible();
    await expectNoViolations(page);
  });

  for (const width of [1440, 360]) {
    test(`admin catalogue pages · ${width}px`, async ({ page }) => {
      // Four pages, each fully scanned.
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height: 900 });
      await logIn(page, SEEDED.admin.email, SEEDED.admin.password);
      await expect(page).toHaveURL(/\/admin$/);
      for (const path of ["/admin/services", "/admin/services/new", "/admin/categories", "/admin/messages"]) {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(page.locator("[aria-busy=true]")).toHaveCount(0);
        await expectNoViolations(page);
      }
    });
  }

  test("professional panel · hi · 360px", async ({ page }) => {
    test.setTimeout(120_000);
    // Tall enough that nothing sits under the sticky tabs, so axe sees every target uncovered.
    await page.setViewportSize({ width: 360, height: 1600 });
    await logIn(page, SEEDED.professional.email, SEEDED.professional.password);
    await expect(page).toHaveURL(/\/pro$/);
    for (const path of ["/pro", "/pro/jobs", "/pro/earnings", "/pro/profile"]) {
      await page.goto(path);
      await expect(page.getByRole("navigation", { name: "प्रोफेशनल" })).toBeVisible();
      await expect(page.locator("[aria-busy=true]")).toHaveCount(0);
      await expectNoViolations(page);
    }
  });

  test("admin professionals pages · 1440px", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await logIn(page, SEEDED.admin.email, SEEDED.admin.password);
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto("/admin/professionals");
    await expect(page.getByRole("heading", { name: "Professionals", level: 1 })).toBeVisible();
    await expectNoViolations(page);
    await page.getByRole("button", { name: "Open Priya Verma" }).click();
    await expect(page.getByRole("heading", { name: "Right now" })).toBeVisible();
    await expectNoViolations(page);
    await page.goto("/admin/professionals/new");
    await expect(page.getByRole("heading", { name: "Add professional", level: 1 })).toBeVisible();
    await expectNoViolations(page);
  });

  test("login form with errors showing", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await openPage(page, "/login");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByText("This is required.").first()).toBeVisible();
    await expectNoViolations(page);
  });

  test("bottom sheet and full-screen form dialog on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await openPage(page, "/styleguide?embed=1");

    await page.getByRole("button", { name: "Dialog (bottom sheet on phones)" }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await expectNoViolations(page, "[role=dialog]");
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();

    await page.getByRole("button", { name: "Form dialog (full screen on phones)" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expectNoViolations(page, "[role=dialog]");
  });
});

test.describe("Keyboard", () => {
  test("skip link moves focus to the main content", async ({ page }) => {
    await openPage(page, "/samples/home");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.locator("main#main")).toBeFocused();
  });

  test("closing a dialog returns focus to the button that opened it", async ({ page }) => {
    await openPage(page, "/styleguide?embed=1");
    const opener = page.getByRole("button", { name: "Confirm a refund" });
    await opener.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(opener).toBeFocused();
  });
});
