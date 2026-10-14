import { expect, type Page, test } from "@playwright/test";
import { createUser, latestCode, latestEmailLink, logIn, logInAsTeam, SEEDED, uniqueEmail, uniquePhone } from "./support";

/**
 * Plan workflows W2 (log in / sign up, now by mobile number and SMS code, ADR-0020), Team login
 * with its reset path, and W18 (language).
 */

/** Phone step → code step, from the login page that is already open. Returns the code sent. */
async function askForCode(page: Page, phone: string): Promise<string> {
  await page.getByLabel("Mobile number").fill(phone);
  await page.getByRole("button", { name: "Get OTP" }).click();
  await expect(page.getByRole("heading", { name: "Enter the code" })).toBeVisible();
  return latestCode(page.request, phone);
}

async function typeCode(page: Page, code: string) {
  await page.locator('input[autocomplete="one-time-code"]').click();
  await page.keyboard.type(code);
}

const wrongCodeFor = (code: string) => (code === "000000" ? "111111" : "000000");

test.describe("Mobile number login (W2, ADR-0020)", () => {
  test("a new number signs up with just a name, lands on services, logs out and back in", async ({ page }) => {
    const phone = uniquePhone();
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Log in or sign up", level: 1 })).toBeVisible();
    const code = await askForCode(page, phone);
    await expect(page.getByText(`We sent a 6-digit code to +91 ${phone.slice(0, 5)} ${phone.slice(5)}.`)).toBeVisible();
    await typeCode(page, code);

    // A new number: one more step, then a customer account.
    await expect(page.getByRole("heading", { name: "Welcome! What's your name?" })).toBeVisible();
    await page.getByLabel("Full name").fill("Neha Kapoor");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/services$/);
    await expect(page.getByText("Account created. Welcome, Neha")).toBeVisible();

    // "Account" opens the customer's bookings; the profile is one step further (plan A7).
    await page.getByRole("link", { name: "Account" }).first().click();
    await expect(page.getByRole("heading", { name: "Your bookings", level: 1 })).toBeVisible();
    await page.getByRole("navigation", { name: "Account" }).getByRole("link", { name: "Profile" }).click();
    await expect(page.getByLabel("Full name")).toHaveValue("Neha Kapoor");
    await expect(page.getByLabel("Mobile number")).toBeDisabled();
    await expect(page.getByLabel("Email (optional)")).toHaveValue("");

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText("You're logged out")).toBeVisible();

    // Signed out, the profile sends people to log in and back again. A wrong code says so.
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login\?next=%2Faccount$/);
    const again = await askForCode(page, phone);
    await typeCode(page, wrongCodeFor(again));
    await expect(page.getByText("That code is wrong.")).toBeVisible();
    await typeCode(page, again);
    await expect(page).toHaveURL(/\/account$/);
  });

  test("checks the number, and lets people change it", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Get OTP" }).click();
    await expect(page.getByText("This is required.")).toBeVisible();
    await expect(page.getByLabel("Mobile number")).toBeFocused();
    await page.getByLabel("Mobile number").fill("12345");
    await page.getByRole("button", { name: "Get OTP" }).click();
    await expect(page.getByText("Enter a 10-digit mobile number.")).toBeVisible();

    const phone = uniquePhone();
    await askForCode(page, phone);
    await expect(page.getByText(/^Resend code in \d+s$/)).toBeVisible();
    await page.getByRole("button", { name: "Change number" }).click();
    await expect(page.getByRole("heading", { name: "Log in or sign up" })).toBeVisible();
    await expect(page.getByLabel("Mobile number")).toHaveValue(`${phone.slice(0, 5)} ${phone.slice(5)}`);
  });

  test("an admin's number is sent to Team login, only after the right code", async ({ page }) => {
    await page.goto("/login");
    const code = await askForCode(page, SEEDED.admin.phone);
    await typeCode(page, code);
    await expect(page.getByRole("alert")).toContainText("This number belongs to a team account. Use Team login.");
    await page.getByRole("link", { name: "Go to Team login" }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByRole("heading", { name: "Team login", level: 1 })).toBeVisible();
  });

  test("a professional logs in with their number and lands in Hindi", async ({ page, request }) => {
    const { phone } = await createUser(request, { role: "professional", name: "Sunita Devi", locale: "hi" });
    await logIn(page, phone);
    await expect(page).toHaveURL(/\/pro$/);
    await expect(page.getByRole("heading", { name: "नमस्ते, Sunita" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  });
});

test.describe("Team login (admins keep email + password)", () => {
  test("a wrong password says so; the right one opens the dashboard", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin$/);
    await page.getByLabel("Email", { exact: true }).fill(SEEDED.admin.email);
    await page.getByLabel("Password", { exact: true }).fill("not-my-password-77");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByRole("alert")).toContainText("That email and password don't match");

    await page.getByLabel("Password", { exact: true }).fill(SEEDED.admin.password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
  });

  test("the emailed reset link sets a new password, signs in, and can't be reused", async ({ page, request }) => {
    const email = uniqueEmail("team");
    await createUser(request, { role: "admin", email, password: "harbour-lamp-west-42" });

    await page.goto("/admin/login");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByRole("link", { name: "Forgot password?" }).click();
    await expect(page.getByLabel("Email", { exact: true })).toHaveValue(email);
    await page.getByRole("button", { name: "Send link" }).click();
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

    const link = await latestEmailLink(request, email);
    await page.goto(link);
    await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();
    await page.getByLabel("New password", { exact: true }).fill("password123");
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page.getByText("This password is too easy to guess.")).toBeVisible();

    await page.getByLabel("New password", { exact: true }).fill("copper-kettle-sunrise-4");
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByText("Password saved. You're logged in.")).toBeVisible();

    await page.goto(link);
    await expect(page.getByRole("heading", { name: "This link has already been used" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Request a new link" })).toBeVisible();
  });

  test("an expired or unknown link explains itself", async ({ page }) => {
    await page.goto("/reset-password?token=not-a-real-token-but-long-enough-0123456789");
    await expect(page.getByRole("heading", { name: "This link doesn't work" })).toBeVisible();
    await page.getByRole("link", { name: "Request a new link" }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);
  });
});

test.describe("Roles and sessions", () => {
  test("each role lands on its own home and is sent back from the others (A7)", async ({ page, request }) => {
    await logInAsTeam(page, SEEDED.admin.email, SEEDED.admin.password);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
    await page.goto("/account");
    await expect(page).toHaveURL(/\/admin$/);
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);

    const { phone } = await createUser(request, { role: "customer" });
    await logIn(page, phone);
    await expect(page).toHaveURL(/\/services$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/services$/);
    await page.goto("/pro");
    await expect(page).toHaveURL(/\/services$/);
  });

  test("when the session ends mid-visit, the next action returns to login and back", async ({ page, context, request }) => {
    const { phone } = await createUser(request, { role: "customer", name: "Kavita Rao" });
    await logIn(page, phone);
    await expect(page).toHaveURL(/\/services$/);
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Your profile" })).toBeVisible();

    await context.clearCookies({ name: "sid" });
    await page.getByLabel("Full name").fill("Kavita R. Rao");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page).toHaveURL(/\/login\?next=%2Faccount&reason=expired$/);
    await expect(page.getByText("Your session ended. Log in again to continue.")).toBeVisible();
    await typeCode(page, await askForCode(page, phone));
    await expect(page).toHaveURL(/\/account$/);
  });
});

test.describe("Language (W18)", () => {
  test("a switch while signed in is saved to the profile and follows the person to a new device", async ({ page, context, request }) => {
    const { phone } = await createUser(request, { role: "customer", locale: "en" });
    await logIn(page, phone);
    await expect(page).toHaveURL(/\/services$/);
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Your profile" })).toBeVisible();

    const saved = page.waitForResponse((res) => res.url().endsWith("/v1/me") && res.request().method() === "PATCH");
    // Click the visible label, as a person would (the native radio underneath is visually hidden).
    await page.getByText("हिन्दी", { exact: true }).click();
    await expect(page.getByRole("radio", { name: "हिन्दी" })).toBeChecked();
    await expect(page.getByRole("heading", { name: "आपकी प्रोफ़ाइल" })).toBeVisible();
    expect((await saved).status()).toBe(200);

    // A new device: no cookies, no stored language. The profile brings Hindi back after login.
    await context.clearCookies();
    await page.evaluate(() => window.localStorage.clear());
    await logIn(page, phone);
    await expect(page.getByRole("heading", { name: "सेवाएँ", level: 1 })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  });
});
