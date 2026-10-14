// Builds the app icons (favicon set, PWA and maskable icons) into apps/web/public/icons from
// the monogram: the brand's first letter on the accent colour (plan B1). Re-run after the
// brand name or colour changes: node scripts/images/icons.mjs
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sharp = createRequire(path.join(root, "apps/api/package.json"))("sharp");

const LETTER = process.env.BRAND_LETTER ?? "B";
const ACCENT = process.env.BRAND_ACCENT ?? "#9E1F55";
const OUT = path.join(root, "apps/web/public/icons");

/** size: canvas; inset: share of the canvas the letter square takes (maskable needs a safe zone). */
const svg = (size, { rounded = true, inset = 1 } = {}) => {
  const square = size * inset;
  const offset = (size - square) / 2;
  const radius = rounded ? square * 0.22 : 0;
  const fontSize = square * 0.58;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${rounded && inset === 1 ? "none" : ACCENT}"/>
  <rect x="${offset}" y="${offset}" width="${square}" height="${square}" rx="${radius}" fill="${ACCENT}"/>
  <text x="${size / 2}" y="${size / 2 + fontSize * 0.36}" text-anchor="middle" font-family="Noto Sans, Segoe UI, Arial, sans-serif" font-size="${fontSize}" font-weight="600" fill="#FFFFFF">${LETTER}</text>
</svg>`);
};

await mkdir(OUT, { recursive: true });
const jobs = [
  ["icon-192.png", 192, { rounded: true }],
  ["icon-512.png", 512, { rounded: true }],
  // Maskable: full-bleed colour, letter inside the central 80% safe zone.
  ["maskable-512.png", 512, { rounded: false, inset: 0.8 }],
  // iOS adds its own rounding; a full square avoids a double corner.
  ["apple-touch-icon.png", 180, { rounded: false }],
  ["badge-96.png", 96, { rounded: true }],
];
for (const [name, size, options] of jobs) {
  await sharp(svg(size, options)).png({ compressionLevel: 9 }).toFile(path.join(OUT, name));
  console.log(name);
}
