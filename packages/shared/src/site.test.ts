import { describe, expect, it } from "vitest";
import { createPageSchema, fillVariables, imagesIn, linkSchema, sectionSchema, siteConfigSchema, youtubeId } from "./site";
import { DEFAULT_SITE_CONFIG } from "./siteDefaults";
import { isSitePhoto, SITE_PHOTOS, siteImage } from "./siteImages";

describe("links admins can type", () => {
  it.each(["/about", "/services?category=salon-for-women", "#faq", "https://wa.me/917065094179", "tel:+91 70650 94179", "mailto:hello@example.com", ""])("accepts %s", (link) => {
    expect(linkSchema.safeParse(link).success).toBe(true);
  });

  it.each(["javascript:alert(1)", "//evil.example", "data:text/html,hi", "ftp://x.example", "about us"])("refuses %s", (link) => {
    expect(linkSchema.safeParse(link).success).toBe(false);
  });
});

describe("fillVariables", () => {
  it("fills known values and leaves unknown or empty ones visible", () => {
    expect(fillVariables("At your door in {{min}}–{{max}} min", { min: 10, max: 15 })).toBe("At your door in 10–15 min");
    expect(fillVariables("Call {{ phone }}", { phone: "+91 70650 94179" })).toBe("Call +91 70650 94179");
    expect(fillVariables("{{nope}} and {{company}}", { company: "" })).toBe("{{nope}} and {{company}}");
  });
});

describe("youtubeId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?t=3", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://vimeo.com/123", null],
  ])("%s", (input, id) => {
    expect(youtubeId(input)).toBe(id);
  });
});

describe("pages and sections", () => {
  it("keeps new pages off the addresses the app uses", () => {
    const page = (path: string) => createPageSchema.safeParse({ path, title: { en: "A page", hi: "" }, copyFrom: null }).success;
    expect(page("/bridal-makeup-at-home")).toBe(true);
    expect(page("/offers/diwali")).toBe(true);
    expect(page("/checkout")).toBe(false);
    expect(page("/admin/x")).toBe(false);
    expect(page("/")).toBe(false);
    expect(page("/Upper-Case")).toBe(false);
    expect(page("/a/b/c")).toBe(false);
  });

  it("checks a section against its own type", () => {
    const base = { id: "abcdef12", visible: true, anchor: "", tone: "plain" };
    expect(sectionSchema.safeParse({ ...base, type: "richText", title: { en: "", hi: "" }, body: { en: "Hello", hi: "" }, width: "reading" }).success).toBe(true);
    expect(sectionSchema.safeParse({ ...base, type: "richText", title: { en: "", hi: "" }, body: { en: "", hi: "" }, width: "reading" }).success).toBe(false);
    expect(sectionSchema.safeParse({ ...base, type: "nope" }).success).toBe(false);
    expect(sectionSchema.safeParse({ ...base, id: "Bad Id", type: "richText", title: { en: "", hi: "" }, body: { en: "x", hi: "" }, width: "reading" }).success).toBe(false);
  });
});

describe("site configuration", () => {
  it("ships valid defaults, and refuses a promise that ends before it starts", () => {
    expect(siteConfigSchema.safeParse(DEFAULT_SITE_CONFIG).success).toBe(true);
    const backwards = { ...DEFAULT_SITE_CONFIG, brand: { ...DEFAULT_SITE_CONFIG.brand, promiseMin: 20, promiseMax: 10 } };
    expect(siteConfigSchema.safeParse(backwards).success).toBe(false);
  });

  it("finds every image in content, and tells shipped photos from uploads", () => {
    const found = imagesIn({ a: [{ image: siteImage("hero-men") }], b: { logo: { key: "site/abc", width: 10, height: 10, widths: [10] } } });
    expect(found.map((image) => image.key)).toEqual(["images/site/hero-men", "site/abc"]);
    expect(isSitePhoto(SITE_PHOTOS["hero-men"])).toBe(true);
    expect(isSitePhoto({ key: "site/abc", width: 1, height: 1, widths: [1] })).toBe(false);
  });
});
