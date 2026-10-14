import type { ImageRef } from "@brand/shared";

/** Site photography served by the web app from /images (built by scripts/images/hero.mjs). */
export const SITE_IMAGE_BASE = "";

/** Pass to <Picture> for site photos: they are plain files even when the catalogue is on a CDN. */
export const SITE_IMAGE_SOURCE = { baseUrl: SITE_IMAGE_BASE, mode: "files" } as const;

/** Home hero: a professional giving a customer a facial (src/asset/spa.jpg, a real photograph). */
export const HERO_IMAGE: ImageRef = { key: "images/hero", width: 3500, height: 2333, widths: [320, 640, 960, 1280] };
