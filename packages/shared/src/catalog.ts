import { z } from "zod";
import { V } from "./validation";

export const CATALOG_GENDERS = ["women", "men"] as const;
export type CatalogGender = (typeof CATALOG_GENDERS)[number];

/**
 * What a professional must be able to do. Each category needs one skill; matching only
 * offers a booking to professionals who have every skill its services need (plan C6).
 */
export const SKILLS = ["salon_women", "makeup", "hair_women", "spa_women", "massage_men", "skincare_men", "grooming_men"] as const;
export type Skill = (typeof SKILLS)[number];

export const SKILL_LABELS: Record<Skill, { en: string; hi: string }> = {
  salon_women: { en: "Salon for women (facials, waxing, threading)", hi: "महिलाओं का सैलून (फ़ेशियल, वैक्स, थ्रेडिंग)" },
  makeup: { en: "Makeup and styling", hi: "मेकअप और स्टाइलिंग" },
  hair_women: { en: "Women's hair cut and styling", hi: "महिलाओं के बाल काटना और स्टाइलिंग" },
  spa_women: { en: "Spa and massage for women", hi: "महिलाओं के लिए स्पा और मसाज" },
  massage_men: { en: "Massage for men", hi: "पुरुषों के लिए मसाज" },
  skincare_men: { en: "Skincare and face grooming for men", hi: "पुरुषों की स्किनकेयर और फ़ेस ग्रूमिंग" },
  grooming_men: { en: "Haircut and beard for men", hi: "पुरुषों के बाल और दाढ़ी" },
};

export const slugSchema = z
  .string(V.required)
  .min(2, V.slug)
  .max(80, V.slug)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, V.slug);

/** Content in both languages. Hindi may be empty until written; screens fall back to English (plan C3). */
const localized = (max: number, required = true) =>
  z.strictObject({
    en: required ? z.string(V.required).trim().min(1, V.required).max(max, V.invalid) : z.string(V.invalid).trim().max(max, V.invalid),
    hi: z.string(V.invalid).trim().max(max, V.invalid),
  });

export const localizedShortSchema = localized(160);
export const localizedLongSchema = localized(2_000);
export const optionalLocalizedSchema = localized(2_000, false);
export type Localized = z.infer<typeof localizedShortSchema>;

/** A stored image: `key` + width gives the URL of each AVIF/WebP size (see mediaUrl). */
export const imageSchema = z.strictObject({
  key: z.string().regex(/^[a-z0-9][a-z0-9/_-]*$/, V.invalid).max(200),
  width: z.number().int().min(1),
  height: z.number().int().min(1),
  widths: z.array(z.number().int().min(1)).min(1).max(6),
});
export type ImageRef = z.infer<typeof imageSchema>;

export const tierSchema = z
  .strictObject({
    id: slugSchema,
    label: localizedShortSchema,
    pricePaise: z.number(V.invalid).int(V.invalid).min(100, V.invalid).max(1_00_00_000, V.invalid),
    /** The struck-through "before" price; only kept when higher than the price (audit rule 4). */
    compareAtPaise: z.number(V.invalid).int(V.invalid).nullable(),
    // 1 minute (quick add-ons) to 24 hours (group makeup packages for 5–7 people).
    durationMin: z.number(V.invalid).int(V.invalid).min(1, V.invalid).max(1_440, V.invalid),
    sessions: z.number(V.invalid).int(V.invalid).min(1, V.invalid).max(12, V.invalid),
  })
  .refine((tier) => tier.compareAtPaise === null || tier.compareAtPaise > tier.pricePaise, { path: ["compareAtPaise"], message: V.compareAtLow });
export type Tier = z.infer<typeof tierSchema>;

const textList = (max: number) => z.array(localizedLongSchema).max(max);

export const serviceInputSchema = z
  .strictObject({
    slug: slugSchema,
    gender: z.enum(CATALOG_GENDERS),
    categorySlugs: z.array(slugSchema).min(1, V.required).max(3),
    filterSlugs: z.array(slugSchema).max(6),
    name: localizedShortSchema,
    summary: optionalLocalizedSchema,
    overview: z.array(z.strictObject({ title: localizedShortSchema, desc: optionalLocalizedSchema })).max(12),
    thingsToKnow: textList(15),
    aftercare: textList(15),
    recommendedFor: textList(10),
    products: textList(10),
    faq: z.array(z.strictObject({ question: localizedLongSchema, answer: localizedLongSchema })).max(15),
    tiers: z.array(tierSchema).min(1, V.tierRequired).max(8),
    requiredSkills: z.array(z.enum(SKILLS)).min(1, V.required).max(3),
    images: z.array(imageSchema).max(6),
    active: z.boolean(),
    order: z.number().int().min(0).max(100_000),
  })
  .superRefine((service, ctx) => {
    const ids = new Set<string>();
    service.tiers.forEach((tier, index) => {
      if (ids.has(tier.id)) ctx.addIssue({ code: "custom", path: ["tiers", index, "id"], message: V.invalid });
      ids.add(tier.id);
    });
  });
export type ServiceInput = z.infer<typeof serviceInputSchema>;

export const categoryInputSchema = z.strictObject({
  slug: slugSchema,
  gender: z.enum(CATALOG_GENDERS),
  name: localizedShortSchema,
  description: optionalLocalizedSchema,
  /** Sub-groups shown as chips on the services page ("Facials", "Waxing"…). */
  filters: z.array(z.strictObject({ slug: slugSchema, name: localizedShortSchema })).max(24),
  skill: z.enum(SKILLS),
  image: imageSchema.nullable(),
  order: z.number().int().min(0).max(1_000),
  active: z.boolean(),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const reorderSchema = z.strictObject({ slugs: z.array(slugSchema).min(1).max(100) });

export interface CategoryDto extends CategoryInput {
  serviceCount: number;
}

/** What lists and cards need; details load on demand. */
export interface ServiceSummaryDto {
  slug: string;
  gender: CatalogGender;
  categorySlugs: string[];
  filterSlugs: string[];
  name: Localized;
  summary: Localized;
  /** Cheapest tier, so cards can say "From ₹649". */
  fromPricePaise: number;
  compareAtPaise: number | null;
  durationMin: number;
  tierCount: number;
  /** All options, so single-option services can be added straight from a card. */
  tiers: Tier[];
  image: ImageRef | null;
}

export interface ServiceDto extends ServiceInput {
  id: string;
  version: number;
  updatedAt: string;
}

export interface CatalogResponse {
  /** Changes whenever anything in the catalogue changes (also sent as the ETag). */
  version: string;
  categories: CategoryDto[];
  services: ServiceSummaryDto[];
}

/** Admin list rows. */
export interface AdminServiceRow extends ServiceSummaryDto {
  id: string;
  active: boolean;
  missingHindi: boolean;
  version: number;
  updatedAt: string;
}

/** Picks the visitor's language, falling back to English when Hindi isn't written yet. */
export const pick = (text: Localized | undefined, lang: string): string => (text ? (lang === "hi" && text.hi ? text.hi : text.en) : "");

/** True when any English text in the value has no Hindi counterpart. */
export function hasMissingHindi(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasMissingHindi);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.en === "string" && typeof record.hi === "string") return record.en.trim() !== "" && record.hi.trim() === "";
    return Object.values(record).some(hasMissingHindi);
  }
  return false;
}

/** URL of one stored image size, e.g. mediaUrl(base, image, 640, "webp"). */
export const mediaUrl = (base: string, image: ImageRef, width: number, format: "avif" | "webp"): string =>
  `${base.replace(/\/$/, "")}/${image.key}-${width}.${format}`;
