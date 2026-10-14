import { describe, expect, it } from "vitest";
import { hasMissingHindi, mediaUrl, pick, type ServiceInput, serviceInputSchema } from "./catalog";

const service: ServiceInput = {
  slug: "korean-glow-facial",
  gender: "women",
  categorySlugs: ["salon-for-women"],
  filterSlugs: ["facials"],
  name: { en: "Korean glow facial", hi: "कोरियन ग्लो फ़ेशियल" },
  summary: { en: "Hydration and glow in 60 minutes", hi: "" },
  overview: [{ title: { en: "Cleanse", hi: "" }, desc: { en: "", hi: "" } }],
  thingsToKnow: [],
  aftercare: [],
  recommendedFor: [],
  products: [],
  faq: [],
  tiers: [{ id: "standard", label: { en: "Standard", hi: "स्टैंडर्ड" }, pricePaise: 64_900, compareAtPaise: 99_900, durationMin: 60, sessions: 1 }],
  requiredSkills: ["salon_women"],
  images: [],
  active: true,
  order: 0,
};

describe("serviceInputSchema", () => {
  it("accepts a complete service", () => {
    expect(serviceInputSchema.safeParse(service).success).toBe(true);
  });

  it("refuses a before-price that isn't higher than the price", () => {
    const result = serviceInputSchema.safeParse({ ...service, tiers: [{ ...service.tiers[0], compareAtPaise: 50_000 }] });
    expect(result.error?.issues[0]?.message).toBe("validation.compareAtLow");
  });

  it("needs at least one tier and unique tier ids", () => {
    expect(serviceInputSchema.safeParse({ ...service, tiers: [] }).error?.issues[0]?.message).toBe("validation.tierRequired");
    const twice = serviceInputSchema.safeParse({ ...service, tiers: [service.tiers[0], service.tiers[0]] });
    expect(twice.success).toBe(false);
  });

  it("refuses slugs with capitals or spaces", () => {
    expect(serviceInputSchema.safeParse({ ...service, slug: "Korean Glow" }).error?.issues[0]?.message).toBe("validation.slug");
  });
});

describe("helpers", () => {
  it("falls back to English when Hindi isn't written yet", () => {
    expect(pick({ en: "Facial", hi: "" }, "hi")).toBe("Facial");
    expect(pick({ en: "Facial", hi: "फ़ेशियल" }, "hi")).toBe("फ़ेशियल");
  });

  it("spots missing Hindi anywhere in a service", () => {
    expect(hasMissingHindi(service)).toBe(true);
    expect(hasMissingHindi({ name: { en: "A", hi: "ए" }, empty: { en: "", hi: "" } })).toBe(false);
  });

  it("builds image URLs per size and format", () => {
    expect(mediaUrl("https://cdn.brand.in/", { key: "services/x/abc", width: 1200, height: 900, widths: [320, 640] }, 640, "webp")).toBe(
      "https://cdn.brand.in/services/x/abc-640.webp",
    );
  });
});
