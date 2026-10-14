interface ImportMetaEnv {
  /** API origin, e.g. https://api.brand.in. Defaults to http://localhost:4000 in development. */
  readonly VITE_API_URL?: string;
  /** Catalogue photos, e.g. https://media.brand.in. Defaults to the local API's /media. */
  readonly VITE_MEDIA_URL?: string;
  /** The professionals' application form (Google Form). Without it, "Apply" points to support. */
  readonly VITE_PRO_FORM_URL?: string;
  /** Google Maps Platform browser key (restricted to the site's domains). Without it, maps show their text alternative. */
  readonly VITE_GOOGLE_MAPS_KEY?: string;
  /** The release tag sent with client error reports. */
  readonly VITE_RELEASE?: string;
  /** "1" sends client error reports from a development build too. */
  readonly VITE_REPORT_ERRORS?: string;
  /** "1" keeps /styleguide and /samples in a production build (staging, for the brand review). */
  readonly VITE_SHOW_STYLEGUIDE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
