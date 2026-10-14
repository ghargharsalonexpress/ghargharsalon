import { expect, test } from "@playwright/test";
import { API_URL, openPage } from "./support";

/** Plan workflows W1 (discover and add to cart) and W17 (contact), on the E2E fixture catalogue. */

test.describe("Discover and add to cart (W1)", () => {
  test("home lists categories with real counts and prices", async ({ page }) => {
    await openPage(page, "/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("A verified professional at your door in 10–15 minutes");
    const salon = page.getByRole("link", { name: /Salon for women/ });
    // The hidden service is not counted; the cheapest visible one sets "From".
    await expect(salon).toContainText("3 services · From ₹349");
    await salon.click();
    await expect(page).toHaveURL(/\/services\?category=salon-for-women$/);
    await expect(page.getByRole("heading", { name: "Salon for women", level: 2 })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "3 services" })).toBeVisible();
  });

  test("filters, gender and search live in the URL", async ({ page }) => {
    await openPage(page, "/services?category=salon-for-women");
    await page.getByRole("button", { name: "Waxing" }).click();
    await expect(page).toHaveURL(/filter=waxing/);
    await expect(page.getByRole("heading", { name: "Rica wax, full arms" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Fruit facial" })).toHaveCount(0);

    await page.getByText("Men", { exact: true }).click();
    await expect(page).toHaveURL(/gender=men/);
    await expect(page.getByRole("heading", { name: "Beard trim" })).toBeVisible();

    await page.getByText("Women", { exact: true }).click();
    // Typed key by key, as fast as a quick typist: no letter may get lost while the URL catches up.
    await page.getByLabel("Search services").pressSequentially("glow");
    await expect(page.getByLabel("Search services")).toHaveValue("glow");
    await expect(page).toHaveURL(/q=glow/);
    await expect(page.getByRole("heading", { name: "1 result for “glow”" })).toBeVisible();
    await page.getByLabel("Search services").fill("pedicure");
    await expect(page.getByRole("heading", { name: "No services match “pedicure”" })).toBeVisible();
    // The empty state's button (the field has its own small clear button too).
    await page.getByRole("button", { name: "Clear search" }).last().click();
    await expect(page.getByLabel("Search services")).toHaveValue("");
    // The retired service never appears.
    await expect(page.getByText("Retired bleach")).toHaveCount(0);
  });

  test("a single-option service is added from the list and the quantity follows the cart", async ({ page }) => {
    await openPage(page, "/services?category=salon-for-women");
    await page.getByRole("button", { name: "Add Fruit facial" }).click();
    const stepper = page.getByRole("group", { name: "Fruit facial" });
    await expect(stepper).toBeVisible();
    // Focus moves to the stepper that replaced the button.
    await expect(stepper.getByRole("button").first()).toBeFocused();
    await stepper.getByRole("button", { name: "Increase quantity" }).click();
    await expect(page.getByRole("link", { name: "Cart, 2 items" })).toBeVisible();
  });

  test("details open as a sheet, an option is chosen, and the cart prices it on the server", async ({ page }) => {
    await openPage(page, "/services?category=salon-for-women");
    await page.getByRole("link", { name: "Korean glow facial", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: "Korean glow facial" });
    await expect(sheet).toBeVisible();
    await expect(page).toHaveURL(/\/services\/korean-glow-facial\?category=salon-for-women$/);
    await expect(sheet.getByText("A platform fee of ₹11 applies once per booking.")).toBeVisible();

    await sheet.getByText("3 sessions over a month").click();
    await sheet.getByRole("button", { name: "Add to cart · ₹2,699" }).click();
    await expect(sheet.getByText("In your cart")).toBeVisible();

    // Escape closes the sheet and returns to the same list.
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(page).toHaveURL(/\/services\?category=salon-for-women$/);

    await page.getByRole("link", { name: "Cart, 1 items" }).click();
    await expect(page.getByRole("heading", { name: "Your cart", level: 1 })).toBeVisible();
    await expect(page.getByText("Option: 3 sessions over a month")).toBeVisible();
    const summary = page.getByRole("complementary", { name: "Price details" });
    await expect(summary.getByText("Platform fee")).toBeVisible();
    await expect(summary.getByText("₹2,710")).toBeVisible();
  });

  test("a shared link opens the sheet over the list, and an unknown service says so", async ({ page }) => {
    await openPage(page, "/services/fruit-facial");
    const sheet = page.getByRole("dialog", { name: "Fruit facial" });
    await expect(sheet.getByRole("heading", { name: "What's included" })).toBeVisible();
    await expect(sheet.getByText("Removes dirt and oil.")).toBeVisible();
    await sheet.getByRole("button", { name: "Close" }).click();
    await expect(page).toHaveURL(/\/services$/);

    await openPage(page, "/services/no-such-service");
    await expect(page.getByRole("dialog", { name: "This service isn't available" })).toBeVisible();
  });

  test("a changed price is shown and must be accepted before checkout", async ({ page }) => {
    // A cart saved when the fruit facial cost ₹499.
    await page.addInitScript(() => {
      const line = {
        key: "fruit-facial:standard",
        serviceSlug: "fruit-facial",
        tierId: "standard",
        quantity: 1,
        unitPricePaise: 49_900,
        name: { en: "Fruit facial", hi: "" },
        tierLabel: { en: "Standard", hi: "" },
        tierCount: 1,
        durationMin: 45,
      };
      if (!window.sessionStorage.getItem("cart-seeded")) {
        window.localStorage.setItem("cart:v1", JSON.stringify({ state: { lines: [line], maxQuantity: 3 }, version: 1 }));
        window.sessionStorage.setItem("cart-seeded", "1");
      }
    });
    await openPage(page, "/cart");
    const notice = page.getByRole("status").filter({ hasText: "Some prices or limits changed" });
    await expect(notice).toContainText("Fruit facial now costs ₹649.");
    await expect(page.getByRole("button", { name: "Continue to checkout" })).toBeDisabled();

    await notice.getByRole("button", { name: "Update my cart" }).click();
    await expect(notice).toBeHidden();
    await expect(page.getByRole("link", { name: "Continue to checkout" })).toBeVisible();
  });

  test("Hindi shows Hindi names and falls back to English where none is written", async ({ page }) => {
    await openPage(page, "/services?category=salon-for-women", { lang: "hi" });
    await expect(page.getByRole("heading", { name: "फ्रूट फ़ेशियल" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Korean glow facial" })).toBeVisible();
    await expect(page.getByText("₹649").first()).toBeVisible();
  });
});

test.describe("Pages", () => {
  test("policies quote the live fees, and an unknown policy is a 404", async ({ page }) => {
    await openPage(page, "/legal/cancellation-refund");
    await expect(page.getByRole("heading", { name: "Cancellation & refund policy", level: 1 })).toBeVisible();
    await expect(page.getByText(/₹99/).first()).toBeVisible();
    await openPage(page, "/legal/nothing");
    await expect(page.getByRole("heading", { name: "This page doesn't exist", level: 1 })).toBeVisible();
  });

  test("legacy addresses redirect", async ({ page }) => {
    await page.goto("/all-services");
    await expect(page).toHaveURL(/\/services$/);
    await page.goto("/about-us");
    await expect(page).toHaveURL(/\/about$/);
  });
});

test.describe("Contact (W17)", () => {
  test("validation, then a sent message the admin can read", async ({ page, request }) => {
    await openPage(page, "/contact");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText("This is required.").first()).toBeVisible();

    const email = `contact.${Date.now()}@example.com`;
    await page.getByLabel("Full name").fill("Meera Iyer");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Your message").fill("Short");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText("Write at least 10 characters so we can help.")).toBeVisible();

    await page.getByLabel("Your message").fill("Can someone come to Sector 21 this evening?");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("heading", { name: "Thanks for writing to us" })).toBeVisible();
    await expect(page.getByText(`We've emailed a copy to ${email}.`)).toBeVisible();

    const ack = await request.get(`${API_URL}/__test__/emails/latest`, { params: { to: email } });
    expect(ack.ok()).toBe(true);
  });
});
