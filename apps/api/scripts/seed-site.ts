/**
 * Prepares a database for the admin-editable website (ADR-0021). It only ever adds:
 * - the site settings and the shipped pages, when they don't exist yet;
 * - a default photo for each category that has none, uploaded to media storage
 *   (ImageKit when MEDIA_STORAGE=imagekit) from scripts/images/site/src.
 * Prices, services, photos already set and anything an admin changed are never touched.
 *   npm run seed:site -- --dry-run     show what would change
 *   npm run seed:site                  do it
 * Only the website's own indexes are created here; user indexes belong to migrate:otp-login.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_SITE_CONFIG } from "@brand/shared";
import { loadConfig } from "../src/config";
import { connectDb, disconnectDb } from "../src/db";
import { Category } from "../src/modules/catalog/catalog.models";
import { processImage } from "../src/modules/media/images";
import { createMediaStorage } from "../src/modules/media/storage";
import { DEFAULT_PAGES } from "../src/modules/site/defaultPages";
import { AreaRequest, Page, PageVersion, SiteHistory, SiteModel } from "../src/modules/site/site.models";
import { ensureDefaultPages } from "../src/modules/site/site.service";

const here = fileURLToPath(new URL(".", import.meta.url));
const photos = resolve(here, "../../../scripts/images/site/src");
const dryRun = process.argv.includes("--dry-run");

const config = loadConfig(process.env);
const storage = createMediaStorage(config);
const host = (() => {
  try {
    return new URL(config.MONGODB_URI).host;
  } catch {
    return "(unparsable)";
  }
})();
console.log(`database host: ${host} · media: ${config.MEDIA_STORAGE}${dryRun ? " · DRY RUN, nothing is written" : ""}`);

await connectDb(config.MONGODB_URI);
for (const model of [SiteModel, SiteHistory, Page, PageVersion, AreaRequest]) await model.createIndexes();

// 1. Site settings and shipped pages.
const site = await SiteModel.findById("site").lean();
const existing = new Set((await Page.find({}, { path: 1 }).lean()).map((page) => page.path));
const seeded = new Set(site?.seededPages ?? []);
const newPages = DEFAULT_PAGES.filter((page) => !existing.has(page.path) && !seeded.has(page.path)).map((page) => page.path);
console.log(site ? "site settings: already there (left as they are)" : "site settings: will be created with the shipped defaults");
console.log(newPages.length ? `pages to create: ${newPages.join(", ")}` : "pages: all already there");
if (!dryRun) {
  if (!site) await SiteModel.create({ _id: "site", version: 1, values: DEFAULT_SITE_CONFIG, seededPages: [], updatedBy: null });
  await ensureDefaultPages();
}

// 2. A photo for every category that has none.
const bare = await Category.find({ image: null }, { slug: 1 }).lean();
for (const category of bare) {
  const file = resolve(photos, `cat-${category.slug}.jpg`);
  if (!existsSync(file)) {
    console.log(`category ${category.slug}: no default photo shipped, skipped`);
    continue;
  }
  if (dryRun) {
    console.log(`category ${category.slug}: would upload cat-${category.slug}.jpg`);
    continue;
  }
  const { image, files } = await processImage(readFileSync(file), `categories/${category.slug}`, { transforms: storage.transforms });
  await storage.put(files);
  // Only if it is still empty: an admin who added a photo meanwhile keeps theirs.
  const result = await Category.updateOne({ _id: category._id, image: null }, { $set: { image } });
  console.log(`category ${category.slug}: ${result.modifiedCount ? `photo set (${image.key})` : "an admin set one meanwhile, kept theirs"}`);
}
if (bare.length === 0) console.log("categories: every one already has a photo");

await disconnectDb();
console.log(dryRun ? "dry run finished" : "done");
