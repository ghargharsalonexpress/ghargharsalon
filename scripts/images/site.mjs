// Builds the website's default photos (ADR-0021) from scripts/images/site: the WebP sizes in
// apps/web/public/images/site and packages/shared/src/siteImages.ts, which lists them with
// their size, focal point and alt texts. Admins replace any of them by uploading their own.
//   node scripts/images/site.mjs
// To change a photo: put the new JPEG in scripts/images/site/src, update photos.json (and the
// credits in LICENSES.md), and run this again.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sharp = createRequire(path.join(root, "apps/api/package.json"))("sharp");

const SOURCE = path.join(root, "scripts/images/site");
const OUT = path.join(root, "apps/web/public/images/site");
const MODULE = path.join(root, "packages/shared/src/siteImages.ts");
/** Banners span the screen; everything else is a card or half the page at most. */
const WIDE = new Set(["hero-facial", "hero-bridal", "hero-men", "about-main", "contact-main", "city-main"]);
const SIZES = [480, 960, 1440, 1920];

const photos = JSON.parse(await readFile(path.join(SOURCE, "photos.json"), "utf8"));
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const entries = [];
let bytes = 0;
for (const [slot, photo] of Object.entries(photos)) {
  const input = path.join(SOURCE, photo.file);
  const meta = await sharp(input).rotate().metadata();
  const rotated = (meta.orientation ?? 1) >= 5;
  const width = rotated ? meta.height : meta.width;
  const height = rotated ? meta.width : meta.height;
  const largest = WIDE.has(slot) ? 1920 : 1440;
  const widths = SIZES.filter((size) => size <= Math.min(width, largest));
  for (const size of widths) {
    const body = await sharp(input).rotate().resize({ width: size, withoutEnlargement: true }).webp({ quality: 74, effort: 5 }).toBuffer();
    await writeFile(path.join(OUT, `${slot}-${size}.webp`), body);
    bytes += body.length;
  }
  entries.push(`  ${JSON.stringify(slot)}: photo(${JSON.stringify(slot)}, ${width}, ${height}, [${widths.join(", ")}], ${JSON.stringify(photo.position)}, ${JSON.stringify(photo.alt)}, ${JSON.stringify(photo.altHi)}),`);
  console.log(`${slot}: ${width}×${height} → ${widths.join(", ")}`);
}

const source = await readFile(MODULE, "utf8");
const start = source.indexOf("export const SITE_PHOTOS = {");
const end = source.indexOf("} as const satisfies Record<string, SitePhoto>;");
if (start < 0 || end < 0) throw new Error("siteImages.ts: SITE_PHOTOS block not found");
await writeFile(MODULE, `${source.slice(0, start)}export const SITE_PHOTOS = {\n${entries.join("\n")}\n${source.slice(end)}`);
console.log(`${entries.length} photos, ${(bytes / 1024 / 1024).toFixed(1)} MB of WebP in apps/web/public/images/site`);
