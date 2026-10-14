import { randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import { logInAsTeam, openPage, SEEDED } from "./support";

/** Plan workflows W13 (admin catalogue) and W17 (the admin side of contact messages). */

async function logInAsAdmin(page: Page) {
  await logInAsTeam(page, SEEDED.admin.email, SEEDED.admin.password);
  await expect(page).toHaveURL(/\/admin$/);
}

test.describe("Admin catalogue (W13)", () => {
  test("a new service starts hidden, then is published and appears on the website", async ({ page, browser }) => {
    test.setTimeout(90_000);
    const name = `Hot towel shave ${randomUUID().slice(0, 6)}`;
    await logInAsAdmin(page);
    await page.getByRole("link", { name: "Services" }).first().click();
    await expect(page.getByRole("heading", { name: "Services", level: 1 })).toBeVisible();
    await page.getByRole("link", { name: "New service" }).first().click();

    // Saving empty shows what's missing.
    await page.getByRole("button", { name: "Create service" }).click();
    await expect(page.getByText("Some fields need fixing before this can be saved.")).toBeVisible();

    await page.getByLabel("Name", { exact: true }).fill(name);
    await expect(page.getByText("Hindi missing")).toBeVisible();
    await page.getByLabel("Short description").fill("A close shave finished with a hot towel.");
    await page.getByText("Men", { exact: true }).click();
    await page.getByLabel("Grooming for men").check();
    await page.getByLabel("Price", { exact: true }).fill("199");
    await page.getByLabel("Duration").fill("25");
    await page.getByRole("button", { name: "Create service" }).click();

    await expect(page.getByText("Service created")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/services\/[a-f0-9]{24}\/edit$/);
    await expect(page.getByText("All changes saved")).toBeVisible();

    // Hidden: customers don't see it yet.
    const visitor = await browser.newPage();
    await openPage(visitor, "/services?gender=men");
    await expect(visitor.getByRole("heading", { name: "Beard trim" })).toBeVisible();
    await expect(visitor.getByRole("heading", { name })).toHaveCount(0);

    await page.getByLabel("Show on the website").check();
    await expect(page.getByText("You have unsaved changes")).toBeVisible();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Changes saved", { exact: true })).toBeVisible();

    await visitor.reload();
    await expect(visitor.getByRole("heading", { name })).toBeVisible();
    await expect(visitor.getByText("₹199").first()).toBeVisible();
    await visitor.close();
  });

  test("two admins editing the same service: the second save is stopped and can load the latest", async ({ page, browser }) => {
    // Two sessions and two editors on the development server: slower than one page.
    test.setTimeout(90_000);
    await logInAsAdmin(page);
    await page.goto("/admin/services?q=beard");
    await page.getByRole("button", { name: "Edit Beard trim" }).click();
    await expect(page.getByRole("heading", { name: "Beard trim", level: 1 })).toBeVisible();
    const editUrl = page.url();

    const other = await browser.newPage();
    await logInAsTeam(other, SEEDED.admin.email, SEEDED.admin.password);
    await expect(other).toHaveURL(/\/admin$/);
    await other.goto(editUrl);
    await other.getByLabel("Short description").fill("Shape, trim and a hot towel finish.");
    await other.getByRole("button", { name: "Save changes" }).click();
    await expect(other.getByText("Changes saved", { exact: true })).toBeVisible();
    await other.close();

    await page.getByLabel("Short description").fill("My stale edit.");
    await page.getByRole("button", { name: "Save changes" }).click();
    const dialog = page.getByRole("dialog", { name: "Someone else saved this service" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Load their version" }).click();
    await expect(page.getByLabel("Short description")).toHaveValue("Shape, trim and a hot towel finish.");
  });

  test("leaving with unsaved changes asks first", async ({ page }) => {
    await logInAsAdmin(page);
    await page.goto("/admin/services?q=fruit");
    await page.getByRole("button", { name: "Edit Fruit facial" }).click();
    await page.getByLabel("Short description").fill("Unsaved words.");
    await page.getByRole("link", { name: "All services" }).click();
    const dialog = page.getByRole("dialog", { name: "Leave without saving?" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Keep editing" }).click();
    await expect(page.getByLabel("Short description")).toHaveValue("Unsaved words.");
  });

  test("a category is created and moved with the keyboard-friendly arrows", async ({ page }) => {
    const name = `Nails ${randomUUID().slice(0, 6)}`;
    await logInAsAdmin(page);
    await page.goto("/admin/categories");
    await page.getByRole("button", { name: "New category" }).first().click();
    const dialog = page.getByRole("dialog", { name: "New category" });
    await dialog.getByLabel("Name", { exact: true }).fill(name);
    await dialog.getByRole("button", { name: "Create category" }).click();
    await expect(page.getByText("Category created")).toBeVisible();

    await page.getByRole("button", { name: `Move ${name} up` }).click();
    await expect(page.getByText(`${name} moved to position 1`)).toBeVisible();
    const women = page.getByRole("region", { name: "Women" });
    await expect(women.getByRole("listitem").first()).toContainText(name);
  });
});

test.describe("Admin messages (W17)", () => {
  test("a visitor's message is read and marked as replied", async ({ page }) => {
    const sender = `Rohan ${randomUUID().slice(0, 6)}`;
    await openPage(page, "/contact");
    await page.getByLabel("Full name").fill(sender);
    await page.getByLabel("Email", { exact: true }).fill(`rohan.${Date.now()}@example.com`);
    await page.getByLabel("Your message").fill("Do you have professionals in Indiranagar?");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("heading", { name: "Thanks for writing to us" })).toBeVisible();

    await logInAsAdmin(page);
    await page.goto("/admin/messages");
    await page.getByRole("button", { name: `Open the message from ${sender}` }).click();
    const dialog = page.getByRole("dialog", { name: `Message from ${sender}` });
    await expect(dialog.getByText("Do you have professionals in Indiranagar?")).toBeVisible();
    await dialog.getByText("Replied", { exact: true }).click();
    await expect(page.getByText("Marked as Replied")).toBeVisible();
  });
});
