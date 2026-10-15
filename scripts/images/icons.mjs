// Builds the brand images from the client's logo (scripts/images/logo.jpg, the gold Ghar Ghar
// Salon Express emblem on black): the site logo in apps/web/public/brand, and the favicon, PWA,
// maskable and Apple icons in apps/web/public. Re-run after the logo changes:
//   node scripts/images/icons.mjs
// The notification badge stays a simple letter: Android draws badges as a one-colour shape.
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sharp = createRequire(path.join(root, "apps/api/package.json"))("sharp");

const LOGO = process.env.BRAND_LOGO ?? path.join(root, "scripts/images/logo.jpg");
const LETTER = process.env.BRAND_LETTER ?? "G";
// Keep in step with accentRamps.orange[600] in apps/web/src/design-system/tokens/color.ts.
const ACCENT = process.env.BRAND_ACCENT ?? "#C2410C";
// The logo's own background, so padding around it is invisible.
const LOGO_BACKGROUND = "#000000";
const PUBLIC = path.join(root, "apps/web/public");

await mkdir(path.join(PUBLIC, "brand"), { recursive: true });
await mkdir(path.join(PUBLIC, "icons"), { recursive: true });

/** The logo at `size`, optionally shrunk to `inset` of the canvas (maskable icons need a safe zone). */
async function logo(size, { inset = 1 } = {}) {
  const inner = Math.round(size * inset);
  const resized = await sharp(LOGO).resize(inner, inner, { fit: "cover" }).toBuffer();
  if (inner === size) return sharp(resized);
  const pad = Math.floor((size - inner) / 2);
  return sharp(resized).extend({ top: pad, left: pad, bottom: size - inner - pad, right: size - inner - pad, background: LOGO_BACKGROUND });
}

// The site logo (header, footer, admin): shown round at 24–56 px, so 1x and 2x of 96 px.
for (const width of [96, 192]) {
  await (await logo(width)).webp({ quality: 90 }).toFile(path.join(PUBLIC, `brand/logo-${width}.webp`));
  console.log(`brand/logo-${width}.webp`);
}
// For emails and link previews, which need a plain format.
await (await logo(512)).png({ compressionLevel: 9, palette: true, quality: 92 }).toFile(path.join(PUBLIC, "brand/logo-512.png"));
console.log("brand/logo-512.png");

const icons = [
  ["favicon-48.png", 48, {}],
  ["icons/icon-192.png", 192, {}],
  ["icons/icon-512.png", 512, {}],
  // Maskable: launchers crop to a circle or squircle within the central 80%.
  ["icons/maskable-512.png", 512, { inset: 0.8 }],
  // iOS adds its own rounding.
  ["icons/apple-touch-icon.png", 180, {}],
];
for (const [name, size, options] of icons) {
  await (await logo(size, options)).png({ compressionLevel: 9, palette: true, quality: 92 }).toFile(path.join(PUBLIC, name));
  console.log(name);
}

const badge = (size) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${ACCENT}"/>
  <text x="${size / 2}" y="${size / 2 + size * 0.58 * 0.36}" text-anchor="middle" font-family="Noto Sans, Segoe UI, Arial, sans-serif" font-size="${size * 0.58}" font-weight="600" fill="#FFFFFF">${LETTER}</text>
</svg>`);
await sharp(badge(96)).png({ compressionLevel: 9 }).toFile(path.join(PUBLIC, "icons/badge-96.png"));
console.log("icons/badge-96.png");
