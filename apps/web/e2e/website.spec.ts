import { type APIRequestContext, type Browser, expect, type Page, test } from "@playwright/test";
import { API_URL, logInAsTeam, openPage, SEEDED, uniquePhone } from "./support";

// The website built in Admin → Website (ADR-0021): editing and publishing pages, the menu,
// the theme colour, location on arrival, and a sweep of every shipped page for broken links,
// missing photos and placeholders. Edits happen on /about and on pages these specs create,
// and are undone at the end, so specs running alongside see the shipped site.

test.describe.configure({ mode: "serial", timeout: 240_000 });

async function asAdmin(page: Page) {
  await logInAsTeam(page, SEEDED.admin.email, SEEDED.admin.password);
  await page.waitForURL(/\/admin(?!\/login)/);
}

async function openEditor(page: Page, title: string) {
  await page.goto("/admin/website");
  await page.getByRole("button", { name: `Edit ${title}` }).click();
  await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
}

async function publish(page: Page) {
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.locator("main header").getByText("Published", { exact: true })).toBeVisible();
}

test.describe("Page builder", () => {
  test("an edit stays a draft until published; reset and history bring content back", async ({ page }) => {
    await asAdmin(page);
    await openEditor(page, "About us");
    await page.getByRole("button", { name: /^1\. Page header/ }).click();
    const body = page.locator('[id^="section-body-"]').first();
    await body.getByLabel("Title", { exact: true }).fill("Our story, at your door");

    // Saved but not published: visitors still see the shipped title.
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.locator("main header").getByText("Unpublished changes")).toBeVisible();
    const visitor = await page.context().browser()!.newPage();
    await openPage(visitor, "/about");
    await expect(visitor.getByRole("heading", { level: 1 })).toHaveText("Beauty care that comes to you");
    // The admin's preview shows the draft, marked as such.
    await page.goto("/about?preview=1");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Our story, at your door");
    await expect(page.getByText(/Preview: this is the unpublished draft/)).toBeVisible();

    await openEditor(page, "About us");
    await publish(page);
    await openPage(visitor, "/about");
    await expect(visitor.getByRole("heading", { level: 1 })).toHaveText("Our story, at your door");

    // Reset to the shipped content and publish it.
    await page.getByRole("button", { name: "Reset to default" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Reset to default" }).click();
    await expect(page.getByRole("button", { name: /^1\. Page header Beauty care that comes to you/ })).toBeVisible();
    await publish(page);
    await openPage(visitor, "/about");
    await expect(visitor.getByRole("heading", { level: 1 })).toHaveText("Beauty care that comes to you");

    // History restores the edited version, then the shipped one goes back.
    await page.getByRole("button", { name: "History" }).click();
    const history = page.getByRole("dialog", { name: "Published versions" });
    await history.getByRole("listitem").filter({ hasText: "Version 1" }).getByRole("button", { name: "Restore" }).click();
    await expect(history).toBeHidden();
    await openPage(visitor, "/about");
    await expect(visitor.getByRole("heading", { level: 1 })).toHaveText("Our story, at your door");
    await page.getByRole("button", { name: "Reset to default" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Reset to default" }).click();
    await publish(page);
    await visitor.close();
  });

  test("a hidden section disappears; a moved one changes place; required fields are checked", async ({ page }) => {
    await asAdmin(page);
    await openEditor(page, "About us");
    await page.getByRole("button", { name: "Hide Numbers from visitors" }).click();
    await page.getByRole("button", { name: "Move Invite professionals up" }).click();
    await publish(page);

    await openPage(page, "/about");
    await expect(page.getByText("Extra charges at your door")).toHaveCount(0);
    const order = await page.locator("main section h2").allTextContents();
    expect(order.indexOf("Are you a beauty professional?")).toBeLessThan(order.indexOf("What you can count on"));

    // An empty title is refused before anything is saved.
    await openEditor(page, "About us");
    await page.getByRole("button", { name: /^1\. Page header/ }).click();
    await page.locator('[id^="section-body-"]').first().getByLabel("Title", { exact: true }).fill("");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Some fields need fixing; they are marked in red.")).toBeVisible();
    await expect(page.getByText("Needs fixing")).toBeVisible();

    // Leaving with unsaved edits asks first.
    await page.getByRole("link", { name: "← All pages" }).click();
    await page.getByRole("button", { name: "Leave and lose changes" }).click();
    await expect(page.getByRole("heading", { name: "Website", level: 1 })).toBeVisible();
    await openEditor(page, "About us");
    await page.getByRole("button", { name: "Reset to default" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Reset to default" }).click();
    await publish(page);
    await openPage(page, "/about");
    await expect(page.getByText("Extra charges at your door")).toBeVisible();
  });

  test("a new page goes live when published and can be added to the menu", async ({ page }) => {
    // A fresh name each run: the E2E API keeps its data between local runs.
    const name = `Bridal offer ${Date.now().toString(36)}`;
    const path = `/${name.toLowerCase().replace(/ /g, "-")}`;
    await asAdmin(page);
    await page.goto("/admin/website");
    await page.getByRole("button", { name: "New page" }).first().click();
    const dialog = page.getByRole("dialog", { name: "New page" });
    await dialog.getByLabel("Page title").fill(name);
    await expect(dialog.getByLabel("Page address")).toHaveValue(path);
    await dialog.getByRole("button", { name: "Create page" }).click();
    await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();

    // A draft is not public.
    const visitor = await page.context().browser()!.newPage();
    await openPage(visitor, path);
    await expect(visitor.getByRole("heading", { name: "This page doesn't exist", level: 1 })).toBeVisible();

    // Add a section with text, then publish.
    await page.getByRole("button", { name: "Add a section" }).first().click();
    await page.getByRole("dialog", { name: "Add a section" }).getByRole("button", { name: /^Text/ }).click();
    const text = page.locator('[id^="section-body-"]').last();
    await text.getByLabel("Text", { exact: true }).fill("## Book your bridal look\n\n- HD makeup\n- Hair styling\n\nCall **{{phone}}**.");

    // A video section with a clip uploaded from the computer (its first bytes make it an MP4).
    await page.getByRole("button", { name: "Add a section" }).first().click();
    await page.getByRole("dialog", { name: "Add a section" }).getByRole("button", { name: /^Video/ }).click();
    const clip = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypisom"), Buffer.alloc(256, 7)]);
    await page.locator('input[type="file"][accept="video/mp4,video/webm"]').last().setInputFiles({ name: "salon.mp4", mimeType: "video/mp4", buffer: clip });
    await expect(page.getByRole("button", { name: "Replace video" })).toBeVisible();
    await publish(page);
    await openPage(visitor, path);
    await expect(visitor.getByRole("heading", { name, level: 1 })).toBeVisible();
    await expect(visitor.getByRole("heading", { name: "Book your bridal look", level: 2 })).toBeVisible();
    await expect(visitor.locator("main strong", { hasText: "+91 70650 94179" })).toBeVisible();
    // The uploaded clip plays from media storage.
    const src = (await visitor.locator("main video").getAttribute("src")) ?? "";
    expect(src).toMatch(/\/site\/videos\/[a-f0-9]{12}\.mp4$/);
    expect((await visitor.request.get(`${API_URL}/media/${src.slice(src.indexOf("site/videos/"))}`)).ok()).toBe(true);

    // Into the header menu.
    await page.goto("/admin/website/menus");
    const menu = page.getByRole("region", { name: "Header menu" });
    await menu.getByRole("button", { name: "Add item" }).click();
    await menu.getByLabel("Text", { exact: true }).last().fill(name);
    await menu.getByLabel(/^Opens/).last().fill(path);
    await page.getByRole("button", { name: "Save changes" }).first().click();
    await expect(page.getByText("Saved. The website shows it now.")).toBeVisible();
    await visitor.setViewportSize({ width: 1440, height: 900 });
    await openPage(visitor, "/");
    await visitor.getByRole("navigation", { name: "Main" }).getByRole("link", { name }).click();
    await expect(visitor).toHaveURL(new RegExp(`${path}$`));

    // Clean up: the menu item, then the page.
    await menu.getByRole("button", { name: "Remove item 6" }).click();
    await page.getByRole("button", { name: "Save changes" }).first().click();
    await expect(page.getByText("Saved. The website shows it now.")).toBeVisible();
    await openEditor(page, name);
    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Page deleted")).toBeVisible();
    await visitor.close();
  });

  test("the brand colour changes the whole site", async ({ page }) => {
    await asAdmin(page);
    await page.goto("/admin/website/brand");
    await page.getByRole("button", { name: "Teal", exact: true }).click();
    await page.getByRole("button", { name: "Save changes" }).first().click();
    await expect(page.getByText("Saved. The website shows it now.")).toBeVisible();

    const visitor = await page.context().browser()!.newPage();
    await visitor.goto("/");
    const book = visitor.getByRole("link", { name: "Book now" }).first();
    await expect(book).toHaveCSS("background-color", "rgb(15, 107, 102)");
    await visitor.close();

    await page.getByRole("button", { name: "Orange", exact: true }).click();
    await page.getByRole("button", { name: "Save changes" }).first().click();
    await expect(page.getByText("Saved. The website shows it now.")).toBeVisible();
  });
});

async function visit(browser: Browser, geolocation: { latitude: number; longitude: number } | null) {
  const context = await browser.newContext(geolocation ? { geolocation, permissions: ["geolocation"] } : {});
  const page = await context.newPage();
  await openPage(page, "/");
  return page;
}

test.describe("Location on arrival", () => {
  test("inside a served area the header says so", async ({ browser }) => {
    const page = await visit(browser, { latitude: 28.4089, longitude: 77.3178 });
    await expect(page.getByRole("button", { name: "Location: Delhi NCR, Available. Change location" })).toBeVisible();
    await expect(page.getByText("We don't serve your area yet")).toHaveCount(0);
    await page.context().close();
  });

  test("outside every area: the admin's message, and a number left for later", async ({ browser, request }) => {
    const page = await visit(browser, { latitude: 19.076, longitude: 72.8777 });
    await expect(page.getByText(/We don't serve your area yet/)).toBeVisible();
    await page.getByRole("status").getByRole("button", { name: "Notify me" }).click();
    const dialog = page.getByRole("dialog", { name: "Tell me when you reach my area" });
    const phone = uniquePhone();
    await dialog.getByLabel("Mobile number").fill(phone);
    await dialog.getByLabel("Your area or city").fill("Bandra, Mumbai");
    await dialog.getByRole("button", { name: "Notify me" }).click();
    await expect(dialog.getByText("Thank you. We'll message you the day we start in your area.")).toBeVisible();
    await page.context().close();

    // The admin sees it in Website → Area requests.
    const login = await request.post(`${API_URL}/v1/auth/login`, { data: { email: SEEDED.admin.email, password: SEEDED.admin.password }, headers: await csrf(request) });
    expect(login.ok()).toBe(true);
    const list = await request.get(`${API_URL}/v1/admin/site/area-requests`);
    expect(((await list.json()) as Array<{ phone: string; place: string }>).find((row) => row.phone === phone)).toMatchObject({ place: "Bandra, Mumbai" });
  });

  test("without permission the visitor picks an area", async ({ browser }) => {
    const page = await visit(browser, null);
    await page.getByRole("button", { name: /^Location: Select location/ }).click();
    const dialog = page.getByRole("dialog", { name: "Where should we come?" });
    await dialog.getByRole("button", { name: "Delhi NCR" }).click();
    await expect(page.getByRole("button", { name: "Location: Delhi NCR, Available. Change location" })).toBeVisible();
    await page.context().close();
  });
});

/** The CSRF header an API request needs (the session cookie stays in `request`). */
async function csrf(request: APIRequestContext) {
  const session = await request.get(`${API_URL}/v1/session`, { headers: { Origin: "http://localhost:5175" } });
  const { csrfToken } = (await session.json()) as { csrfToken: string };
  return { "X-CSRF-Token": csrfToken, Origin: "http://localhost:5175" };
}

test.describe("Without the website API", () => {
  test("the shipped pages still show (an older API during a deploy, or one that is down)", async ({ page }) => {
    await page.route("**/v1/site", (route) => route.fulfill({ status: 404, contentType: "application/json", body: "{}" }));
    await page.route("**/v1/pages?**", (route) => route.fulfill({ status: 404, contentType: "application/json", body: "{}" }));
    await openPage(page, "/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Salon at home in 10–15 minutes");
    await openPage(page, "/legal/privacy");
    await expect(page.getByRole("heading", { name: "Privacy policy", level: 1 })).toBeVisible();
  });
});

const SHIPPED_PAGES = ["/", "/about", "/contact", "/register-as-professional", "/legal/privacy", "/legal/terms", "/legal/cancellation-refund", "/faridabad-at-home-services", "/services"];

test.describe("Every shipped page", () => {
  test("has its photos, no placeholders and no broken links", async ({ page }) => {
    const links = new Set<string>();
    const photos = new Set<string>();
    for (const path of SHIPPED_PAGES) {
      await openPage(page, path);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      const text = await page.locator("body").innerText();
      expect(text, path).not.toContain("{{");
      expect(text, path).not.toMatch(/\[(Company|Registered|Grievance|City)/);
      expect(text, path).not.toContain("Photo coming soon");
      for (const href of await page.locator("a[href^='/']").evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href") ?? ""))) {
        if (!href.startsWith("/admin") && !href.startsWith("/pro")) links.add(href.split("#")[0] || "/");
      }
      for (const url of await page.locator("img[src], source[srcset]").evaluateAll((nodes) =>
        nodes.flatMap((node) => (node instanceof HTMLImageElement ? [node.src] : (node.getAttribute("srcset") ?? "").split(",").map((part) => new URL(part.trim().split(" ")[0] ?? "", location.href).href))),
      )) {
        if (url) photos.add(url);
      }
    }

    // Every photo a page refers to exists (lazy ones included, whether or not they were scrolled into view).
    for (const url of photos) {
      const response = await page.request.get(url);
      expect(response.ok(), url).toBe(true);
    }

    // Every link inside the site leads to a real page.
    for (const href of links) {
      await page.goto(href);
      await page.locator("main").first().waitFor();
      await expect(page.getByRole("heading", { name: "This page doesn't exist" }), href).toHaveCount(0);
    }
  });
});
