// Loaded only when the API can't serve website pages (it is older than this web app, or down),
// so the shipped content never weighs on the main bundle. Imported by path, not through
// "@brand/shared", so the bundler keeps it in its own chunk.
import { defaultPage, SHIPPED_PAGES_DATE } from "../../../../../packages/shared/src/sitePages";
import type { PublicPageDto } from "@brand/shared";

export function shippedPage(path: string): PublicPageDto | null {
  const page = defaultPage(path);
  return page ? { path, title: page.content.title, seo: page.content.seo, sections: page.content.sections, updatedAt: SHIPPED_PAGES_DATE } : null;
}
