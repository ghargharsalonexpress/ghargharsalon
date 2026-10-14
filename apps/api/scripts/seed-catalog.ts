/**
 * Loads the migrated catalogue (seed/catalog.json, from scripts/catalog/migrate.mjs) into
 * MongoDB, re-encoding every photo into AVIF/WebP sizes in media storage.
 *   npm run seed:catalog               add what's missing; existing slugs are left alone
 *   npm run seed:catalog -- --replace  overwrite existing categories and services
 *   npm run seed:catalog -- --no-images
 *                                      load the text only, leaving every photo empty. Use it for the
 *                                      first load against a real database before the CDN is set up,
 *                                      then re-run with --replace to add the photos.
 *   npm run seed:catalog -- --replace --prune
 *                                      also deletes services the seed no longer has (development only:
 *                                      it would remove services an admin created)
 * Hindi first drafts from seed/hindi-drafts.json fill empty Hindi names (plan A14: review needed).
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { categoryInputSchema, type ImageRef, serviceInputSchema, z } from "@brand/shared";
import { loadConfig } from "../src/config";
import { connectDb, disconnectDb, ensureIndexes } from "../src/db";
import { Category, Service } from "../src/modules/catalog/catalog.models";
import { processImage } from "../src/modules/media/images";
import { createMediaStorage } from "../src/modules/media/storage";

const here = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(here, "../../..");
const seedDir = resolve(here, "../seed");
const cacheDir = resolve(here, "../.data/seed-cache");
const replace = process.argv.includes("--replace");
const prune = process.argv.includes("--prune");
const noImages = process.argv.includes("--no-images");

interface SeedImage {
  source: string;
  stock?: boolean;
}
type SeedCatalog = {
  categories: Array<Record<string, unknown> & { slug: string; image: SeedImage | null }>;
  services: Array<Record<string, unknown> & { slug: string; images: SeedImage[]; name: { en: string; hi: string }; summary: { en: string; hi: string }; tiers: Array<{ id: string; label: { en: string; hi: string } }> }>;
};
type HindiDrafts = { services: Record<string, { name?: string; summary?: string; tiers?: Record<string, string> }> };

const catalog = JSON.parse(readFileSync(join(seedDir, "catalog.json"), "utf8")) as SeedCatalog;
const draftsPath = join(seedDir, "hindi-drafts.json");
const drafts: HindiDrafts = existsSync(draftsPath) ? (JSON.parse(readFileSync(draftsPath, "utf8")) as HindiDrafts) : { services: {} };

const config = loadConfig(process.env);
const storage = createMediaStorage(config);
mkdirSync(cacheDir, { recursive: true });

/** Bytes of a seed image: a repository file, or a download kept in .data/seed-cache. */
async function load(source: string): Promise<Buffer> {
  if (!/^https?:\/\//.test(source)) return readFileSync(join(repoRoot, source));
  const cached = join(cacheDir, createHash("sha1").update(source).digest("hex"));
  if (existsSync(cached)) return readFileSync(cached);
  const response = await fetch(source, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = Buffer.from(await response.arrayBuffer());
  writeFileSync(cached, body);
  return body;
}

const failures: string[] = [];
async function store(image: SeedImage, folder: string, owner: string): Promise<ImageRef | null> {
  if (noImages) return null;
  try {
    const { image: ref, files } = await processImage(await load(image.source), folder, { transforms: storage.transforms });
    await storage.put(files);
    return ref;
  } catch (error) {
    failures.push(`${owner}: ${image.source} (${error instanceof Error ? error.message : String(error)})`);
    return null;
  }
}

await connectDb(config.MONGODB_URI);
await ensureIndexes();

let categoriesWritten = 0;
for (const seed of catalog.categories) {
  if (!replace && (await Category.exists({ slug: seed.slug }))) continue;
  const image = seed.image ? await store(seed.image, `categories/${seed.slug}`, seed.slug) : null;
  const input = categoryInputSchema.parse({ ...seed, image });
  await Category.findOneAndUpdate({ slug: input.slug }, { $set: input }, { upsert: true });
  categoriesWritten++;
}

let servicesWritten = 0;
let hindiFilled = 0;
const invalid: string[] = [];
for (const [index, seed] of catalog.services.entries()) {
  if (!replace && (await Service.exists({ slug: seed.slug }))) continue;

  const draft = drafts.services[seed.slug];
  if (draft) {
    if (!seed.name.hi && draft.name) seed.name.hi = draft.name;
    if (!seed.summary.hi && draft.summary) seed.summary.hi = draft.summary;
    for (const tier of seed.tiers) if (!tier.label.hi && draft.tiers?.[tier.id]) tier.label.hi = draft.tiers[tier.id] ?? "";
    hindiFilled++;
  }

  const images: ImageRef[] = [];
  for (const image of seed.images) {
    const ref = await store(image, `services/${seed.slug}`, seed.slug);
    if (ref) images.push(ref);
  }

  const parsed = serviceInputSchema.safeParse({ ...seed, images });
  if (!parsed.success) {
    invalid.push(`${seed.slug}: ${z.prettifyError(parsed.error).replace(/\n/g, " ")}`);
    continue;
  }
  await Service.findOneAndUpdate({ slug: parsed.data.slug }, { $set: parsed.data, $inc: { version: 1 } }, { upsert: true });
  servicesWritten++;
  if ((index + 1) % 20 === 0) console.log(`… ${index + 1}/${catalog.services.length} services`);
}

let pruned = 0;
if (prune) {
  if (config.NODE_ENV === "production") throw new Error("--prune is for development databases only");
  const result = await Service.deleteMany({ slug: { $nin: catalog.services.map((service) => service.slug) } });
  pruned = result.deletedCount;
}

console.log(`Categories written: ${categoriesWritten}/${catalog.categories.length}`);
if (prune) console.log(`Services removed because the seed no longer has them: ${pruned}`);
console.log(`Services written: ${servicesWritten}/${catalog.services.length} (Hindi drafts applied to ${hindiFilled})`);
if (failures.length) console.log(`Images that couldn't be loaded (the card shows the neutral tile):\n- ${failures.join("\n- ")}`);
if (invalid.length) console.log(`Services rejected by validation:\n- ${invalid.join("\n- ")}`);
await disconnectDb();
