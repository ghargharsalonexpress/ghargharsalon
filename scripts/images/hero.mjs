// Builds the home hero photo into apps/web/public/images (AVIF + WebP, 4 widths).
// Run from the repo root: node scripts/images/hero.mjs
// sharp is borrowed from apps/api, which already depends on it (ADR-0018: no workspaces).
import { mkdir, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sharp = createRequire(path.join(root, "apps/api/package.json"))("sharp");

const SOURCE = path.join(root, "src/asset/mehndi.jpg");
const OUT = path.join(root, "apps/web/public/images");
const WIDTHS = [320, 640, 960, 1280];

await mkdir(OUT, { recursive: true });
for (const width of WIDTHS) {
  const base = sharp(SOURCE).rotate().resize({ width, withoutEnlargement: true });
  const avif = path.join(OUT, `hero-${width}.avif`);
  const webp = path.join(OUT, `hero-${width}.webp`);
  await base.clone().avif({ quality: 50, effort: 6 }).toFile(avif);
  await base.clone().webp({ quality: 72 }).toFile(webp);
  console.log(width, `${Math.round((await stat(avif)).size / 1024)} KB avif`, `${Math.round((await stat(webp)).size / 1024)} KB webp`);
}
const meta = await sharp(SOURCE).metadata();
console.log("source", meta.width, "x", meta.height);
