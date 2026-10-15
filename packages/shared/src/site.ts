import { z } from "zod";
import { imageSchema, type ImageRef, type Localized, slugSchema } from "./catalog";
import { V } from "./validation";

// The website's content (ADR-0021): one site configuration (brand, theme, menus, footer,
// SEO, location) and pages built from ordered sections. Admins edit all of it; the web app
// only renders. Everything stays out of the operations settings on purpose.

/** Text in both languages. Hindi may stay empty: screens fall back to English (plan C3). */
const text = (max: number, required = false) =>
  z.strictObject({
    en: required ? z.string(V.required).trim().min(1, V.required).max(max, V.invalid) : z.string(V.invalid).trim().max(max, V.invalid),
    hi: z.string(V.invalid).trim().max(max, V.invalid),
  });

/** Where a button or menu item goes: a page of this site, an anchor, a web address, a phone or an email. */
const LINK = /^(?:\/(?!\/)[^\s<>"]*|#[A-Za-z][\w-]*|https?:\/\/[^\s<>"]+|tel:\+?[\d\s()-]{3,20}|mailto:[^\s@<>"]+@[^\s@<>"]+)$/;
export const linkSchema = z
  .string(V.invalid)
  .trim()
  .max(500, V.invalid)
  .refine((value) => value === "" || LINK.test(value), V.invalid);

/** An https address, or empty. */
export const webAddressSchema = z
  .string(V.invalid)
  .trim()
  .max(500, V.invalid)
  .refine((value) => value === "" || /^https:\/\/[^\s<>"]+$/.test(value), V.invalid);

export const hexColorSchema = z.string(V.invalid).trim().regex(/^#[0-9a-fA-F]{6}$/, V.invalid);

export const ctaSchema = z.strictObject({ label: text(40), href: linkSchema });
export type Cta = z.infer<typeof ctaSchema>;

/** A video file: one shipped with the site (/video/…) or an https .mp4. */
const videoFileSchema = z
  .string(V.invalid)
  .trim()
  .max(300, V.invalid)
  .refine((value) => value === "" || /^(?:\/video\/[\w.-]+\.mp4|https:\/\/[^\s<>"]+\.mp4)$/.test(value), V.invalid);

/** A YouTube link or video id; the site embeds it from youtube-nocookie.com. */
const youtubeSchema = z
  .string(V.invalid)
  .trim()
  .max(200, V.invalid)
  .refine((value) => value === "" || youtubeId(value) !== null, V.invalid);

/** "dQw4w9WgXcQ" from a watch, share, shorts or embed link (or the id itself). */
export function youtubeId(value: string): string | null {
  const trimmed = value.trim();
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  const match = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(trimmed);
  return match?.[1] ?? null;
}

// ---------------------------------------------------------------------------------------
// Theme

/**
 * Fonts an admin can choose. `google` is the Google Fonts family spec; null means the font
 * ships with the app. Hindi text always falls back to Noto Sans Devanagari.
 */
export const SITE_FONTS = {
  "noto-sans": { label: "Noto Sans", family: '"Noto Sans Variable", "Noto Sans"', google: null, heading: true, body: true },
  poppins: { label: "Poppins", family: '"Poppins"', google: null, heading: true, body: true },
  montserrat: { label: "Montserrat", family: '"Montserrat"', google: "Montserrat:wght@400;500;600;700", heading: true, body: true },
  "dm-sans": { label: "DM Sans", family: '"DM Sans"', google: "DM+Sans:wght@400;500;600;700", heading: true, body: true },
  inter: { label: "Inter", family: '"Inter"', google: "Inter:wght@400;500;600;700", heading: true, body: true },
  nunito: { label: "Nunito", family: '"Nunito"', google: "Nunito:wght@400;500;600;700", heading: true, body: true },
  outfit: { label: "Outfit", family: '"Outfit"', google: "Outfit:wght@400;500;600;700", heading: true, body: true },
  mulish: { label: "Mulish", family: '"Mulish"', google: "Mulish:wght@400;500;600;700", heading: true, body: true },
  "playfair-display": { label: "Playfair Display", family: '"Playfair Display"', google: "Playfair+Display:wght@500;600;700", heading: true, body: false },
  lora: { label: "Lora", family: '"Lora"', google: "Lora:wght@500;600;700", heading: true, body: false },
  "cormorant-garamond": { label: "Cormorant Garamond", family: '"Cormorant Garamond"', google: "Cormorant+Garamond:wght@500;600;700", heading: true, body: false },
  marcellus: { label: "Marcellus", family: '"Marcellus"', google: "Marcellus", heading: true, body: false },
} as const;
export type SiteFont = keyof typeof SITE_FONTS;
const fontKeys = Object.keys(SITE_FONTS) as [SiteFont, ...SiteFont[]];

/** Ready-made brand colours; any other colour can be typed in. Orange is the client's choice. */
export const COLOR_PRESETS = [
  { id: "orange", label: "Orange", hex: "#F26522" },
  { id: "berry", label: "Berry", hex: "#C42A6B" },
  { id: "magenta", label: "Magenta", hex: "#B5179E" },
  { id: "teal", label: "Teal", hex: "#14938C" },
  { id: "royal", label: "Royal blue", hex: "#2F5BD3" },
  { id: "plum", label: "Plum", hex: "#7B3FA0" },
  { id: "emerald", label: "Emerald", hex: "#1E8C5A" },
  { id: "gold", label: "Gold", hex: "#B7791F" },
] as const;

export const CORNER_STYLES = ["standard", "rounded", "sharp"] as const;
export type CornerStyle = (typeof CORNER_STYLES)[number];

// ---------------------------------------------------------------------------------------
// Site configuration

const menuItemSchema = z.strictObject({ label: text(40, true), href: linkSchema.refine((value) => value !== "", V.required), emphasis: z.boolean() });
export type MenuItem = z.infer<typeof menuItemSchema>;

const footerLinkSchema = z.strictObject({ label: text(60, true), href: linkSchema.refine((value) => value !== "", V.required) });

const phoneText = z.string(V.invalid).trim().max(30, V.invalid).regex(/^$|^\+?[\d\s()-]{6,30}$/, V.phone);

export const siteConfigSchema = z.strictObject({
  brand: z.strictObject({
    name: text(80, true),
    tagline: text(160),
    /** Null shows the logo that ships with the app. */
    logo: imageSchema.nullable(),
    /** Show the name beside the logo (turn off when the logo already contains it). */
    showName: z.boolean(),
    supportPhone: phoneText,
    /** WhatsApp number with country code; empty hides WhatsApp buttons. */
    whatsapp: phoneText,
    supportEmail: z.string(V.invalid).trim().toLowerCase().max(254, V.email).pipe(z.union([z.literal(""), z.email(V.email)])),
    address: text(300),
    /** Shown in the footer and the legal pages. */
    legalName: z.string(V.invalid).trim().max(120, V.invalid),
    gstin: z.string(V.invalid).trim().toUpperCase().max(15, V.invalid).regex(/^$|^[0-9A-Z]{15}$/, V.invalid),
    grievanceOfficer: z.string(V.invalid).trim().max(160, V.invalid),
    /** Courts named in the terms. */
    jurisdiction: z.string(V.invalid).trim().max(60, V.invalid),
    /** The arrival promise quoted across the site ("10–15 minutes"). */
    promiseMin: z.number(V.invalid).int(V.invalid).min(1, V.invalid).max(240, V.invalid),
    promiseMax: z.number(V.invalid).int(V.invalid).min(1, V.invalid).max(240, V.invalid),
  }),
  theme: z.strictObject({
    /** The bright brand colour; darker shades for buttons and text are worked out from it. */
    accent: hexColorSchema,
    headingFont: z.enum(fontKeys),
    bodyFont: z.enum(fontKeys).refine((font) => SITE_FONTS[font].body, V.invalid),
    corners: z.enum(CORNER_STYLES),
  }),
  header: z.strictObject({
    menu: z.array(menuItemSchema).max(8),
    announcement: z.strictObject({ enabled: z.boolean(), text: text(160), href: linkSchema }),
  }),
  footer: z.strictObject({
    about: text(400),
    columns: z.array(z.strictObject({ title: text(40, true), links: z.array(footerLinkSchema).min(1, V.required).max(10) })).max(4),
    bottomText: text(200),
  }),
  social: z.strictObject({
    instagram: webAddressSchema,
    facebook: webAddressSchema,
    youtube: webAddressSchema,
    x: webAddressSchema,
    linkedin: webAddressSchema,
  }),
  apps: z.strictObject({ android: webAddressSchema, ios: webAddressSchema }),
  /** The professionals' application form (a Google Form shows inside the page). */
  proFormUrl: webAddressSchema,
  /** Photos outside the page builder: beside the login form, and on "page not found". */
  photos: z.strictObject({ login: imageSchema.nullable(), notFound: imageSchema.nullable() }),
  seo: z.strictObject({
    /** "%s" is replaced by the page title. */
    titleTemplate: z.string(V.invalid).trim().max(80, V.invalid).refine((value) => value === "" || value.includes("%s"), V.invalid),
    description: text(200),
    image: imageSchema.nullable(),
  }),
  location: z.strictObject({
    /** Ask for the browser's location as soon as someone opens the site. */
    askOnArrival: z.boolean(),
    notServedMessage: text(300),
  }),
}).superRefine((site, ctx) => {
  if (site.brand.promiseMax < site.brand.promiseMin) ctx.addIssue({ code: "custom", path: ["brand", "promiseMax"], message: V.invalid });
});
export type SiteConfig = z.infer<typeof siteConfigSchema>;

export const updateSiteSchema = z.strictObject({ version: z.number().int().min(1), site: siteConfigSchema });

export interface SiteConfigResponse {
  version: number;
  site: SiteConfig;
  updatedAt: string;
}

/** GET /v1/site: the configuration plus what public pages need from the operations side. */
export interface PublicSiteDto {
  version: number;
  site: SiteConfig;
  /** Names of the areas we serve (Settings → Areas). */
  areas: string[];
}

export interface SiteVersionDto {
  version: number;
  changedAt: string;
  changedBy: string | null;
}

// ---------------------------------------------------------------------------------------
// Sections

export const SECTION_TONES = ["plain", "soft", "accent", "dark"] as const;
export type SectionTone = (typeof SECTION_TONES)[number];

export const FEATURE_ICONS = [
  "verified",
  "shield",
  "clock",
  "price",
  "star",
  "home",
  "spa",
  "sparkle",
  "heart",
  "leaf",
  "location",
  "phone",
  "calendar",
  "wallet",
  "support",
  "hygiene",
  "lock",
  "thumb",
  "brush",
  "bolt",
] as const;
export type FeatureIcon = (typeof FEATURE_ICONS)[number];

const base = {
  id: z.string().regex(/^[a-z0-9]{6,24}$/, V.invalid),
  visible: z.boolean(),
  /** For links such as /#how-it-works; empty for none. */
  anchor: z.string(V.invalid).trim().max(40, V.invalid).regex(/^$|^[a-z][a-z0-9-]*$/, V.slug),
  tone: z.enum(SECTION_TONES),
};
const heading = { eyebrow: text(60), title: text(160), subtitle: text(600) };
const image = imageSchema.nullable();
const count = (min: number, max: number) => z.number(V.invalid).int(V.invalid).min(min, V.invalid).max(max, V.invalid);

const heroSlideSchema = z.strictObject({
  image,
  /** A taller crop for phones; the desktop photo is used when empty. */
  mobileImage: image,
  video: videoFileSchema,
  eyebrow: text(60),
  title: text(120, true),
  /** Shown highlighted after the title ("in 10–15 minutes"). */
  accent: text(80),
  subtitle: text(300),
  primary: ctaSchema,
  secondary: ctaSchema,
  align: z.enum(["left", "center"]),
});
export type HeroSlide = z.infer<typeof heroSlideSchema>;

export const sectionSchemas = {
  hero: z.strictObject({
    ...base,
    type: z.literal("hero"),
    slides: z.array(heroSlideSchema).min(1, V.required).max(6),
    /** 0 keeps the first slide until someone swipes. */
    autoplaySeconds: count(0, 20),
    /** The arrival promise and opening hours under the buttons. */
    showPromise: z.boolean(),
    height: z.enum(["full", "large", "medium"]),
  }),
  pageHeader: z.strictObject({ ...base, type: z.literal("pageHeader"), ...heading, title: text(160, true), image, primary: ctaSchema }),
  categories: z.strictObject({
    ...base,
    type: z.literal("categories"),
    ...heading,
    /** tabs: Women | Men switch; split: both side by side; women/men: one only. */
    layout: z.enum(["tabs", "split", "women", "men"]),
    style: z.enum(["cards", "circles", "posters"]),
    showPrices: z.boolean(),
    cta: ctaSchema,
  }),
  services: z.strictObject({
    ...base,
    type: z.literal("services"),
    ...heading,
    /** auto: first services of the catalogue; picked: the list below, in order. */
    mode: z.enum(["auto", "picked"]),
    gender: z.enum(["all", "women", "men"]),
    slugs: z.array(slugSchema).max(24),
    limit: count(2, 24),
    cta: ctaSchema,
  }),
  offers: z.strictObject({
    ...base,
    type: z.literal("offers"),
    ...heading,
    items: z.array(z.strictObject({ image, badge: text(30), title: text(80, true), subtitle: text(200), cta: ctaSchema })).min(1, V.required).max(8),
  }),
  steps: z.strictObject({
    ...base,
    type: z.literal("steps"),
    ...heading,
    items: z.array(z.strictObject({ image, title: text(80, true), body: text(400) })).min(1, V.required).max(6),
  }),
  stats: z.strictObject({
    ...base,
    type: z.literal("stats"),
    ...heading,
    items: z.array(z.strictObject({ icon: z.enum(FEATURE_ICONS), value: text(30, true), label: text(60, true) })).min(1, V.required).max(6),
  }),
  features: z.strictObject({
    ...base,
    type: z.literal("features"),
    ...heading,
    image,
    items: z.array(z.strictObject({ icon: z.enum(FEATURE_ICONS), title: text(80, true), body: text(300) })).min(1, V.required).max(9),
  }),
  testimonials: z.strictObject({
    ...base,
    type: z.literal("testimonials"),
    ...heading,
    /** reviews: real ratings customers left after a booking; written: the list below. */
    source: z.enum(["reviews", "written", "both"]),
    items: z
      .array(z.strictObject({ name: z.string(V.required).trim().min(1, V.required).max(60, V.invalid), place: text(60), rating: count(1, 5), quote: text(500, true), photo: image }))
      .max(12),
  }),
  faq: z.strictObject({
    ...base,
    type: z.literal("faq"),
    ...heading,
    items: z.array(z.strictObject({ question: text(200, true), answer: text(1500, true) })).min(1, V.required).max(20),
    showContact: z.boolean(),
  }),
  imageText: z.strictObject({ ...base, type: z.literal("imageText"), ...heading, body: text(4_000), image, imageSide: z.enum(["left", "right"]), cta: ctaSchema }),
  richText: z.strictObject({ ...base, type: z.literal("richText"), title: text(160), body: text(40_000, true), width: z.enum(["reading", "wide"]) }),
  gallery: z.strictObject({
    ...base,
    type: z.literal("gallery"),
    ...heading,
    items: z.array(z.strictObject({ image: imageSchema, caption: text(120) })).min(1, V.required).max(24),
  }),
  video: z
    .strictObject({ ...base, type: z.literal("video"), ...heading, youtube: youtubeSchema, file: videoFileSchema, poster: image })
    .refine((section) => section.youtube !== "" || section.file !== "", { path: ["youtube"], message: V.required }),
  cta: z.strictObject({ ...base, type: z.literal("cta"), ...heading, image, primary: ctaSchema, secondary: ctaSchema }),
  appDownload: z.strictObject({ ...base, type: z.literal("appDownload"), ...heading, image }),
  areas: z.strictObject({
    ...base,
    type: z.literal("areas"),
    ...heading,
    /** Localities to list (good for city pages and search engines). */
    items: z.array(text(60, true)).max(80),
    /** Also list the areas from Settings → Areas. */
    showServed: z.boolean(),
    body: text(8_000),
  }),
  contactForm: z.strictObject({ ...base, type: z.literal("contactForm"), ...heading, showDetails: z.boolean() }),
  proApplication: z.strictObject({
    ...base,
    type: z.literal("proApplication"),
    ...heading,
    stepsTitle: text(80),
    steps: z.array(z.strictObject({ title: text(80, true), body: text(300) })).max(6),
    note: text(200),
  }),
  joinPros: z.strictObject({
    ...base,
    type: z.literal("joinPros"),
    ...heading,
    image,
    points: z.array(text(80, true)).max(6),
    cta: ctaSchema,
  }),
} as const;

export type SectionType = keyof typeof sectionSchemas;
export const SECTION_TYPES = Object.keys(sectionSchemas) as SectionType[];

/** Any section, checked against its own type's schema so errors point at the right field. */
export const sectionSchema = z.discriminatedUnion("type", [
  sectionSchemas.hero,
  sectionSchemas.pageHeader,
  sectionSchemas.categories,
  sectionSchemas.services,
  sectionSchemas.offers,
  sectionSchemas.steps,
  sectionSchemas.stats,
  sectionSchemas.features,
  sectionSchemas.testimonials,
  sectionSchemas.faq,
  sectionSchemas.imageText,
  sectionSchemas.richText,
  sectionSchemas.gallery,
  sectionSchemas.video,
  sectionSchemas.cta,
  sectionSchemas.appDownload,
  sectionSchemas.areas,
  sectionSchemas.contactForm,
  sectionSchemas.proApplication,
  sectionSchemas.joinPros,
]);

export type Section = z.infer<typeof sectionSchema>;
export type SectionOf<T extends SectionType> = Extract<Section, { type: T }>;

// ---------------------------------------------------------------------------------------
// Pages

/** "/", "/about", "/legal/privacy", "/faridabad-at-home-services". */
export const pagePathSchema = z
  .string(V.required)
  .trim()
  .max(120, V.slug)
  .regex(/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?)?$/, V.slug);

/** Paths the app itself uses: a page there would never be reachable. */
export const RESERVED_PATHS = [
  "services",
  "cart",
  "checkout",
  "account",
  "bookings",
  "login",
  "signup",
  "admin",
  "pro",
  "forgot-password",
  "reset-password",
  "styleguide",
  "samples",
  "dashboard",
  "all-services",
  "about-us",
  "book-service",
  "media",
  "images",
  "video",
  "brand",
  "icons",
  "v1",
  "health",
  "preview",
] as const;

export const isReservedPath = (path: string): boolean => RESERVED_PATHS.includes(path.split("/")[1] as (typeof RESERVED_PATHS)[number]);

export const pageSeoSchema = z.strictObject({
  /** Empty uses the page title. */
  title: text(70),
  description: text(200),
  image,
  /** Keep the page out of search results. */
  noindex: z.boolean(),
});

export const pageContentSchema = z
  .strictObject({
    title: text(120, true),
    seo: pageSeoSchema,
    sections: z.array(sectionSchema).max(40),
  })
  .superRefine((page, ctx) => {
    const ids = new Set<string>();
    page.sections.forEach((section, index) => {
      if (ids.has(section.id)) ctx.addIssue({ code: "custom", path: ["sections", index, "id"], message: V.invalid });
      ids.add(section.id);
    });
  });
export type PageContent = z.infer<typeof pageContentSchema>;

export const createPageSchema = z.strictObject({
  path: pagePathSchema.refine((path) => path !== "/" && !isReservedPath(path), V.slugTaken),
  title: text(120, true),
  /** Copy the sections of an existing page as a starting point. */
  copyFrom: z.string().regex(/^[a-f0-9]{24}$/).nullable(),
});
export type CreatePageInput = z.infer<typeof createPageSchema>;

export const savePageSchema = z.strictObject({
  version: z.number().int().min(1),
  /** Only pages the site doesn't depend on can move. */
  path: pagePathSchema.refine((path) => path === "/" || !isReservedPath(path), V.slugTaken),
  content: pageContentSchema,
});
export type SavePageInput = z.infer<typeof savePageSchema>;

export type PageStatus = "draft" | "published" | "changed";

export interface PageSummaryDto {
  id: string;
  path: string;
  title: Localized;
  /** Pages the site links to on its own (home, contact, policies…): they can't be deleted or moved. */
  locked: boolean;
  /** The page shipped with the site, so "Reset to default" can bring its content back. */
  hasDefault: boolean;
  status: PageStatus;
  version: number;
  updatedAt: string;
  publishedAt: string | null;
}

export interface AdminPageDto extends PageSummaryDto {
  content: PageContent;
  published: PageContent | null;
}

export interface PublicPageDto {
  path: string;
  title: Localized;
  seo: z.infer<typeof pageSeoSchema>;
  sections: Section[];
  /** When it was last published, for "Last updated". */
  updatedAt: string;
  /** Only in an admin's preview. */
  draft?: boolean;
}

export interface PageVersionDto {
  number: number;
  title: Localized;
  publishedAt: string;
  publishedBy: string | null;
}

// ---------------------------------------------------------------------------------------
// Location, area requests and reviews

export const locateSchema = z.strictObject({
  lat: z.number(V.invalid).min(-90, V.invalid).max(90, V.invalid),
  lng: z.number(V.invalid).min(-180, V.invalid).max(180, V.invalid),
});
export interface LocateResponse {
  served: boolean;
  /** The served area the point falls in. */
  area: string | null;
}

/** "Tell me when you come to my area" from a visitor outside the service areas. */
export const areaRequestSchema = z.strictObject({
  phone: z.string(V.required).trim().regex(/^[6-9]\d{9}$/, V.phone),
  place: z.string(V.invalid).trim().max(120, V.invalid),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
  /** Honeypot. */
  website: z.string().max(200).optional(),
});
export type AreaRequestInput = z.input<typeof areaRequestSchema>;

export interface AreaRequestDto {
  id: string;
  phone: string;
  place: string;
  location: { lat: number; lng: number } | null;
  createdAt: string;
}

/** A real review shown on the website: first name and initial only. */
export interface PublicReviewDto {
  name: string;
  rating: number;
  comment: string;
  service: Localized;
  at: string;
}

// ---------------------------------------------------------------------------------------
// Text variables

/** Values admins can drop into any text as {{name}}; filled in when the page shows. */
export const TEXT_VARIABLES = [
  "brand",
  "phone",
  "email",
  "whatsapp",
  "support",
  "company",
  "address",
  "gstin",
  "grievance",
  "city",
  "min",
  "max",
  "open",
  "close",
  "cancelFee",
  "noShowFee",
  "lateMinutes",
  "waitMinutes",
  "searchTime",
  "searchMinutes",
  "services",
  "updated",
] as const;
export type TextVariable = (typeof TEXT_VARIABLES)[number];

/** Replaces {{name}} with its value; unknown names stay visible so a typo is noticed in preview. */
export function fillVariables(value: string, variables: Partial<Record<TextVariable, string | number>>): string {
  if (!value.includes("{{")) return value;
  return value.replace(/\{\{\s*([a-zA-Z]+)\s*\}\}/g, (match, name: string) => {
    const found = variables[name as TextVariable];
    return found === undefined || found === "" ? match : String(found);
  });
}

/** Every image a value refers to (to keep uploads that are still in use). */
export function imagesIn(value: unknown, found: ImageRef[] = []): ImageRef[] {
  if (Array.isArray(value)) for (const item of value) imagesIn(item, found);
  else if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.key === "string" && Array.isArray(record.widths) && typeof record.width === "number") found.push(record as unknown as ImageRef);
    else for (const item of Object.values(record)) imagesIn(item, found);
  }
  return found;
}
