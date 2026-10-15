import { DEFAULT_SITE_CONFIG, type PageContent, pageContentSchema, sectionSchemas, type SiteConfig, siteConfigSchema } from "@brand/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuditLog } from "../src/modules/audit/audit.model";
import { DEFAULT_PAGES } from "../src/modules/site/defaultPages";
import { AreaRequest, Page, PageVersion } from "../src/modules/site/site.models";
import { Client, createUser, loginAs, startTestApp, type TestContext } from "./helpers";

let ctx: TestContext;
let admin: Client;
beforeAll(async () => {
  ctx = await startTestApp();
  admin = await loginAs(ctx.app, (await createUser({ role: "admin" })).email);
});
afterAll(() => ctx.close());

const pageId = async (path: string): Promise<string> => {
  const list = await admin.get("/v1/admin/site/pages");
  const row = (list.body as Array<{ id: string; path: string }>).find((page) => page.path === path);
  if (!row) throw new Error(`no page ${path}`);
  return row.id;
};

describe("default content (ADR-0021)", () => {
  it("every shipped page and the site configuration pass their own schemas", () => {
    expect(siteConfigSchema.safeParse(DEFAULT_SITE_CONFIG).success).toBe(true);
    for (const page of DEFAULT_PAGES) {
      const result = pageContentSchema.safeParse(page.content);
      expect(result.success, `${page.path}: ${result.success ? "" : JSON.stringify(result.error.issues.slice(0, 3))}`).toBe(true);
    }
  });

  it("never shows a bracketed placeholder or the old password wording", () => {
    const text = JSON.stringify(DEFAULT_PAGES);
    expect(text).not.toMatch(/\[(Company|Registered|Grievance|City)/);
    expect(text.toLowerCase()).not.toContain("your password");
  });
});

describe("GET /v1/site", () => {
  it("serves the defaults with the area names and an ETag", async () => {
    const res = await new Client(ctx.app).get("/v1/site");
    expect(res.status).toBe(200);
    expect(res.body.site.theme.accent).toBe("#F26522");
    expect(res.body.areas).toEqual(["Delhi NCR"]);
    expect(res.headers.etag).toBeTruthy();
    const again = await new Client(ctx.app).get("/v1/site").set("If-None-Match", res.headers.etag as string);
    expect(again.status).toBe(304);
  });
});

describe("GET /v1/pages", () => {
  it("serves the shipped home page before anything is saved", async () => {
    const res = await new Client(ctx.app).get("/v1/pages?path=/");
    expect(res.status).toBe(200);
    expect(res.body.sections[0].type).toBe("hero");
  });

  it("is 404 for unknown and malformed paths", async () => {
    expect((await new Client(ctx.app).get("/v1/pages?path=/no-such-page")).status).toBe(404);
    expect((await new Client(ctx.app).get("/v1/pages?path=../etc")).status).toBe(404);
    expect((await new Client(ctx.app).get("/v1/pages")).status).toBe(404);
  });
});

describe("admin website editor", () => {
  it("is admin-only", async () => {
    expect((await new Client(ctx.app).get("/v1/admin/site")).status).toBe(401);
    const customer = await loginAs(ctx.app, (await createUser()).email);
    expect((await customer.get("/v1/admin/site/pages")).status).toBe(403);
    expect((await customer.send("put", "/v1/admin/site", { version: 1, site: DEFAULT_SITE_CONFIG })).status).toBe(403);
  });

  it("lists the shipped pages, locked where the app links to them", async () => {
    const res = await admin.get("/v1/admin/site/pages");
    expect(res.status).toBe(200);
    const paths = (res.body as Array<{ path: string; locked: boolean; status: string }>).map((page) => page.path);
    expect(paths).toEqual(expect.arrayContaining(DEFAULT_PAGES.map((page) => page.path)));
    const home = (res.body as Array<{ path: string; locked: boolean; status: string }>).find((page) => page.path === "/");
    expect(home).toMatchObject({ locked: true, status: "published" });
  });

  it("saves the site with a version check, history, audit and restore", async () => {
    const current = await admin.get("/v1/admin/site");
    const site: SiteConfig = { ...current.body.site, theme: { ...current.body.site.theme, accent: "#2F5BD3" } };
    const saved = await admin.send("put", "/v1/admin/site", { version: current.body.version, site });
    expect(saved.status).toBe(200);
    expect(saved.body.site.theme.accent).toBe("#2F5BD3");
    expect((await new Client(ctx.app).get("/v1/site")).body.site.theme.accent).toBe("#2F5BD3");

    const stale = await admin.send("put", "/v1/admin/site", { version: current.body.version, site });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe("VERSION_CONFLICT");
    expect(await AuditLog.countDocuments({ action: "site.update" })).toBeGreaterThan(0);

    const versions = await admin.get("/v1/admin/site/versions");
    expect(versions.body[0].version).toBe(saved.body.version);
    // Back to orange: the history keeps every saved version.
    const orange = await admin.send("put", "/v1/admin/site", { version: saved.body.version, site: { ...site, theme: { ...site.theme, accent: "#F26522" } } });
    const restored = await admin.post(`/v1/admin/site/versions/${saved.body.version}/restore`, { version: orange.body.version });
    expect(restored.status).toBe(200);
    expect(restored.body.site.theme.accent).toBe("#2F5BD3");
  });

  it("refuses bad colours, links and unknown fields", async () => {
    const current = await admin.get("/v1/admin/site");
    const bad = {
      ...current.body.site,
      theme: { ...current.body.site.theme, accent: "orange" },
      header: { ...current.body.site.header, menu: [{ label: { en: "x", hi: "" }, href: "javascript:alert(1)", emphasis: false }] },
    };
    const res = await admin.send("put", "/v1/admin/site", { version: current.body.version, site: bad });
    expect(res.status).toBe(400);
    expect(res.body.error.fields["site.theme.accent"]).toBe("validation.invalid");
    expect(res.body.error.fields["site.header.menu.0.href"]).toBe("validation.invalid");
  });

  it("keeps edits as a draft until published, then restores an earlier version", async () => {
    const id = await pageId("/about");
    const loaded = await admin.get(`/v1/admin/site/pages/${id}`);
    const content: PageContent = loaded.body.content;
    const header = content.sections.find((section) => section.type === "pageHeader");
    if (!header || header.type !== "pageHeader") throw new Error("about has no header");
    const edited: PageContent = { ...content, sections: content.sections.map((section) => (section.id === header.id ? { ...header, title: { en: "Our story", hi: "हमारी कहानी" } } : section)) };

    const saved = await admin.send("put", `/v1/admin/site/pages/${id}`, { version: loaded.body.version, path: "/about", content: edited });
    expect(saved.status).toBe(200);
    expect(saved.body.status).toBe("changed");
    // Visitors still see the published copy; an admin's preview sees the draft.
    expect(JSON.stringify((await new Client(ctx.app).get("/v1/pages?path=/about")).body)).not.toContain("Our story");
    const preview = await admin.get("/v1/pages?path=/about&preview=1");
    expect(preview.body.draft).toBe(true);
    expect(JSON.stringify(preview.body)).toContain("Our story");
    // Preview is ignored for everyone else.
    expect((await new Client(ctx.app).get("/v1/pages?path=/about&preview=1")).body.draft).toBeUndefined();

    const stalePublish = await admin.post(`/v1/admin/site/pages/${id}/publish`, { version: loaded.body.version });
    expect(stalePublish.status).toBe(409);
    const published = await admin.post(`/v1/admin/site/pages/${id}/publish`, { version: saved.body.version });
    expect(published.status).toBe(200);
    expect(published.body.status).toBe("published");
    expect(JSON.stringify((await new Client(ctx.app).get("/v1/pages?path=/about")).body)).toContain("Our story");

    // Publish a second edit, then restore the first.
    const second: PageContent = { ...edited, title: { en: "About", hi: "" } };
    const saved2 = await admin.send("put", `/v1/admin/site/pages/${id}`, { version: published.body.version, path: "/about", content: second });
    await admin.post(`/v1/admin/site/pages/${id}/publish`, { version: saved2.body.version });
    const versions = await admin.get(`/v1/admin/site/pages/${id}/versions`);
    expect(versions.body.map((row: { number: number }) => row.number)).toEqual([2, 1]);
    const restored = await admin.post(`/v1/admin/site/pages/${id}/versions/1/restore`);
    expect(restored.status).toBe(200);
    expect(restored.body.published.title.en).toBe("About us");
    expect(await PageVersion.countDocuments()).toBe(3);
    expect(await AuditLog.countDocuments({ action: "page.rollback" })).toBe(1);

    // Reset brings the shipped content back into the draft.
    const reset = await admin.post(`/v1/admin/site/pages/${id}/reset`, { version: restored.body.version });
    expect(reset.status).toBe(200);
    expect(JSON.stringify(reset.body.content)).not.toContain("Our story");
  });

  it("refuses moving a locked page and a duplicate section id", async () => {
    const id = await pageId("/contact");
    const loaded = await admin.get(`/v1/admin/site/pages/${id}`);
    const moved = await admin.send("put", `/v1/admin/site/pages/${id}`, { version: loaded.body.version, path: "/talk-to-us", content: loaded.body.content });
    expect(moved.status).toBe(400);
    expect(moved.body.error.fields.path).toBe("validation.invalid");

    const [first] = loaded.body.content.sections;
    const duplicate = await admin.send("put", `/v1/admin/site/pages/${id}`, { version: loaded.body.version, path: "/contact", content: { ...loaded.body.content, sections: [first, first] } });
    expect(duplicate.status).toBe(400);
    expect(duplicate.body.error.fields["content.sections.1.id"]).toBe("validation.invalid");
  });

  it("creates, publishes and deletes a custom page; reserved and taken paths are refused", async () => {
    const created = await admin.post("/v1/admin/site/pages", { path: "/bridal-makeup-at-home", title: { en: "Bridal makeup at home", hi: "" }, copyFrom: null });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe("draft");
    expect((await new Client(ctx.app).get("/v1/pages?path=/bridal-makeup-at-home")).status).toBe(404);
    await admin.post(`/v1/admin/site/pages/${created.body.id}/publish`, { version: created.body.version });
    expect((await new Client(ctx.app).get("/v1/pages?path=/bridal-makeup-at-home")).status).toBe(200);

    const taken = await admin.post("/v1/admin/site/pages", { path: "/bridal-makeup-at-home", title: { en: "Again", hi: "" }, copyFrom: null });
    expect(taken.status).toBe(400);
    expect(taken.body.error.fields.path).toBe("validation.slugTaken");
    const reserved = await admin.post("/v1/admin/site/pages", { path: "/checkout", title: { en: "Checkout", hi: "" }, copyFrom: null });
    expect(reserved.body.error.fields.path).toBe("validation.slugTaken");

    expect((await admin.send("delete", `/v1/admin/site/pages/${created.body.id}`)).status).toBe(204);
    expect((await new Client(ctx.app).get("/v1/pages?path=/bridal-makeup-at-home")).status).toBe(404);
    expect((await admin.send("delete", `/v1/admin/site/pages/${await pageId("/")}`)).status).toBe(403);
  });

  it("does not bring back a shipped page an admin deleted", async () => {
    const id = await pageId("/faridabad-at-home-services");
    expect((await admin.send("delete", `/v1/admin/site/pages/${id}`)).status).toBe(204);
    const list = await admin.get("/v1/admin/site/pages");
    expect((list.body as Array<{ path: string }>).some((page) => page.path === "/faridabad-at-home-services")).toBe(false);
    expect((await new Client(ctx.app).get("/v1/pages?path=/faridabad-at-home-services")).status).toBe(404);
    expect(await Page.countDocuments({ path: "/faridabad-at-home-services" })).toBe(0);
  });
});

describe("location and area requests", () => {
  it("says whether a point is inside a served area", async () => {
    const visitor = new Client(ctx.app);
    const inside = await visitor.post("/v1/locate", { lat: 28.4089, lng: 77.3178 });
    expect(inside.body).toEqual({ served: true, area: "Delhi NCR" });
    const outside = await visitor.post("/v1/locate", { lat: 19.076, lng: 72.8777 });
    expect(outside.body).toEqual({ served: false, area: null });
    expect((await visitor.post("/v1/locate", { lat: 120, lng: 0 })).status).toBe(400);
  });

  it("stores a request once per number per day and shows it to admins", async () => {
    const visitor = new Client(ctx.app);
    const body = { phone: "9876501234", place: "Bandra, Mumbai", lat: 19.06, lng: 72.83 };
    expect((await visitor.post("/v1/site/area-requests", body)).status).toBe(202);
    expect((await visitor.post("/v1/site/area-requests", body)).status).toBe(202);
    expect(await AreaRequest.countDocuments({ phone: "9876501234" })).toBe(1);
    expect((await visitor.post("/v1/site/area-requests", { ...body, phone: "12345" })).status).toBe(400);
    // The honeypot: accepted, never stored.
    await visitor.post("/v1/site/area-requests", { ...body, phone: "9876505678", website: "spam.example" });
    expect(await AreaRequest.countDocuments({ phone: "9876505678" })).toBe(0);

    const list = await admin.get("/v1/admin/site/area-requests");
    expect(list.body[0]).toMatchObject({ phone: "9876501234", place: "Bandra, Mumbai", location: { lat: 19.06, lng: 72.83 } });
    expect((await admin.send("delete", `/v1/admin/site/area-requests/${list.body[0].id}`)).status).toBe(204);
  });
});

describe("GET /v1/sitemap.xml", () => {
  it("lists published pages on the web address and leaves out noindex pages", async () => {
    const created = await admin.post("/v1/admin/site/pages", { path: "/hidden-offer", title: { en: "Hidden", hi: "" }, copyFrom: null });
    const content = { ...created.body.content, seo: { ...created.body.content.seo, noindex: true } };
    const saved = await admin.send("put", `/v1/admin/site/pages/${created.body.id}`, { version: created.body.version, path: "/hidden-offer", content });
    await admin.post(`/v1/admin/site/pages/${created.body.id}/publish`, { version: saved.body.version });

    const res = await new Client(ctx.app).get("/v1/sitemap.xml");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/xml");
    expect(res.text).toContain("<loc>http://localhost:5174/</loc>");
    expect(res.text).toContain("<loc>http://localhost:5174/legal/privacy</loc>");
    expect(res.text).toContain("<loc>http://localhost:5174/services</loc>");
    expect(res.text).not.toContain("hidden-offer");
  });
});

describe("GET /v1/site/reviews", () => {
  it("is an empty list with no reviews yet", async () => {
    const res = await new Client(ctx.app).get("/v1/site/reviews");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("uploads", () => {
  it("accepts the site folder", async () => {
    // A 1×1 PNG.
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    if (!admin.csrfToken) await admin.session();
    const res = await admin.agent.post("/v1/admin/media?folder=site").set("Origin", "http://localhost:5174").set("X-CSRF-Token", admin.csrfToken).attach("file", png, "dot.png");
    expect(res.status).toBe(201);
    expect(res.body.image.key).toMatch(/^site\//);
  });

  it("stores an MP4 or WebM video under a content hash and refuses anything else", async () => {
    if (!admin.csrfToken) await admin.session();
    const send = (body: Buffer, name: string) =>
      admin.agent.post("/v1/admin/media/video").set("Origin", "http://localhost:5174").set("X-CSRF-Token", admin.csrfToken).attach("file", body, name);
    // The first bytes of an MP4 ("ftyp" box) and of a WebM (EBML header) are what count, not the name.
    const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypisom"), Buffer.alloc(64, 1)]);
    const saved = await send(mp4, "clip.mov");
    expect(saved.status).toBe(201);
    expect(saved.body.video).toMatch(/^site\/videos\/[a-f0-9]{12}\.mp4$/);
    const webm = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(64, 2)]);
    expect((await send(webm, "clip.webm")).body.video).toMatch(/\.webm$/);

    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    const refused = await send(png, "not-a-video.mp4");
    expect(refused.status).toBe(400);
    expect(refused.body.error.fields.file).toBe("validation.videoType");

    // The uploaded key is a valid hero video.
    const slide = { image: null, mobileImage: null, video: saved.body.video, eyebrow: { en: "", hi: "" }, title: { en: "Hi", hi: "" }, accent: { en: "", hi: "" }, subtitle: { en: "", hi: "" }, primary: { label: { en: "", hi: "" }, href: "" }, secondary: { label: { en: "", hi: "" }, href: "" }, align: "left" };
    expect(sectionSchemas.hero.safeParse({ id: "videohero", visible: true, anchor: "", tone: "dark", type: "hero", slides: [slide], autoplaySeconds: 0, showPromise: false, height: "large" }).success).toBe(true);
    expect(sectionSchemas.hero.safeParse({ id: "videohero", visible: true, anchor: "", tone: "dark", type: "hero", slides: [{ ...slide, video: "site/videos/../../etc.mp4" }], autoplaySeconds: 0, showPromise: false, height: "large" }).success).toBe(false);
  });

  it("is admin-only", async () => {
    const visitor = new Client(ctx.app);
    expect((await visitor.post("/v1/admin/media/video")).status).toBe(401);
  });
});
