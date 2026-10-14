// Catalog audit (Phase 0). Reads the legacy catalog in src/store/data and writes
// docs/catalog-audit.md. Read-only: it never modifies the source data.
// Run: node scripts/catalog/audit.mjs

import { register } from "node:module";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

register("./hooks.mjs", import.meta.url);

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const importData = (relative) => import(pathToFileURL(path.join(root, relative)).href);

const { woman } = await importData("src/store/data/woman/index.js");
const { men } = await importData("src/store/data/men.js");

const sources = [
  { gender: "women", data: woman },
  { gender: "men", data: men },
];

// ---------- collect ----------
const entries = [];
const categories = [];
for (const { gender, data } of sources) {
  for (const category of data.categories) {
    categories.push({ gender, id: category.id, name: category.name, filters: category.filters ?? [], count: category.packages?.length ?? 0 });
    for (const pkg of category.packages ?? []) entries.push({ gender, categoryId: category.id, filters: category.filters ?? [], pkg });
  }
}

// ---------- helpers ----------
const count = (map, key, by = 1) => map.set(key, (map.get(key) ?? 0) + by);
const table = (headers, rows) =>
  [`| ${headers.join(" | ")} |`, `|${headers.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");
const code = (value) => `\`${String(value).replace(/\|/g, "\\|")}\``;

function parseDurationMinutes(text) {
  if (typeof text !== "string" || !text.trim()) return { kind: "missing" };
  const t = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (/[x×]/.test(t) && /\d\s*[x×]\s*\d/.test(t)) return { kind: "multi-session", value: text };
  let minutes = 0;
  let matched = false;
  const hours = t.match(/(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)\b/);
  if (hours) { minutes += Math.round(parseFloat(hours[1]) * 60); matched = true; }
  const mins = t.match(/(\d+)\s*(m|min|mins|minute|minutes)\b/);
  if (mins) { minutes += parseInt(mins[1], 10); matched = true; }
  const range = t.match(/^(\d+)\s*[-–]\s*(\d+)\s*(min|mins|minutes)/);
  if (range) return { kind: "range", value: text, minutes: parseInt(range[2], 10) };
  return matched ? { kind: "ok", minutes } : { kind: "unparsed", value: text };
}

function classifyImage(value) {
  if (value === undefined || value === null || value === "") return "empty";
  if (typeof value !== "string") return "non-string";
  if (value.startsWith("asset:")) return "bundled asset (src/asset)";
  if (/source\.unsplash\.com/.test(value)) return "retired source.unsplash.com";
  if (/^https?:\/\//.test(value)) return `remote (${new URL(value).host})`;
  if (/^\/Users\//.test(value) || /^[A-Za-z]:\\/.test(value)) return "absolute path on a developer machine";
  if (value.startsWith("/")) return existsSync(path.join(root, "public", value)) ? "public file (exists)" : "public file (missing)";
  return "other";
}

// ---------- analysis ----------
const ids = new Map(); // id -> [{gender, categoryId}]
for (const e of entries) {
  const list = ids.get(e.pkg.id) ?? [];
  list.push({ gender: e.gender, categoryId: e.categoryId });
  ids.set(e.pkg.id, list);
}
const duplicatesWithinGender = [];
const crossGender = [];
for (const [id, list] of ids) {
  const genders = new Set(list.map((x) => x.gender));
  if (genders.size > 1) crossGender.push({ id, list });
  for (const g of genders) {
    const sameGender = list.filter((x) => x.gender === g);
    if (sameGender.length > 1) duplicatesWithinGender.push({ id, gender: g, list: sameGender });
  }
}
const missingIds = entries.filter((e) => !e.pkg.id);

const keyCounts = { women: new Map(), men: new Map() };
for (const e of entries) for (const key of Object.keys(e.pkg)) count(keyCounts[e.gender], key);

const variantPairs = [
  ["after_care", "aftercare"],
  ["faq", "FAQs"],
  ["recommendedFor", "recommended_for"],
  ["products_used", "products_and_brand"],
  ["bannerImage", "bannerIMage"],
];

const overviewShapes = new Map();
const faqShapes = new Map();
for (const e of entries) {
  const o = e.pkg.overview;
  const oShape = o === undefined ? "absent" : Array.isArray(o) ? (o.every((x) => typeof x === "string") ? "string[]" : o.every((x) => x && typeof x === "object") ? "{title,desc}[]" : "mixed[]") : typeof o;
  count(overviewShapes, oShape);
  const f = e.pkg.faq ?? e.pkg.FAQs;
  const fShape = f === undefined ? "absent" : Array.isArray(f) ? (f.every((x) => typeof x === "string") ? "string[]" : f.every((x) => x && typeof x === "object" && "question" in x) ? "{question,answer}[]" : "mixed[]") : typeof f;
  count(faqShapes, fShape);
}

const unknownFilters = new Map(); // value -> count
for (const e of entries) {
  for (const value of e.pkg.withFilter ?? []) {
    if (!e.filters.includes(value)) count(unknownFilters, `${e.gender}/${e.categoryId}: ${value}`);
  }
}

const priceIssues = [];
let tierPackages = 0;
let tierCount = 0;
const tierIssues = [];
for (const e of entries) {
  const p = e.pkg;
  const tiers = Array.isArray(p.tiers) ? p.tiers : [];
  if (tiers.length) {
    tierPackages += 1;
    tierCount += tiers.length;
    const tierIds = new Set();
    for (const t of tiers) {
      if (typeof t.price !== "number") tierIssues.push(`${p.id}: tier ${t.id ?? "?"} has no numeric price`);
      if (t.id && tierIds.has(t.id)) tierIssues.push(`${p.id}: duplicate tier id ${t.id}`);
      if (t.id) tierIds.add(t.id);
      if (typeof t.oldPrice === "number" && typeof t.price === "number" && t.oldPrice < t.price) tierIssues.push(`${p.id}: tier ${t.id} oldPrice < price`);
    }
  }
  if (!tiers.length && typeof p.price !== "number") priceIssues.push(`${p.id ?? "(no id)"} (${e.gender}/${e.categoryId}): no price and no tiers`);
  if (typeof p.oldPrice === "number" && typeof p.price === "number" && p.oldPrice < p.price) priceIssues.push(`${p.id}: oldPrice ${p.oldPrice} < price ${p.price}`);
  if (typeof p.oldPrice === "number" && typeof p.price === "number" && typeof p.discountPercent === "number" && p.oldPrice > 0) {
    const computed = Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100);
    if (Math.abs(computed - p.discountPercent) > 1) priceIssues.push(`${p.id}: discountPercent ${p.discountPercent}% but prices imply ${computed}%`);
  }
}
const prices = entries.map((e) => e.pkg.price).filter((v) => typeof v === "number");

const durationKinds = new Map();
const unparsedDurations = new Map();
for (const e of entries) {
  const sources = [e.pkg.duration, ...(Array.isArray(e.pkg.tiers) ? e.pkg.tiers.map((t) => t.duration) : [])].filter((v) => v !== undefined);
  if (!sources.length) { count(durationKinds, "missing"); continue; }
  for (const d of sources) {
    const parsed = parseDurationMinutes(d);
    count(durationKinds, parsed.kind);
    if (parsed.kind === "unparsed" || parsed.kind === "multi-session" || parsed.kind === "range") count(unparsedDurations, `${parsed.kind}: ${d}`);
  }
}

const imageFields = ["image", "avatar", "miniAvatar", "bannerImage", "bannerIMage"];
const imageClasses = new Map();
const noImageAtAll = [];
for (const e of entries) {
  const values = [];
  for (const field of imageFields) if (field in e.pkg) values.push(e.pkg[field]);
  if (Array.isArray(e.pkg.avatars)) values.push(...e.pkg.avatars);
  const primary = e.pkg.image || e.pkg.avatar || e.pkg.miniAvatar;
  if (!primary) noImageAtAll.push(`${e.gender}/${e.categoryId}: ${e.pkg.id}`);
  for (const v of values) count(imageClasses, classifyImage(v));
}

const genderValues = new Map();
for (const e of entries) count(genderValues, `${e.gender}: ${e.pkg.gender ?? "(missing)"}`);
const withRatings = entries.filter((e) => e.pkg.ratings && typeof e.pkg.ratings.score === "number").length;

// ---------- report ----------
const byGender = (g) => entries.filter((e) => e.gender === g);
const uniqueIds = (g) => new Set(byGender(g).map((e) => e.pkg.id)).size;
const now = new Date().toISOString().slice(0, 10);

const lines = [];
lines.push("# Catalog audit");
lines.push("");
lines.push(`Generated ${now} by \`node scripts/catalog/audit.mjs\` from \`src/store/data\`. Read-only; rerun after any data change.`);
lines.push("");
lines.push("## Summary");
lines.push(table(["", "Women", "Men"], [
  ["Categories", categories.filter((c) => c.gender === "women").length, categories.filter((c) => c.gender === "men").length],
  ["Service entries", byGender("women").length, byGender("men").length],
  ["Unique service ids", uniqueIds("women"), uniqueIds("men")],
  ["Entries with price tiers", byGender("women").filter((e) => e.pkg.tiers?.length).length, byGender("men").filter((e) => e.pkg.tiers?.length).length],
  ["Entries with ratings", byGender("women").filter((e) => e.pkg.ratings).length, byGender("men").filter((e) => e.pkg.ratings).length],
]));
lines.push("");
lines.push(`Price tiers: ${tierCount} tiers across ${tierPackages} services. Ratings present on ${withRatings} entries (not shown anywhere today). Single prices range from ₹${Math.min(...prices)} to ₹${Math.max(...prices)}.`);
lines.push("");
lines.push("## Categories");
lines.push(table(["Gender", "Id", "Name", "Services", "Filters"], categories.map((c) => [c.gender, code(c.id), c.name, c.count, c.filters.map((f) => code(f)).join(", ") || "—"])));
lines.push("");
lines.push("## Identity problems");
lines.push(`- Entries without an id: ${missingIds.length}`);
lines.push(`- Ids repeated within the same gender: ${duplicatesWithinGender.length}`);
lines.push(`- Ids used by both women and men: ${crossGender.length}`);
lines.push("");
if (duplicatesWithinGender.length) {
  lines.push("### Duplicate ids (same gender)");
  lines.push(table(["Id", "Gender", "Occurrences (category)"], duplicatesWithinGender.map((d) => [code(d.id), d.gender, d.list.map((x) => x.categoryId).join(", ")])));
  lines.push("");
}
if (crossGender.length) {
  lines.push("### Ids shared by women and men");
  lines.push(table(["Id", "Where"], crossGender.map((d) => [code(d.id), d.list.map((x) => `${x.gender}/${x.categoryId}`).join(", ")])));
  lines.push("");
}
lines.push("## Field names");
lines.push("Every key used on service objects, with how many entries use it:");
lines.push("");
const allKeys = [...new Set([...keyCounts.women.keys(), ...keyCounts.men.keys()])].sort();
lines.push(table(["Field", "Women", "Men"], allKeys.map((k) => [code(k), keyCounts.women.get(k) ?? 0, keyCounts.men.get(k) ?? 0])));
lines.push("");
lines.push("### Same meaning, different names");
lines.push(table(["Variant A", "Uses", "Variant B", "Uses"], variantPairs.map(([a, b]) => [code(a), (keyCounts.women.get(a) ?? 0) + (keyCounts.men.get(a) ?? 0), code(b), (keyCounts.women.get(b) ?? 0) + (keyCounts.men.get(b) ?? 0)])));
lines.push("");
lines.push("### Shapes");
lines.push(table(["Field", "Shape", "Entries"], [
  ...[...overviewShapes].map(([shape, n]) => ["overview", code(shape), n]),
  ...[...faqShapes].map(([shape, n]) => ["faq / FAQs", code(shape), n]),
]));
lines.push("");
lines.push("### `gender` field");
lines.push(table(["Catalog: value", "Entries"], [...genderValues].map(([k, n]) => [code(k), n])));
lines.push("");
lines.push("## Filters");
lines.push(unknownFilters.size ? "`withFilter` values that are not in their category's filter list (these services never show under any filter chip):" : "All `withFilter` values exist in their category's filter list.");
lines.push("");
if (unknownFilters.size) lines.push(table(["Category: value", "Entries"], [...unknownFilters].sort().map(([k, n]) => [code(k), n])));
lines.push("");
lines.push("## Prices");
lines.push(priceIssues.length ? priceIssues.map((x) => `- ${x}`).join("\n") : "No price problems found.");
lines.push("");
if (tierIssues.length) {
  lines.push("### Tier problems");
  lines.push(tierIssues.map((x) => `- ${x}`).join("\n"));
  lines.push("");
}
lines.push("## Durations");
lines.push("Durations are free text today. Parse result (service durations and tier durations):");
lines.push("");
lines.push(table(["Result", "Count"], [...durationKinds].map(([k, n]) => [k, n])));
lines.push("");
if (unparsedDurations.size) {
  lines.push("Values that need a decision during migration:");
  lines.push("");
  lines.push(table(["Value", "Count"], [...unparsedDurations].sort().map(([k, n]) => [code(k), n])));
  lines.push("");
}
lines.push("## Images");
lines.push(table(["Image reference type", "Count"], [...imageClasses].sort((a, b) => b[1] - a[1]).map(([k, n]) => [k, n])));
lines.push("");
lines.push(`Services with no primary image (\`image\`, \`avatar\` or \`miniAvatar\`): ${noImageAtAll.length}.`);
lines.push("");
lines.push("## Language");
const hasDevanagari = entries.some((e) => /[\u0900-\u097F]/.test(JSON.stringify(e.pkg)));
lines.push(hasDevanagari ? "Some Devanagari text exists." : "No Devanagari (Hindi) text exists. Every Hindi field must be written during content work.");
lines.push("");
lines.push("## Migration rules (input to Phase 3)");
lines.push("1. Give every service a stable, unique `slug`. Merge exact duplicates; rename ids that collide between women and men (prefix by gender only where needed).");
lines.push("2. Normalise field names: `aftercare`, `faq` as `{question, answer}[]`, `recommendedFor`, `products`, `overview` as `{title, desc}[]`. Drop `bannerIMage`/`bannerImage`, `bookings`, `features` when empty.");
lines.push("3. Store durations as integer minutes per tier. Multi-session packages become tiers with `sessions` and `durationMin` per session.");
lines.push("4. Prices become integer paise. `oldPrice` becomes `compareAtPaise` only when it is greater than the price; recompute discounts instead of storing them.");
lines.push("5. Fix filter values against the category's filter list (for example the \"Shadadi\" typo); a service with no valid filter appears under the category's first filter.");
lines.push("6. Re-host bundled images on S3 in AVIF/WebP sizes; any missing, retired or developer-machine image becomes `null` and shows the neutral placeholder until the client supplies a photo.");
lines.push("7. Every text field becomes `{ en, hi }` with `hi` empty and flagged \"missing Hindi\" in the admin panel.");
lines.push("8. Map each category to the skills a professional needs, so matching can check `requiredSkills`.");
lines.push("");

const out = path.join(root, "docs", "catalog-audit.md");
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, `${lines.join("\n")}\n`, "utf8");
console.log(`Wrote ${path.relative(root, out)}: ${entries.length} entries, ${duplicatesWithinGender.length} duplicate ids, ${crossGender.length} cross-gender collisions, ${unknownFilters.size} unknown filter values.`);
