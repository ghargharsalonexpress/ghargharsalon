import { type Browser, expect, type Page } from "@playwright/test";
import { createUser, logIn, uniqueEmail } from "./support";

/** Shared steps of the booking flow (customer and professional), used by several specs. */

export type Point = { latitude: number; longitude: number };

export async function onlineProfessional(browser: Browser, request: Parameters<typeof createUser>[0], name: string, at: Point) {
  const email = uniqueEmail("pro");
  const { phone } = await createUser(request, { role: "professional", email, name, locale: "en", verified: true, online: { lat: at.latitude, lng: at.longitude } });
  const context = await browser.newContext({ geolocation: at, permissions: ["geolocation"] });
  const page = await context.newPage();
  return { page, email, phone, context, close: () => context.close() };
}

export async function customerWithCart(browser: Browser, request: Parameters<typeof createUser>[0], at: Point, viewport = { width: 1280, height: 900 }, name = "Neha Kapoor") {
  const email = uniqueEmail("customer");
  const { phone } = await createUser(request, { role: "customer", email, name });
  const context = await browser.newContext({ geolocation: at, permissions: ["geolocation"], viewport });
  const page = await context.newPage();
  await logIn(page, phone);
  await expect(page).toHaveURL(/\/services$/);
  await page.goto("/services?category=salon-for-women");
  await page.getByRole("button", { name: "Add Fruit facial" }).click();
  await page.getByRole("link", { name: "Cart, 1 items" }).click();
  // The cart's button says "Continue to checkout"; on phones the sticky bar says "Checkout".
  await page.getByRole("link", { name: viewport.width < 900 ? "Checkout" : "Continue to checkout", exact: true }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  return { page, email, phone, close: () => context.close() };
}

/** First address at checkout: the pin from the phone, then the flat and street (W3). */
export async function addAddress(page: Page) {
  await page.getByRole("button", { name: "Add address" }).click();
  const dialog = page.getByRole("dialog", { name: "Add an address" });
  // The pin may already be set from the location shared on arrival (ADR-0021); either way, take it now.
  await dialog.getByRole("button", { name: /^(Use my current location|Update location)$/ }).click();
  await expect(dialog.getByText(/Location set/)).toBeVisible();
  await dialog.getByLabel("Flat or house number").fill("Flat 12");
  await dialog.getByLabel("Street, sector or area").fill("Sector 62");
  await dialog.getByLabel("City").fill("Noida");
  await dialog.getByLabel("PIN code").fill("201309");
  await dialog.getByRole("button", { name: "Save address" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Home · Default")).toBeVisible();
}

/** Pays on the local test sheet (Razorpay replaces it once keys are set) and lands on the booking. */
export async function payWithTestSheet(page: Page, amount: string) {
  await expect(page.getByText("Professionals are available")).toBeVisible();
  await page.getByRole("button", { name: `Pay ${amount}` }).click();
  const sheet = page.getByRole("dialog", { name: "Test payment" });
  await sheet.getByRole("button", { name: `Pay ${amount}` }).click();
  await expect(page).toHaveURL(/\/bookings\/[a-f0-9]{24}$/);
  await expect(page.getByRole("heading", { name: "Finding a professional", level: 1 })).toBeVisible();
  await expect(page.getByText(`Payment of ${amount} received.`)).toBeVisible();
}
