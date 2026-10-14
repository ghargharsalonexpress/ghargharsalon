// Brand configuration (decision D9: the client chose the name). Changing it here updates the
// wordmark, monogram and page titles; emails take BRAND_NAME from apps/api/.env, and the
// icons, manifests and index.html title are static files in public/ and index.html.
export const brand = {
  name: "Ghar Ghar Salon Express",
  supportPhone: "+91 00000 00000",
  supportEmail: "support@brand.in",
  promiseMinutes: { min: 10, max: 15 },
  /** The professionals' application form (plan A3: onboarding starts with a Google Form). */
  professionalFormUrl: import.meta.env.VITE_PRO_FORM_URL ?? "",
} as const;
