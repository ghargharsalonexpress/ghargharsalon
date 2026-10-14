import { type CategoryInput, categoryInputSchema, type ServiceInput, serviceInputSchema } from "@brand/shared";

/**
 * A small, fixed catalogue for the Playwright runs (apps/web/e2e/public.spec.ts): two genders,
 * filters, a multi-option service, a hidden one and Hindi on some names only.
 */
const L = (en: string, hi = "") => ({ en, hi });

const categories: CategoryInput[] = [
  {
    slug: "salon-for-women",
    gender: "women",
    name: L("Salon for women", "महिलाओं के लिए सैलून"),
    description: L("Facials and waxing at home.", "घर पर फ़ेशियल और वैक्स।"),
    filters: [
      { slug: "facials", name: L("Facials", "फ़ेशियल") },
      { slug: "waxing", name: L("Waxing", "वैक्सिंग") },
    ],
    skill: "salon_women",
    image: null,
    order: 0,
    active: true,
  },
  {
    slug: "men-grooming",
    gender: "men",
    name: L("Grooming for men", "पुरुषों की ग्रूमिंग"),
    description: L("Beard and haircut at home.", "घर पर दाढ़ी और हेयरकट।"),
    filters: [],
    skill: "grooming_men",
    image: null,
    order: 1,
    active: true,
  },
];

const base = {
  overview: [],
  thingsToKnow: [],
  aftercare: [],
  recommendedFor: [],
  products: [],
  faq: [],
  images: [],
  active: true,
} satisfies Partial<ServiceInput>;

const services: ServiceInput[] = [
  {
    ...base,
    slug: "fruit-facial",
    gender: "women",
    categorySlugs: ["salon-for-women"],
    filterSlugs: ["facials"],
    name: L("Fruit facial", "फ्रूट फ़ेशियल"),
    summary: L("A gentle facial with fruit extracts.", "फलों के अर्क वाला हल्का फ़ेशियल।"),
    overview: [{ title: L("Cleanse", "सफ़ाई"), desc: L("Removes dirt and oil.", "धूल और तेल हटाता है।") }],
    thingsToKnow: [L("Avoid sun for a few hours.", "कुछ घंटे धूप से बचें।")],
    faq: [{ question: L("Is it good for dry skin?", "क्या यह रूखी त्वचा के लिए अच्छा है?"), answer: L("Yes, it hydrates.", "हाँ, यह नमी देता है।") }],
    tiers: [{ id: "standard", label: L("Standard", "स्टैंडर्ड"), pricePaise: 64_900, compareAtPaise: 99_900, durationMin: 45, sessions: 1 }],
    requiredSkills: ["salon_women"],
    order: 0,
  },
  {
    ...base,
    slug: "korean-glow-facial",
    gender: "women",
    categorySlugs: ["salon-for-women"],
    filterSlugs: ["facials"],
    name: L("Korean glow facial"),
    summary: L("Glass-skin glow in one sitting."),
    tiers: [
      { id: "single", label: L("1 session", "1 सेशन"), pricePaise: 99_900, compareAtPaise: null, durationMin: 60, sessions: 1 },
      { id: "three-sessions", label: L("3 sessions over a month", "महीने में 3 सेशन"), pricePaise: 2_69_900, compareAtPaise: 2_99_700, durationMin: 60, sessions: 3 },
    ],
    requiredSkills: ["salon_women"],
    order: 1,
  },
  {
    ...base,
    slug: "rica-full-arms-wax",
    gender: "women",
    categorySlugs: ["salon-for-women"],
    filterSlugs: ["waxing"],
    name: L("Rica wax, full arms", "रीका वैक्स, पूरी बाँहें"),
    summary: L(""),
    tiers: [{ id: "standard", label: L("Standard", "स्टैंडर्ड"), pricePaise: 34_900, compareAtPaise: null, durationMin: 30, sessions: 1 }],
    requiredSkills: ["salon_women"],
    order: 2,
  },
  {
    ...base,
    slug: "old-bleach",
    gender: "women",
    categorySlugs: ["salon-for-women"],
    filterSlugs: ["facials"],
    name: L("Retired bleach"),
    summary: L("No longer offered."),
    tiers: [{ id: "standard", label: L("Standard"), pricePaise: 19_900, compareAtPaise: null, durationMin: 20, sessions: 1 }],
    requiredSkills: ["salon_women"],
    active: false,
    order: 3,
  },
  {
    ...base,
    slug: "beard-trim",
    gender: "men",
    categorySlugs: ["men-grooming"],
    filterSlugs: [],
    name: L("Beard trim", "दाढ़ी ट्रिम"),
    summary: L("Shape and trim with a hot towel.", "गरम तौलिये के साथ शेप और ट्रिम।"),
    tiers: [{ id: "standard", label: L("Standard", "स्टैंडर्ड"), pricePaise: 24_900, compareAtPaise: null, durationMin: 20, sessions: 1 }],
    requiredSkills: ["grooming_men"],
    order: 4,
  },
];

export const E2E_CATALOG = {
  categories: categories.map((category) => categoryInputSchema.parse(category)),
  services: services.map((service) => serviceInputSchema.parse(service)),
};
