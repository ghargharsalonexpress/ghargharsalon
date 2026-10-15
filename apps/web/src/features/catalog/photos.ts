import { CATEGORY_PHOTOS, type CatalogGender, type CategoryDto, type ImageRef, type ServiceSummaryDto, SITE_PHOTOS, type SitePhotoSlot } from "@brand/shared";

/** A category's own photo, or the default one shipped for it (admins replace it in Categories). */
export const categoryPhoto = (category: Pick<CategoryDto, "slug" | "image">): ImageRef | null => category.image ?? CATEGORY_PHOTOS[category.slug] ?? null;

/**
 * Shipped photos that suit a service, by what its name says (first match wins). A list of
 * services then shows waxing for waxing and a massage for a massage, instead of the same
 * category photo a hundred times.
 */
const BY_NAME: Record<CatalogGender, ReadonlyArray<[RegExp, ReadonlyArray<SitePhotoSlot>]>> = {
  women: [
    [/mehn?di|mehendi|henna/, ["gallery-mehndi"]],
    [/bridal|wedding|shaadi|glam|diva|makeup|make-up|touch-?up|saree|drap|engagement|party|reception|sangeet/, ["cat-makeup-and-styling", "offer-bridal", "hero-bridal"]],
    [/manicure|nail/, ["gallery-manicure"]],
    [/pedicure|feet|foot/, ["gallery-pedicure"]],
    [/wax|rica/, ["gallery-waxing"]],
    [/thread|eyebrow|upper lip|forehead|\bchin\b/, ["gallery-threading"]],
    [/hair spa|keratin|smoothen|botox|shampoo|hair wash|hair treatment|scalp/, ["gallery-hair-spa"]],
    [/hair|blow ?dry|curl|straighten|colou?r|highlight|fringe|trim/, ["cat-hair-styling", "step-relax"]],
    [/massage|\bspa\b|scrub|polish|body|aroma|therapy|top-?up|swedish|balinese|thai|tissue|head to toe|potli|ritual|relax/, ["cat-spa-for-women"]],
    [/facial|clean ?up|face|mask|glow|bright|bleach|de-?tan|\bo3|peel|skin|\bled\b/, ["cat-salon-for-women", "offer-first", "why-us", "hero-facial"]],
  ],
  men: [
    [/beard|shave|moustache/, ["hero-men"]],
    [/hair|cut|colou?r/, ["cat-men-grooming"]],
    [/head|stress|champi|scalp/, ["cat-men-stress-relief"]],
    [/massage|therapy|pain|relief|back|shoulder|\blegs?\b|foot|body|top-?up/, ["cat-men-pain-relief"]],
    [/scrub|polish|de-?tan|bleach/, ["cat-men-skincare-scrubs"]],
    [/facial|clean ?up|face|mask|skin|glow/, ["cat-men-face-grooming", "cat-men-skincare-scrubs"]],
  ],
};

/** The same service always gets the same photo from a list. */
const pickFor = (slug: string, slots: ReadonlyArray<SitePhotoSlot>): ImageRef | null => {
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return SITE_PHOTOS[slots[hash % slots.length] ?? slots[0]!] ?? null;
};

/** A shipped photo that matches the service's name, or null. */
export function suitedPhoto(service: Pick<ServiceSummaryDto, "slug" | "gender" | "name">): ImageRef | null {
  const name = service.name.en.toLowerCase();
  const match = BY_NAME[service.gender].find(([pattern]) => pattern.test(name));
  return match ? pickFor(service.slug, match[1]) : null;
}

/**
 * The photo for a service card or sheet: its own photo; otherwise a shipped photo that suits
 * its name; otherwise its category's. No service ever shows an empty tile, and an admin's
 * photo on the service always wins.
 */
export function servicePhoto(service: Pick<ServiceSummaryDto, "slug" | "gender" | "name" | "image" | "categorySlugs">, categories: ReadonlyArray<Pick<CategoryDto, "slug" | "image">> = []): ImageRef | null {
  if (service.image) return service.image;
  const suited = suitedPhoto(service);
  if (suited) return suited;
  for (const slug of service.categorySlugs) {
    const category = categories.find((candidate) => candidate.slug === slug);
    const photo = category ? categoryPhoto(category) : (CATEGORY_PHOTOS[slug] ?? null);
    if (photo) return photo;
  }
  return null;
}

/** The shipped photo for the first of these categories: what to show if an uploaded one won't load. */
export const defaultPhotoFor = (categorySlugs: ReadonlyArray<string>): ImageRef | null => categorySlugs.map((slug) => CATEGORY_PHOTOS[slug]).find(Boolean) ?? null;
