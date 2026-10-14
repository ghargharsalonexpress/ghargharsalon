import { expect, test } from "@playwright/test";
import { type Brand, type Lang, openPage } from "./support";

/**
 * Visual baseline (plan Phase 1 DoD). Update intentionally with `npm run e2e:update`
 * and review every changed image before accepting it.
 */
const STYLEGUIDE: Array<{ width: number; lang: Lang }> = [
  { width: 360, lang: "en" },
  { width: 360, lang: "hi" },
  { width: 768, lang: "en" },
  { width: 1024, lang: "en" },
  { width: 1440, lang: "en" },
];

test.describe("Style guide", () => {
  for (const { width, lang } of STYLEGUIDE) {
    test(`${width}px · ${lang}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      // Embedded mode drops the sticky toolbar so it can't overlap the full-page capture.
      await openPage(page, "/styleguide?embed=1", { lang });
      await expect(page).toHaveScreenshot(`styleguide-${width}-${lang}.png`, { fullPage: true });
    });
  }
});

const SAMPLES: Array<{ path: string; name: string; width: number; lang: Lang; brand: Brand; fullPage: boolean }> = [
  { path: "/samples/home", name: "home", width: 360, lang: "en", brand: "berry", fullPage: true },
  { path: "/samples/home", name: "home", width: 360, lang: "hi", brand: "berry", fullPage: true },
  { path: "/samples/home", name: "home", width: 1440, lang: "en", brand: "berry", fullPage: true },
  { path: "/samples/home", name: "home", width: 1440, lang: "en", brand: "teal", fullPage: false },
  { path: "/samples/checkout", name: "checkout", width: 360, lang: "en", brand: "berry", fullPage: false },
  { path: "/samples/checkout", name: "checkout", width: 360, lang: "hi", brand: "berry", fullPage: false },
  { path: "/samples/checkout", name: "checkout", width: 1440, lang: "en", brand: "berry", fullPage: false },
  { path: "/samples/job-alert", name: "job-alert", width: 360, lang: "en", brand: "berry", fullPage: false },
  { path: "/samples/job-alert", name: "job-alert", width: 360, lang: "hi", brand: "berry", fullPage: false },
  { path: "/samples/job-alert", name: "job-alert", width: 360, lang: "en", brand: "teal", fullPage: false },
  { path: "/samples/admin", name: "admin", width: 360, lang: "en", brand: "berry", fullPage: true },
  { path: "/samples/admin", name: "admin", width: 1024, lang: "en", brand: "berry", fullPage: false },
  { path: "/samples/admin", name: "admin", width: 1440, lang: "en", brand: "berry", fullPage: true },
];

test.describe("Samples", () => {
  for (const sample of SAMPLES) {
    const label = `${sample.name}-${sample.width}-${sample.lang}-${sample.brand}`;
    test(label, async ({ page }) => {
      await page.setViewportSize({ width: sample.width, height: sample.width < 600 ? 800 : 900 });
      await openPage(page, sample.path, { lang: sample.lang, brand: sample.brand });
      await expect(page).toHaveScreenshot(`${label}.png`, { fullPage: sample.fullPage });
    });
  }
});

test("bottom sheet on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openPage(page, "/styleguide?embed=1");
  await page.getByRole("button", { name: "Dialog (bottom sheet on phones)" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveScreenshot("bottom-sheet-360-en.png");
});
