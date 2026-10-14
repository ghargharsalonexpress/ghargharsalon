import { expect, test } from "@playwright/test";
import { addAddress, customerWithCart, onlineProfessional, payWithTestSheet } from "./flows";
import { expectNoViolations, logInAsTeam, SEEDED } from "./support";

/**
 * Admin operations (plan Phase 8, W14–W16): a booking that's searching is found from the
 * dashboard, offered directly, annotated, cancelled with a refund; the customer is blocked and
 * unblocked; the audit log shows it all; a setting is changed with a preview and changed back.
 */

test.describe("Admin operations (Phase 8)", () => {
  test("intervene on a searching booking, then customers, money, audit and settings", async ({ browser, request, page }) => {
    // Seven axe scans and two browsers: generous on a busy machine.
    test.setTimeout(420_000);
    // A professional online in Rohini who never answers by herself, and a customer nearby.
    const PRO_AT = { latitude: 28.7363, longitude: 77.1123 };
    const HOME = { latitude: 28.7371, longitude: 77.1131 };
    const pro = await onlineProfessional(browser, request, "Kavita Singh", PRO_AT);
    const customer = await customerWithCart(browser, request, HOME, { width: 1280, height: 900 }, "Ritu Malhotra");
    await addAddress(customer.page);
    await payWithTestSheet(customer.page, "₹660");
    const meta = await customer.page.getByText(/^BK-\d+ · Booked /).textContent();
    const number = /BK-\d+/.exec(meta ?? "")?.[0] ?? "";
    expect(number).toMatch(/^BK-\d+$/);

    // The dashboard and the live board show it searching.
    await page.setViewportSize({ width: 1440, height: 900 });
    await logInAsTeam(page, SEEDED.admin.email, SEEDED.admin.password);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Right now" })).toBeVisible();
    await expectNoViolations(page);
    await page.getByRole("link", { name: "Live board" }).first().click();
    await expect(page.getByRole("heading", { name: "Live board", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: number })).toBeVisible();
    await expectNoViolations(page);

    // Find it in Bookings by its number and open it.
    await page.goto("/admin/bookings");
    // Typed key by key: the search follows the URL, and no letter may get lost on the way.
    await page.getByLabel("Number, name, email or phone").pressSequentially(number);
    await expect(page.getByLabel("Number, name, email or phone")).toHaveValue(number);
    await page.getByRole("button", { name: `Open ${number}` }).click();
    await expect(page).toHaveURL(/\/admin\/bookings\/[a-f0-9]{24}$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(number);
    await expect(page.getByText("Ritu Malhotra")).toBeVisible();
    await expectNoViolations(page);

    // An internal note.
    await page.getByLabel("Add a note").fill("Called the customer: running 5 minutes behind is fine.");
    await page.getByRole("button", { name: "Save note" }).click();
    await expect(page.getByText("Note saved")).toBeVisible();
    await expect(page.getByText("Called the customer: running 5 minutes behind is fine.")).toBeVisible();

    // A direct offer to the nearest eligible professional.
    await page.getByRole("button", { name: "Send direct offer" }).first().click();
    const offer = page.getByRole("dialog", { name: "Send a direct offer" });
    await offer.getByText("Kavita Singh").click();
    await offer.getByRole("button", { name: "Send offer" }).click();
    await expect(page.getByText("Offer sent to Kavita Singh")).toBeVisible();
    await expect(offer).toBeHidden();
    await expect(page.getByText("Direct offer", { exact: false }).first()).toBeVisible();

    // Cancel with a full refund: the consequence is spelled out first.
    await page.getByRole("button", { name: "Cancel booking" }).first().click();
    const cancel = page.getByRole("dialog", { name: `Cancel ${number}?` });
    await expect(cancel.getByText("Refund ₹660.00 to the customer's original payment method. This can't be undone.")).toBeVisible();
    await cancel.getByRole("button", { name: "Cancel booking" }).click();
    await expect(cancel.getByText("Write a short reason (at least 3 characters).")).toBeVisible();
    await cancel.getByLabel("Reason").fill("No professional free nearby; customer asked to cancel");
    await cancel.getByRole("button", { name: "Cancel booking" }).click();
    await expect(page.getByText("Booking cancelled")).toBeVisible();
    await expect(cancel).toBeHidden();
    await expect(page.getByText("Refund ₹660.00")).toBeVisible();

    // The customer sees it cancelled by the team, with the refund.
    await customer.page.bringToFront();
    await expect(customer.page.getByRole("heading", { name: "Booking cancelled", level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(customer.page.getByText(/^Our team cancelled this booking at /)).toBeVisible();
    await page.bringToFront();

    // Customers: block, then unblock.
    await page.goto("/admin/customers");
    await page.getByLabel("Search by name, email or phone").fill(customer.email);
    await page.getByRole("button", { name: "Open Ritu Malhotra" }).click();
    await expect(page.getByRole("heading", { name: "Ritu Malhotra", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: number })).toBeVisible();
    await expectNoViolations(page);
    await page.getByRole("button", { name: "Block" }).first().click();
    const block = page.getByRole("dialog", { name: "Block Ritu Malhotra?" });
    await block.getByLabel("Reason").fill("Testing the block");
    await block.getByRole("button", { name: "Block" }).click();
    await expect(page.getByText("Ritu Malhotra is blocked")).toBeVisible();
    await expect(block).toBeHidden();
    await page.getByRole("button", { name: "Unblock" }).first().click();
    const unblock = page.getByRole("dialog", { name: "Unblock Ritu Malhotra?" });
    await unblock.getByLabel("Reason").fill("Test over");
    await unblock.getByRole("button", { name: "Unblock" }).click();
    await expect(page.getByText("Ritu Malhotra is unblocked")).toBeVisible();

    // Money: the refund is listed.
    await page.goto("/admin/payments?view=refunds");
    await expect(page.getByRole("button", { name: `Open booking ${number}` }).first()).toBeVisible();
    await expectNoViolations(page);

    // Audit: the note and the cancellation were recorded.
    await page.goto("/admin/audit?area=booking");
    await expect(page.getByText("Booking cancelled").first()).toBeVisible();
    await expect(page.getByText("Note added").first()).toBeVisible();
    await expectNoViolations(page);

    // Settings: change one value with a preview, then change it back.
    await page.goto("/admin/settings");
    const attempts = page.getByLabel("Wrong codes before locking");
    await expect(attempts).toHaveValue("5");
    await expectNoViolations(page);
    await attempts.fill("6");
    await page.getByRole("button", { name: "Review changes" }).first().click();
    const confirm = page.getByRole("dialog", { name: "Save these changes?" });
    await expect(confirm.getByText("Wrong codes before locking: 5 → 6")).toBeVisible();
    await confirm.getByRole("button", { name: "Save changes" }).click();
    // A save starts the form again from the new version; wait for it before typing more.
    await expect(confirm).toBeHidden();
    await expect(page.getByText("Settings saved").first()).toBeVisible();
    await expect(page.getByLabel("Wrong codes before locking")).toHaveValue("6");
    await page.getByLabel("Wrong codes before locking").fill("5");
    await page.getByRole("button", { name: "Review changes" }).first().click();
    const revert = page.getByRole("dialog", { name: "Save these changes?" });
    await revert.getByRole("button", { name: "Save changes" }).click();
    await expect(revert).toBeHidden();
    await expect(page.getByLabel("Wrong codes before locking")).toHaveValue("5");
    // An invalid combination is caught before saving.
    await page.getByLabel("Time to accept an alert").fill("120");
    await page.getByLabel("Search gives up after").fill("100");
    await page.getByRole("button", { name: "Review changes" }).first().click();
    await expect(page.getByText("The accept window must be shorter than the search time.")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await customer.close();
    await pro.close();
  });
});
