import { expect, test } from "@playwright/test";
import { addAddress, customerWithCart, onlineProfessional, payWithTestSheet } from "./flows";
import { expectNoViolations, logIn } from "./support";

/**
 * The instant booking, end to end in two browsers (plan Part E; W3–W10): a customer books and
 * pays, a nearby professional accepts the alert, arrives, starts with the customer's code and
 * completes; the customer rates and opens the invoice. Each spec has its own professional in
 * its own part of the city, so specs can run side by side.
 */

test.describe("Instant booking (Part E)", () => {
  test("book, pay, accept, arrive, start with the code, complete, rate and see the invoice", async ({ browser, request }) => {
    test.setTimeout(360_000);
    const PRO_AT = { latitude: 28.627, longitude: 77.3727 };
    const HOME = { latitude: 28.6282, longitude: 77.3735 }; // about 150 m away

    const pro = await onlineProfessional(browser, request, "Meera Joshi", PRO_AT);
    await logIn(pro.page, pro.phone);
    await expect(pro.page).toHaveURL(/\/pro$/);

    const customer = await customerWithCart(browser, request, HOME);
    const page = customer.page;
    await expect(page.getByText("Add an address to continue.").first()).toBeVisible();
    await addAddress(page);
    await page.getByLabel("Note for the professional").fill("Ring the bell twice");
    await expect(page.getByText("Professionals are available")).toBeVisible();
    await expectNoViolations(page);
    await payWithTestSheet(page, "₹660");
    await expect(page.getByText(/If no one is free within 10 minutes, your ₹660 is refunded automatically/)).toBeVisible();
    await expectNoViolations(page);

    // The professional's panel opens the alert by itself (socket), with the area but no address.
    // (Each person has their own phone: the page acted on is brought to the front, as on a real screen.)
    await pro.page.bringToFront();
    await expect(pro.page).toHaveURL(/\/pro\/offers\/[a-f0-9]{24}$/, { timeout: 20_000 });
    await expect(pro.page.getByRole("heading", { name: "New job", level: 1 })).toBeVisible();
    await expect(pro.page.getByText("Sector 62, Noida")).toBeVisible();
    await expect(pro.page.getByText("Flat 12")).toHaveCount(0);
    await expectNoViolations(pro.page);
    await pro.page.getByRole("button", { name: "Accept job" }).click();
    await expect(pro.page).toHaveURL(/\/pro\/jobs\/[a-f0-9]{24}$/);
    await expect(pro.page.getByRole("heading", { name: "Go to Neha", level: 1 })).toBeVisible();
    await expect(pro.page.getByText("Flat 12, Sector 62, Noida 201309")).toBeVisible();
    await expect(pro.page.getByText("Ring the bell twice")).toBeVisible();
    await expectNoViolations(pro.page);

    // The customer's page turns into tracking within a moment, with the start code; the
    // professional's position follows as she moves (shared from her panel, plan C8).
    await page.bringToFront();
    await expect(page.getByRole("heading", { name: "Meera is on the way", level: 1 })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("link", { name: "Call" })).toBeVisible();
    await expect(page.getByText("Meera's live location appears here once they start moving.")).toBeVisible();
    await pro.context.setGeolocation({ latitude: 28.6276, longitude: 77.3731 });
    await expect(page.getByText(/^Updated /)).toBeVisible({ timeout: 15_000 });
    // Each move reaches the customer at once. The server saves a position only every 30 s, so
    // this one can only come as the live event (the booking's room, joined as the page connects).
    await pro.context.setGeolocation({ latitude: 28.6279, longitude: 77.3733 });
    await expect(page.getByRole("link", { name: "See Meera's location in Google Maps" })).toHaveAttribute("href", /query=28\.6279,77\.3733$/, { timeout: 8_000 });
    await expectNoViolations(page);
    const code = (await page.getByLabel(/^Start OTP: \d \d \d \d$/).textContent())?.trim() ?? "";
    expect(code).toMatch(/^\d{4}$/);

    // Arrive at the door (inside the 200 m geofence), then start with the customer's code.
    await pro.context.setGeolocation({ latitude: 28.6281, longitude: 77.3734 });
    await pro.page.bringToFront();
    await pro.page.getByRole("button", { name: "I've arrived" }).click();
    await expect(pro.page.getByRole("heading", { name: "Start the service", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Meera has arrived", level: 1 })).toBeVisible({ timeout: 15_000 });
    await expectNoViolations(pro.page);

    // Wrong only in the last digit, so retyping the right code goes over three identical digits.
    const wrong = `${code.slice(0, 3)}${(Number(code[3]) + 1) % 10}`;
    await pro.page.getByLabel("Digit 1 of 4").click();
    await pro.page.keyboard.type(wrong, { delay: 40 });
    await pro.page.getByRole("button", { name: "Start service" }).click();
    await expect(pro.page.getByText("Wrong code. Check it with the customer.")).toBeVisible();

    await pro.page.getByLabel("Digit 1 of 4").click();
    await pro.page.keyboard.type(code, { delay: 40 });
    await pro.page.getByRole("button", { name: "Start service" }).click();
    await expect(pro.page.getByRole("heading", { name: "Service in progress", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Service in progress", level: 1 })).toBeVisible({ timeout: 15_000 });

    // Completing long before the expected time asks first (plan A8).
    await pro.page.getByRole("button", { name: "Complete service" }).click();
    const early = pro.page.getByRole("dialog", { name: "Complete this service already?" });
    await early.getByRole("button", { name: "Yes, complete it" }).click();
    await expect(pro.page.getByRole("heading", { name: "Job completed", level: 1 })).toBeVisible();
    await expect(pro.page.getByText(/has been added to your earnings/)).toBeVisible();

    // The customer rates once, then opens the printable invoice.
    await page.bringToFront();
    await expect(page.getByRole("heading", { name: "Service completed", level: 1 })).toBeVisible({ timeout: 15_000 });
    await expectNoViolations(page);
    await page.getByRole("button", { name: "Submit rating" }).click();
    await expect(page.getByText("Choose from 1 to 5 stars.")).toBeVisible();
    await page.getByLabel("5 stars: excellent").check({ force: true });
    await page.getByLabel("Anything to add?").fill("On time and very careful.");
    await page.getByRole("button", { name: "Submit rating" }).click();
    await expect(page.getByText("Thanks for your feedback")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your rating" })).toBeVisible();
    await expect(page.getByText("On time and very careful.")).toBeVisible();

    await page.getByRole("link", { name: "View invoice" }).click();
    await expect(page.getByRole("heading", { name: "Tax invoice", level: 1 })).toBeVisible();
    await expect(page.getByText(/^Invoice no\. INV\/\d{4}-\d{2}\/\d{6}$/)).toBeVisible();
    await expect(page.getByText("₹660.00").first()).toBeVisible();
    await expectNoViolations(page);

    // Earnings show the job.
    await pro.page.bringToFront();
    await pro.page.getByRole("link", { name: "Earnings" }).click();
    await expect(pro.page.getByRole("heading", { name: "Completed jobs" })).toBeVisible();
    await expectNoViolations(pro.page);

    await customer.close();
    await pro.close();
  });

  test("cancelling while we're still looking is free and refunds everything (W10)", async ({ browser, request }) => {
    test.setTimeout(240_000);
    // A professional who is online but never answers (no panel open), far from the other spec.
    const PRO_AT = { latitude: 28.5921, longitude: 77.046 };
    const HOME = { latitude: 28.5933, longitude: 77.0468 };
    const pro = await onlineProfessional(browser, request, "Sunita Devi", PRO_AT);

    // On a phone-sized screen this time.
    const customer = await customerWithCart(browser, request, HOME, { width: 390, height: 844 });
    const page = customer.page;
    await addAddress(page);
    await expect(page.getByText("Professionals are available")).toBeVisible();
    await expectNoViolations(page);
    await payWithTestSheet(page, "₹660");
    await expectNoViolations(page);

    await page.getByRole("button", { name: "Cancel booking" }).click();
    const dialog = page.getByRole("dialog", { name: "Cancel this booking?" });
    await expect(dialog.getByText("It's free while we're still looking. ₹660 will be refunded to your original payment method.")).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel booking" }).click();
    await expect(dialog.getByText("Choose a reason to continue.")).toBeVisible();
    await dialog.getByText("My plans changed").click();
    await dialog.getByRole("button", { name: "Cancel booking" }).click();

    await expect(page.getByRole("heading", { name: "Booking cancelled", level: 1 })).toBeVisible();
    await expect(page.getByText(/^You cancelled this booking at /)).toBeVisible();
    await expect(page.getByText("Refund of ₹660")).toBeVisible();
    await expectNoViolations(page);

    // It's listed under past bookings in the account.
    await page.getByRole("link", { name: "Your bookings" }).click();
    await expect(page).toHaveURL(/\/account\/bookings$/);
    await expect(page.getByRole("heading", { name: "Past" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Fruit facial/ })).toBeVisible();
    await expectNoViolations(page);
    await page.getByRole("link", { name: "Addresses" }).click();
    await expect(page.getByRole("heading", { name: "Your addresses", level: 1 })).toBeVisible();
    await expect(page.getByText("Flat 12, Sector 62, Noida 201309")).toBeVisible();
    await expectNoViolations(page);

    await customer.close();
    await pro.close();
  });

  test("a failed payment can be paid later from the booking, which empties the cart (A8)", async ({ browser, request }) => {
    test.setTimeout(240_000);
    // Gurugram, away from the other specs; the professional never answers.
    const PRO_AT = { latitude: 28.4595, longitude: 77.0266 };
    const HOME = { latitude: 28.4603, longitude: 77.0274 };
    const pro = await onlineProfessional(browser, request, "Kavita Rao", PRO_AT);

    const customer = await customerWithCart(browser, request, HOME);
    const page = customer.page;
    const payButton = () => page.getByRole("button", { name: "Pay ₹660" }).filter({ visible: true }).first();
    await addAddress(page);
    await expect(page.getByText("Professionals are available")).toBeVisible();
    await payButton().click();
    await page.getByRole("dialog", { name: "Test payment" }).getByRole("button", { name: "Fail payment" }).click();
    await expect(page.getByText(/^The payment didn't go through\. No money was taken\./)).toBeVisible();
    // The cart keeps the service so the customer can try again.
    await expect(page.getByRole("link", { name: "Cart, 1 items" })).toBeVisible();

    // Later, from the account: the booking is held for payment and is paid on its own page.
    await page.goto("/account/bookings");
    await page.getByRole("link", { name: /Fruit facial/ }).click();
    await expect(page.getByRole("heading", { name: "Complete your payment", level: 1 })).toBeVisible();
    await payButton().click();
    await page.getByRole("dialog", { name: "Test payment" }).getByRole("button", { name: "Pay ₹660" }).click();
    await expect(page.getByRole("heading", { name: "Finding a professional", level: 1 })).toBeVisible();
    await expect(page.getByText("Payment of ₹660 received.")).toBeVisible();

    // That booking was the cart, so the cart is empty now.
    await page.goto("/cart");
    await expect(page.getByText("Your cart is empty")).toBeVisible();

    await customer.close();
    await pro.close();
  });
});
