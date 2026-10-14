import { expect, test } from "@playwright/test";
import { createUser, latestEmailLink, logIn, SEEDED, STRONG_PASSWORD, uniqueEmail } from "./support";

/** Plan workflows W2 (sign up / log in / reset), W11 (set password) and W18 (language). */

test.describe("Sign up and log in (W2)", () => {
  test("a new customer signs up, lands on services, logs out and back in", async ({ page }) => {
    const email = uniqueEmail("signup");
    await page.goto("/signup");
    await page.getByLabel("Full name").fill("Neha Kapoor");
    await page.getByLabel("Mobile number").fill("98765 43210");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(STRONG_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/services$/);
    await expect(page.getByText("Account created. Welcome, Neha")).toBeVisible();
    // "Account" opens the customer's bookings; the profile is one step further (plan A7).
    await page.getByRole("link", { name: "Account" }).first().click();
    await expect(page.getByRole("heading", { name: "Your bookings", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "No bookings yet" })).toBeVisible();
    await page.getByRole("navigation", { name: "Account" }).getByRole("link", { name: "Profile" }).click();
    await expect(page.getByRole("heading", { name: "Your profile" })).toBeVisible();
    await expect(page.getByLabel("Full name")).toHaveValue("Neha Kapoor");

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText("You're logged out")).toBeVisible();

    // Signed out, the profile sends people to log in and back again.
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login\?next=%2Faccount$/);
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill("not-my-password-77");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByRole("alert")).toContainText("That email and password don't match");

    await page.getByLabel("Password", { exact: true }).fill(STRONG_PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/account$/);
  });

  test("empty fields show messages and focus the first one", async ({ page }) => {
    await page.goto("/signup");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByLabel("Full name")).toBeFocused();
    await expect(page.getByText("This is required.")).toHaveCount(3);
    await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
  });

  test("a registered email offers to log in instead", async ({ page, request }) => {
    const email = uniqueEmail("taken");
    await createUser(request, { role: "customer", email, password: STRONG_PASSWORD });

    await page.goto("/signup");
    await page.getByLabel("Full name").fill("Ritu Malhotra");
    await page.getByLabel("Mobile number").fill("9812345678");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill("another-quiet-harbour-5");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByText("An account with this email already exists.")).toBeVisible();
    await page.getByRole("link", { name: "Log in instead" }).click();
    await expect(page).toHaveURL(new RegExp(`/login\\?email=${encodeURIComponent(email)}`));
    await expect(page.getByLabel("Email", { exact: true })).toHaveValue(email);
  });

  test("the server's password rules show on the field", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Full name").fill("Aman Verma");
    await page.getByLabel("Mobile number").fill("9898989898");
    await page.getByLabel("Email", { exact: true }).fill(uniqueEmail("weak"));
    await page.getByLabel("Password", { exact: true }).fill("Password@123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("This password is too easy to guess.")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeFocused();
  });
});

test.describe("Password reset (W2) and set password (W11)", () => {
  test("the emailed link sets a new password, signs in, and can't be reused", async ({ page, request }) => {
    const email = uniqueEmail("reset");
    await createUser(request, { role: "customer", email, password: STRONG_PASSWORD });

    await page.goto("/login");
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
    await expect(page).toHaveURL(/\/services$/);
    await expect(page.getByText("Password saved. You're logged in.")).toBeVisible();

    await page.goto(link);
    await expect(page.getByRole("heading", { name: "This link has already been used" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Request a new link" })).toBeVisible();
  });

  test("a new professional sets a password from the welcome link and lands in Hindi", async ({ page, request }) => {
    const email = uniqueEmail("pro");
    const { setPasswordUrl } = await createUser(request, { role: "professional", email, name: "Sunita Devi", locale: "hi" });
    expect(setPasswordUrl).toContain("mode=set");

    await page.goto(setPasswordUrl ?? "");
    await expect(page.getByRole("heading", { name: "Set your password" })).toBeVisible();
    await page.getByLabel("New password", { exact: true }).fill("mango-river-lantern-8");
    await page.getByRole("button", { name: "Set password and continue" }).click();

    await expect(page).toHaveURL(/\/pro$/);
    await expect(page.getByRole("heading", { name: "नमस्ते, Sunita" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "hi");
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
    await logIn(page, SEEDED.admin.email, SEEDED.admin.password);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
    await page.goto("/account");
    await expect(page).toHaveURL(/\/admin$/);
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login$/);

    const email = uniqueEmail("roles");
    await createUser(request, { role: "customer", email, password: STRONG_PASSWORD });
    await logIn(page, email, STRONG_PASSWORD);
    await expect(page).toHaveURL(/\/services$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/services$/);
    await page.goto("/pro");
    await expect(page).toHaveURL(/\/services$/);
  });

  test("when the session ends mid-visit, the next action returns to login and back", async ({ page, context, request }) => {
    const email = uniqueEmail("expired");
    await createUser(request, { role: "customer", email, password: STRONG_PASSWORD, name: "Kavita Rao" });
    await logIn(page, email, STRONG_PASSWORD);
    await expect(page).toHaveURL(/\/services$/);
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Your profile" })).toBeVisible();

    await context.clearCookies({ name: "sid" });
    await page.getByLabel("Full name").fill("Kavita R. Rao");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page).toHaveURL(/\/login\?next=%2Faccount&reason=expired$/);
    await expect(page.getByText("Your session ended. Log in again to continue.")).toBeVisible();
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(STRONG_PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/account$/);
  });
});

test.describe("Language (W18)", () => {
  test("a switch while signed in is saved to the profile and follows the person to a new device", async ({ page, context, request }) => {
    const email = uniqueEmail("lang");
    await createUser(request, { role: "customer", email, password: STRONG_PASSWORD, locale: "en" });
    await logIn(page, email, STRONG_PASSWORD);
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
    await logIn(page, email, STRONG_PASSWORD);
    await expect(page.getByRole("heading", { name: "सेवाएँ", level: 1 })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  });
});
