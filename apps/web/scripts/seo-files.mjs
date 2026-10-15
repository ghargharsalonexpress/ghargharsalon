// Writes dist/robots.txt and dist/sitemap.xml after `vite build` (plan C3: SEO).
//   SITE_URL=https://brand.in API_URL=https://api.brand.in node scripts/seo-files.mjs
// Without SITE_URL (local builds) it writes a robots.txt that blocks indexing and no sitemap,
// so a staging or preview build can never be indexed by mistake.
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const dist = join(import.meta.dirname, "..", "dist");
const site = process.env.SITE_URL?.replace(/\/$/, "");
const api = (process.env.API_URL ?? process.env.VITE_API_URL ?? "").replace(/\/$/, "");

if (!site) {
  writeFileSync(join(dist, "robots.txt"), "User-agent: *\nDisallow: /\n");
  console.log("seo-files: no SITE_URL, wrote a robots.txt that blocks indexing (no sitemap)");
  process.exit(0);
}

const PRIVATE = ["/account", "/admin", "/pro", "/checkout", "/bookings", "/login", "/signup", "/forgot-password", "/reset-password", "/styleguide", "/samples", "/cart"];
// The API's sitemap (ADR-0021) is always current: pages admins publish appear without a rebuild.
const sitemaps = [`Sitemap: ${site}/sitemap.xml`, ...(api ? [`Sitemap: ${api}/v1/sitemap.xml`] : [])];
writeFileSync(join(dist, "robots.txt"), ["User-agent: *", ...PRIVATE.map((path) => `Disallow: ${path}`), "", ...sitemaps, ""].join("\n"));

const pages = ["/", "/services", "/about", "/contact", "/register-as-professional", "/legal/privacy", "/legal/terms", "/legal/cancellation-refund", "/faridabad-at-home-services"];
let catalogue = { categories: [], services: [] };
if (api) {
  const response = await fetch(`${api}/v1/catalog`, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`seo-files: GET ${api}/v1/catalog answered ${response.status}`);
  catalogue = await response.json();
} else {
  console.warn("seo-files: no API_URL, the sitemap lists only the fixed pages");
}

const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const urls = [
  ...pages,
  ...catalogue.categories.map((category) => `/services?category=${encodeURIComponent(category.slug)}`),
  ...catalogue.services.map((service) => `/services/${encodeURIComponent(service.slug)}`),
];
const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map((path) => `  <url><loc>${escape(site + path)}</loc></url>`),
  "</urlset>",
  "",
].join("\n");
writeFileSync(join(dist, "sitemap.xml"), xml);
console.log(`seo-files: sitemap.xml with ${urls.length} addresses for ${site}`);
