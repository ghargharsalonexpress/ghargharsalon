import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CategoryInput, ServiceInput } from "@brand/shared";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Service } from "../src/modules/catalog/catalog.models";
import { type Client, createUser, loginAs, startTestApp, type TestContext, WEB_ORIGIN } from "./helpers";
import request from "supertest";
import { Client as BrowserClient } from "./helpers";

let ctx: TestContext;
let admin: Client;
const mediaDir = mkdtempSync(join(tmpdir(), "brand-media-"));

const category: CategoryInput = {
  slug: "salon-for-women",
  gender: "women",
  name: { en: "Salon for women", hi: "महिलाओं के लिए सैलून" },
  description: { en: "", hi: "" },
  filters: [
    { slug: "facials", name: { en: "Facials", hi: "फ़ेशियल" } },
    { slug: "waxing", name: { en: "Waxing", hi: "वैक्सिंग" } },
  ],
  skill: "salon_women",
  image: null,
  order: 0,
  active: true,
};

const service = (overrides: Partial<ServiceInput> = {}): ServiceInput => ({
  slug: "korean-glow-facial",
  gender: "women",
  categorySlugs: ["salon-for-women"],
  filterSlugs: ["facials"],
  name: { en: "Korean glow facial", hi: "" },
  summary: { en: "60-minute hydration facial", hi: "" },
  overview: [],
  thingsToKnow: [],
  aftercare: [],
  recommendedFor: [],
  products: [],
  faq: [],
  tiers: [
    { id: "standard", label: { en: "Standard", hi: "स्टैंडर्ड" }, pricePaise: 64_900, compareAtPaise: 99_900, durationMin: 60, sessions: 1 },
    { id: "deluxe", label: { en: "Deluxe", hi: "" }, pricePaise: 89_900, compareAtPaise: null, durationMin: 75, sessions: 1 },
  ],
  requiredSkills: ["salon_women"],
  images: [],
  active: true,
  order: 0,
  ...overrides,
});

beforeAll(async () => {
  ctx = await startTestApp({ MEDIA_DIR: mediaDir, MEDIA_BASE_URL: "http://localhost:4000/media" });
  admin = await loginAs(ctx.app, (await createUser({ role: "admin" })).email);
  expect((await admin.post("/v1/admin/categories", category)).status).toBe(201);
});
afterAll(async () => {
  await ctx.close();
  rmSync(mediaDir, { recursive: true, force: true });
});

describe("admin catalogue (W13)", () => {
  it("creates a service that then appears in the public catalogue", async () => {
    const created = await admin.post("/v1/admin/services", service());
    expect(created.status).toBe(201);
    expect(created.body.version).toBe(1);

    const catalog = await request(ctx.app).get("/v1/catalog");
    expect(catalog.status).toBe(200);
    const summary = catalog.body.services.find((s: { slug: string }) => s.slug === "korean-glow-facial");
    expect(summary).toMatchObject({ fromPricePaise: 64_900, compareAtPaise: 99_900, durationMin: 60, tierCount: 2 });
    expect(catalog.body.categories[0]).toMatchObject({ slug: "salon-for-women", serviceCount: 1 });
  });

  it("answers 304 when the catalogue hasn't changed (ETag)", async () => {
    const first = await request(ctx.app).get("/v1/catalog");
    const again = await request(ctx.app).get("/v1/catalog").set("If-None-Match", first.headers.etag ?? "");
    expect(again.status).toBe(304);
    // Browsers revalidate every time, so a published change shows on the next visit.
    expect(first.headers["cache-control"]).toBe("no-cache");
  });

  it("refuses unknown categories, foreign filters and taken slugs", async () => {
    const unknown = await admin.post("/v1/admin/services", service({ slug: "x-one", categorySlugs: ["nope"] }));
    expect(unknown.body.error.fields["categorySlugs.0"]).toBe("validation.unknownCategory");
    const filter = await admin.post("/v1/admin/services", service({ slug: "x-two", filterSlugs: ["bridal"] }));
    expect(filter.body.error.fields["filterSlugs.0"]).toBe("validation.unknownFilter");
    const taken = await admin.post("/v1/admin/services", service());
    expect(taken.body.error.fields.slug).toBe("validation.slugTaken");
  });

  it("saves with the right version and refuses a stale one (version conflict)", async () => {
    const row = (await admin.get("/v1/admin/services?q=glow")).body[0] as { id: string; version: number; missingHindi: boolean };
    expect(row.missingHindi).toBe(true);
    const saved = await admin.send("put", `/v1/admin/services/${row.id}`, { version: row.version, service: service({ name: { en: "Korean glow facial", hi: "कोरियन ग्लो फ़ेशियल" } }) });
    expect(saved.status).toBe(200);
    expect(saved.body.version).toBe(row.version + 1);
    const stale = await admin.send("put", `/v1/admin/services/${row.id}`, { version: row.version, service: service() });
    expect(stale.status).toBe(409);
  });

  it("hides inactive services from the public", async () => {
    await admin.post("/v1/admin/services", service({ slug: "retired-wax", name: { en: "Retired wax", hi: "" }, filterSlugs: ["waxing"], active: false }));
    const catalog = await request(ctx.app).get("/v1/catalog");
    expect(catalog.body.services.some((s: { slug: string }) => s.slug === "retired-wax")).toBe(false);
    expect((await request(ctx.app).get("/v1/services/retired-wax")).status).toBe(404);
    expect((await request(ctx.app).get("/v1/services/korean-glow-facial")).body.tiers).toHaveLength(2);
  });

  it("is admin-only", async () => {
    const customer = await loginAs(ctx.app, (await createUser()).email);
    expect((await customer.get("/v1/admin/services")).status).toBe(403);
    expect((await customer.post("/v1/admin/services", service({ slug: "sneaky" }))).status).toBe(403);
  });

  it("re-encodes uploads into AVIF and WebP sizes and rejects non-images", async () => {
    const png = await sharp({ create: { width: 1000, height: 750, channels: 3, background: { r: 158, g: 31, b: 85 } } }).png().toBuffer();
    const res = await admin.agent
      .post("/v1/admin/media?folder=services")
      .set("Origin", WEB_ORIGIN)
      .set("X-CSRF-Token", admin.csrfToken)
      .attach("file", png, { filename: "photo.png", contentType: "image/png" });
    expect(res.status).toBe(201);
    expect(res.body.image).toMatchObject({ width: 1000, height: 750, widths: [320, 640, 960] });
    const stored = readdirSync(join(mediaDir, "services"));
    expect(stored.filter((file) => file.endsWith(".avif"))).toHaveLength(3);
    expect(stored.filter((file) => file.endsWith(".webp"))).toHaveLength(3);

    const served = await request(ctx.app).get(`/media/${res.body.image.key}-320.webp`);
    expect(served.status).toBe(200);
    expect(served.headers["cache-control"]).toContain("immutable");

    const text = await admin.agent
      .post("/v1/admin/media")
      .set("Origin", WEB_ORIGIN)
      .set("X-CSRF-Token", admin.csrfToken)
      .attach("file", Buffer.from("not an image"), { filename: "notes.txt", contentType: "text/plain" });
    expect(text.status).toBe(400);
    expect(text.body.error.fields.file).toBe("validation.imageUnreadable");
  });
});

describe("GET /v1/info (hours, fees and limits for public pages)", () => {
  it("shows what visitors may see from the settings, and nothing else", async () => {
    const res = await request(ctx.app).get("/v1/info");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      serviceHours: { open: "08:00", close: "21:00" },
      platformFeePaise: 1_100,
      maxQuantityPerLine: 3,
      searchTimeoutSeconds: 120,
      lateThresholdMinutes: 10,
      noShowWaitMinutes: 10,
      fees: { cancelAfterAcceptPaise: 9_900, noShowPaise: 19_900, cancelWhileSearchingPaise: 0, freeCancelWhenProfessionalLate: true },
    });
    expect(JSON.stringify(res.body)).not.toContain("commission");
  });
});

describe("POST /v1/cart/price (plan C9: the server prices every cart)", () => {
  it("prices lines from the database and adds the platform fee with GST included", async () => {
    const res = await new BrowserClient(ctx.app).post("/v1/cart/price", {
      lines: [
        { serviceSlug: "korean-glow-facial", tierId: "standard", quantity: 1, seenUnitPricePaise: 64_900 },
        { serviceSlug: "korean-glow-facial", tierId: "deluxe", quantity: 1 },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ itemsPaise: 154_800, platformFeePaise: 1_100, totalPaise: 155_900, gstRateBps: 500, pricesIncludeGst: true });
    expect(res.body.taxablePaise + res.body.gstPaise).toBe(155_900);
    expect(res.body.lines.map((line: { status: string }) => line.status)).toEqual(["ok", "ok"]);
  });

  it("flags changed prices, caps quantities and marks unavailable services", async () => {
    const res = await new BrowserClient(ctx.app).post("/v1/cart/price", {
      lines: [
        { serviceSlug: "korean-glow-facial", tierId: "standard", quantity: 5, seenUnitPricePaise: 59_900 },
        { serviceSlug: "retired-wax", tierId: "standard", quantity: 1 },
        { serviceSlug: "korean-glow-facial", tierId: "no-such-tier", quantity: 1 },
      ],
    });
    const [capped, retired, missing] = res.body.lines as Array<{ status: string; quantity: number; linePaise: number }>;
    expect(capped).toMatchObject({ status: "quantity_capped", quantity: 3, linePaise: 194_700 });
    expect(retired?.status).toBe("unavailable");
    expect(missing?.status).toBe("unavailable");
    expect(res.body.itemsPaise).toBe(194_700);

    const changed = await new BrowserClient(ctx.app).post("/v1/cart/price", { lines: [{ serviceSlug: "korean-glow-facial", tierId: "standard", quantity: 1, seenUnitPricePaise: 59_900 }] });
    expect(changed.body.lines[0].status).toBe("price_changed");
  });

  it("charges nothing for an empty cart", async () => {
    const res = await new BrowserClient(ctx.app).post("/v1/cart/price", { lines: [] });
    expect(res.body.totalPaise).toBe(0);
  });

  it("keeps an inactive service out of the order even if it is still in an old cart", async () => {
    await Service.updateOne({ slug: "korean-glow-facial" }, { active: false });
    const res = await new BrowserClient(ctx.app).post("/v1/cart/price", { lines: [{ serviceSlug: "korean-glow-facial", tierId: "standard", quantity: 1 }] });
    expect(res.body.lines[0].status).toBe("unavailable");
    expect(res.body.totalPaise).toBe(0);
    await Service.updateOne({ slug: "korean-glow-facial" }, { active: true });
  });
});

describe("contact form (W17)", () => {
  it("stores the message, tells the team and thanks the visitor in their language", async () => {
    const res = await new BrowserClient(ctx.app).post("/v1/contact", { name: "Ritu Malhotra", email: "ritu@example.com", phone: "9812345678", message: "Do you serve Sector 21C on Sundays?", locale: "hi" });
    expect(res.status).toBe(202);
    expect(ctx.email.latestTo(ctx.config.SUPPORT_EMAIL)?.tag).toBe("contact-admin");
    const ack = ctx.email.latestTo("ritu@example.com");
    expect(ack?.tag).toBe("contact-ack");
    expect(ack?.subject).toContain("संदेश");

    const list = await admin.get("/v1/admin/messages?status=new");
    const message = (list.body as Array<{ id: string; email: string }>).find((m) => m.email === "ritu@example.com");
    expect(message).toBeDefined();
    const closed = await admin.send("patch", `/v1/admin/messages/${message?.id}`, { status: "closed" });
    expect(closed.body.status).toBe("closed");
  });

  it("quietly ignores bots that fill the hidden field", async () => {
    const before = ctx.email.sent.length;
    const res = await new BrowserClient(ctx.app).post("/v1/contact", { name: "Bot", email: "bot@example.com", phone: "", message: "Buy followers now cheap cheap", website: "http://spam.example" });
    expect(res.status).toBe(202);
    expect(ctx.email.sent.length).toBe(before);
  });

  it("validates and rate-limits", async () => {
    const short = await new BrowserClient(ctx.app).post("/v1/contact", { name: "A", email: "x", phone: "123", message: "hi" });
    expect(short.body.error.fields).toMatchObject({ name: "validation.nameShort", email: "validation.email", phone: "validation.phone", message: "validation.messageShort" });

    const client = new BrowserClient(ctx.app);
    let last = 0;
    for (let i = 0; i < 6; i++) last = (await client.post("/v1/contact", { name: "Pooja Bansal", email: `p${i}@example.com`, phone: "", message: "Please call me back about bridal makeup." })).status;
    expect(last).toBe(429);
  });
});
