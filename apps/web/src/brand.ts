import type { SiteConfig } from "@brand/shared";

// Brand details (decision D9: the client chose the name). Admins change them in Admin →
// Website → Brand & theme (ADR-0021); these values are what the site shows until that loads,
// and what plain code (error texts, the payment sheet) reads afterwards. React screens read
// the site configuration itself through useSite(), so they update the moment it changes.
export const brand = {
  name: "Ghar Ghar Salon Express",
  supportPhone: "+91 70650 94179",
  supportEmail: "teamhr@ghargharsalonexpress.com",
  promiseMinutes: { min: 10, max: 15 },
  /** The professionals' application form (plan A3: onboarding starts with a Google Form). */
  professionalFormUrl: import.meta.env.VITE_PRO_FORM_URL ?? "",
};

/** Copies the admin's brand settings over the defaults above. */
export function applySiteBrand(site: SiteConfig): void {
  brand.name = site.brand.name.en || brand.name;
  brand.supportPhone = site.brand.supportPhone;
  brand.supportEmail = site.brand.supportEmail;
  brand.promiseMinutes = { min: site.brand.promiseMin, max: site.brand.promiseMax };
  if (site.proFormUrl) brand.professionalFormUrl = site.proFormUrl;
}
