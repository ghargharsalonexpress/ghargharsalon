import { CATEGORY_PHOTOS, type CategoryDto, type ImageRef, type ServiceSummaryDto } from "@brand/shared";

/** A category's own photo, or the default one shipped for it (admins replace it in Categories). */
export const categoryPhoto = (category: Pick<CategoryDto, "slug" | "image">): ImageRef | null => category.image ?? CATEGORY_PHOTOS[category.slug] ?? null;

/**
 * A service's own photo, or its category's: no service ever shows an empty tile. Uploading a
 * category photo changes it for every service in that category that has none of its own.
 */
export function servicePhoto(service: Pick<ServiceSummaryDto, "image" | "categorySlugs">, categories: ReadonlyArray<Pick<CategoryDto, "slug" | "image">> = []): ImageRef | null {
  if (service.image) return service.image;
  for (const slug of service.categorySlugs) {
    const category = categories.find((candidate) => candidate.slug === slug);
    const photo = category ? categoryPhoto(category) : (CATEGORY_PHOTOS[slug] ?? null);
    if (photo) return photo;
  }
  return null;
}

/** The shipped photo for the first of these categories: what to show if an uploaded one won't load. */
export const defaultPhotoFor = (categorySlugs: ReadonlyArray<string>): ImageRef | null => categorySlugs.map((slug) => CATEGORY_PHOTOS[slug]).find(Boolean) ?? null;
