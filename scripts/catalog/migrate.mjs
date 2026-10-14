// Catalogue migration (Phase 3). Reads the legacy catalogue in src/store/data, applies the
// rules from docs/catalog-audit.md and writes:
//   apps/api/seed/catalog.json   categories + services in the new shape (images as sources)
//   docs/catalog-migration.md    what changed and what needs the client
// Read-only for the legacy data. Run: node scripts/catalog/migrate.mjs
// Then load it with: cd apps/api && npm run seed:catalog

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

const report = {
  merged: [],
  renamed: [],
  filterFixes: new Map(),
  durationDefaults: [],
  durationRanges: [],
  compareAtDropped: [],
  imagesRehosted: [],
  imagesStock: [],
  imagesDropped: new Map(),
  tierSuffixes: [],
  duplicatesMerged: [],
  duplicatesToDecide: [],
};
const bump = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);

// ---------- categories (rule 8: each needs a skill) ----------
const L = (en, hi = "") => ({ en, hi });
const slugify = (value) =>
  String(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const CATEGORY_MAP = {
  "women/salon_for_women": { slug: "salon-for-women", name: L("Salon for women", "महिलाओं के लिए सैलून"), skill: "salon_women", image: "src/asset/spa.jpg", description: L("Facials, waxing, threading, manicure and more at home.", "घर पर फ़ेशियल, वैक्स, थ्रेडिंग, मैनीक्योर और बहुत कुछ।") },
  "women/makeup_and_styling": { slug: "makeup-and-styling", name: L("Makeup & styling", "मेकअप और स्टाइलिंग"), skill: "makeup", image: "src/asset/makeup.jpg", description: L("Party, engagement and bridal makeup with hair styling.", "पार्टी, सगाई और दुल्हन का मेकअप, हेयर स्टाइलिंग के साथ।") },
  "women/hairstyling": { slug: "hair-styling", name: L("Hair cut & style", "हेयर कट और स्टाइल"), skill: "hair_women", image: "src/asset/hair.jpg", description: L("Haircuts, blow-dries, curls and hair care.", "हेयरकट, ब्लो-ड्राई, कर्ल्स और बालों की देखभाल।") },
  "women/spa_for_women": { slug: "spa-for-women", name: L("Spa for women", "महिलाओं के लिए स्पा"), skill: "spa_women", image: null /* src/asset/men/female-spa.png is AI-generated (plan B6) */, description: L("Relaxing and pain-relief massages, scrubs and rituals.", "आराम और दर्द से राहत वाली मसाज, स्क्रब और रिचुअल।") },
  "men/stress_relief": { slug: "men-stress-relief", name: L("Stress relief massage", "तनाव से राहत वाली मसाज"), skill: "massage_men", image: null, description: L("Relaxing massages for men.", "पुरुषों के लिए आरामदायक मसाज।") },
  "men/pain_relief": { slug: "men-pain-relief", name: L("Pain relief massage", "दर्द से राहत वाली मसाज"), skill: "massage_men", image: null, description: L("Deep-tissue and therapy massages for men.", "पुरुषों के लिए डीप-टिशू और थेरेपी मसाज।") },
  "men/skincare_scrubs": { slug: "men-skincare-scrubs", name: L("Skincare & scrubs", "स्किनकेयर और स्क्रब"), skill: "skincare_men", image: null, description: L("Scrubs and body polishing for men.", "पुरुषों के लिए स्क्रब और बॉडी पॉलिशिंग।") },
  "men/monthly_necessity": { slug: "men-grooming", name: L("Monthly grooming", "हर महीने की ग्रूमिंग"), skill: "grooming_men", image: "src/asset/men/young-man-getting-his-beard-styled-barber.jpg", description: L("Beard trims, body trimming and quick fixes.", "दाढ़ी ट्रिम, बॉडी ट्रिमिंग और जल्दी होने वाले काम।") },
  "men/face_grooming": { slug: "men-face-grooming", name: L("Face grooming", "चेहरे की ग्रूमिंग"), skill: "skincare_men", image: "src/asset/maleGrooming.jpg", description: L("Facials made for men's skin.", "पुरुषों की त्वचा के लिए फ़ेशियल।") },
};

/** Legacy filter label → [slug, English, Hindi]. Typos fixed (rule 5). */
const FILTERS = {
  "Shadadi Packages": ["shaadi-packages", "Shaadi packages", "शादी पैकेज"],
  "K-Rituals": ["k-rituals", "K-Rituals", "के-रिचुअल्स"],
  Facials: ["facials", "Facials", "फ़ेशियल"],
  Waxing: ["waxing", "Waxing", "वैक्सिंग"],
  "Manicure & Pedicure": ["manicure-and-pedicure", "Manicure & pedicure", "मैनीक्योर और पेडीक्योर"],
  Scrubs: ["scrubs", "Scrubs", "स्क्रब"],
  Threading: ["threading", "Threading", "थ्रेडिंग"],
  Bleach: ["bleach", "Bleach", "ब्लीच"],
  "korean Glow": ["korean-glow", "Korean glow", "कोरियन ग्लो"],
  "Hair Services": ["hair-services", "Hair services", "हेयर सर्विस"],
  "InstaLight Pack": ["instalight-pack", "InstaLight pack", "इंस्टालाइट पैक"],
  "Body Polishing": ["body-polishing", "Body polishing", "बॉडी पॉलिशिंग"],
  Cleanup: ["cleanup", "Cleanup", "क्लीनअप"],
  "Bleach and Detan": ["bleach-and-detan", "Bleach & de-tan", "ब्लीच और डी-टैन"],
  "Party Makeup": ["party-makeup", "Party makeup", "पार्टी मेकअप"],
  "Eye Makeup": ["eye-makeup", "Eye makeup", "आई मेकअप"],
  "Best Packages": ["best-packages", "Best packages", "बेस्ट पैकेज"],
  Wedding: ["wedding", "Wedding", "शादी"],
  "Hair Styling": ["hair-styling", "Hair styling", "हेयर स्टाइलिंग"],
  "Engagement Makeup": ["engagement-makeup", "Engagement makeup", "सगाई का मेकअप"],
  "Bridal Makeup": ["bridal-makeup", "Bridal makeup", "दुल्हन का मेकअप"],
  "Haircut Services": ["haircuts", "Haircuts", "हेयरकट"],
  "Creative Hair Services": ["creative-hair", "Creative hair", "क्रिएटिव हेयर"],
  "Mom & Daughter Packages": ["mom-and-daughter", "Mom & daughter packages", "माँ-बेटी पैकेज"],
  "Blow-Dry": ["blow-dry", "Blow-dry", "ब्लो-ड्राई"],
  "Temporary Hair Straightening": ["temporary-straightening", "Temporary straightening", "टेम्परेरी स्ट्रेटनिंग"],
  "Hair Curls and Wave": ["curls-and-waves", "Curls & waves", "कर्ल्स और वेव्स"],
  "Hair Care Services": ["hair-care", "Hair care", "बालों की देखभाल"],
  "Spa Bestseller": ["spa-bestsellers", "Bestsellers", "बेस्टसेलर"],
  "Stress Relief": ["stress-relief", "Stress relief", "तनाव से राहत"],
  "Pain Relief": ["pain-relief", "Pain relief", "दर्द से राहत"],
  "Body Ritual": ["body-rituals", "Body rituals", "बॉडी रिचुअल"],
  "Skin Care & Scrubs": ["skin-care-and-scrubs", "Skin care & scrubs", "स्किन केयर और स्क्रब"],
  "Post-Natal Massage": ["post-natal-massage", "Post-natal massage", "प्रसव के बाद मसाज"],
  "Add-Ons": ["add-ons", "Add-ons", "ऐड-ऑन"],
  "Top-Up": ["top-up", "Top-up", "टॉप-अप"],
};

/** Service filter values that aren't in their category's list (audit "Filters") → the filter they mean. */
const FILTER_ALIASES = {
  "Korean Glow": "korean Glow",
  "Korean Waxing": "Waxing",
  "Bikini Wax": "Waxing",
  "Premium Waxing": "Waxing",
  "Roll-On Wax": "Waxing",
  "Tin Wax": "Waxing",
  "HydraGlo Facials": "Facials",
  "Skin Brightening": "Facials",
  "Shade Packages": "Shadadi Packages",
  "Wedding Packages": "Wedding",
  "Hair Cut Services": "Haircut Services",
};

/** Filters copied into the wrong category by mistake (spa had two hair filters). */
const WRONG_CATEGORY_FILTERS = { "women/spa_for_women": ["Temporary Hair Straightening", "Hair Curls and Wave"] };

const categories = [];
const categoryByLegacy = new Map();
for (const [gender, data] of [
  ["women", woman],
  ["men", men],
]) {
  data.categories.forEach((legacy, order) => {
    const key = `${gender}/${legacy.id}`;
    const target = CATEGORY_MAP[key];
    if (!target) throw new Error(`No mapping for category ${key}`);
    const skip = new Set(WRONG_CATEGORY_FILTERS[key] ?? []);
    const filters = (legacy.filters ?? [])
      .filter((label) => label !== "All" && !skip.has(label))
      .map((label) => {
        const known = FILTERS[label];
        if (!known) throw new Error(`No mapping for filter "${label}" in ${key}`);
        return { slug: known[0], name: L(known[1], known[2]) };
      });
    const category = {
      slug: target.slug,
      gender,
      name: target.name,
      description: target.description,
      filters,
      skill: target.skill,
      image: target.image ? { source: target.image } : null,
      order,
      active: true,
    };
    categories.push(category);
    categoryByLegacy.set(key, { category, legacy });
  });
}

// ---------- helpers ----------
const texts = (value) => (Array.isArray(value) ? value : []).map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);

function parseDuration(text, context, quiet = false) {
  if (typeof text !== "string" || !text.trim()) return null;
  const t = text.toLowerCase().replace(/\s+/g, " ").trim();
  const multi = t.match(/(\d+)\s*[x×]\s*(\d+)\s*(min|mins|minutes)/);
  if (multi) return { durationMin: Number(multi[2]), sessions: Number(multi[1]) };
  const range = t.match(/^(\d+)\s*[-–]\s*(\d+)\s*(min|mins|minutes)/);
  if (range) {
    if (!quiet) report.durationRanges.push(`${context}: "${text}" → ${range[2]} min (upper bound)`);
    return { durationMin: Number(range[2]), sessions: 1 };
  }
  let minutes = 0;
  const hours = t.match(/(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)\b/);
  if (hours) minutes += Math.round(Number(hours[1]) * 60);
  const mins = t.match(/(\d+)\s*(m|min|mins|minute|minutes)\b/);
  if (mins) minutes += Number(mins[1]);
  return minutes > 0 ? { durationMin: minutes, sessions: 1 } : null;
}

const sessionsFromLabel = (label) => Number(/(\d+)\s*session/i.exec(label ?? "")?.[1] ?? 1);
const paise = (rupees) => Math.round(Number(rupees) * 100);

function compareAt(price, oldPrice, context) {
  if (!oldPrice) return null;
  if (paise(oldPrice) > paise(price)) return paise(oldPrice);
  report.compareAtDropped.push(`${context}: before-price ₹${oldPrice} is not above ₹${price}`);
  return null;
}

/** "Q: … A: …" strings become question/answer pairs; anything else is dropped. */
function faqs(pkg) {
  const list = pkg.faq ?? pkg.FAQs ?? [];
  return list
    .map((item) => {
      if (item && typeof item === "object" && item.question && item.answer) return { question: L(item.question.trim()), answer: L(item.answer.trim()) };
      const match = typeof item === "string" ? /^Q:\s*(.+?)\s*A:\s*(.+)$/s.exec(item) : null;
      return match ? { question: L(match[1].trim()), answer: L(match[2].trim()) } : null;
    })
    .filter(Boolean);
}

function overview(pkg) {
  const source = [pkg.overview, pkg.procedure, pkg.benefits].find((list) => Array.isArray(list) && list.length > 0) ?? [];
  return source
    .map((item) =>
      typeof item === "string" ? { title: L(item.trim()), desc: L("") } : item?.title ? { title: L(String(item.title).trim()), desc: L(String(item.desc ?? "").trim()) } : null,
    )
    .filter(Boolean);
}

/** The service's photo, if it can be used (rule 6). Returns { source, stock } or null with a reason. */
function photo(pkg) {
  const candidates = [pkg.image, pkg.avatar, pkg.miniAvatar, ...(pkg.avatars ?? []), pkg.bannerImage].filter((value) => typeof value === "string" && value.trim());
  if (candidates.length === 0) return { reason: "no image" };
  for (const value of candidates) {
    if (value.startsWith("asset:")) {
      const relative = path.relative(root, value.replace(/^asset:\//, "").replace(/^\//, "")).replace(/\\/g, "/");
      // AI-generated renders with a visible generator watermark (plan B6: no AI-looking art).
      if (relative.startsWith("src/asset/men/") && relative.endsWith(".png") && !relative.includes("female-spa")) return { reason: "AI-generated render (watermark)" };
      return { source: relative, stock: false };
    }
    if (/source\.unsplash\.com/.test(value)) continue;
    if (/^https:\/\/images\.(pexels|unsplash)\.com\//.test(value)) return { source: value, stock: true };
  }
  const first = candidates[0];
  if (/placehold\.co|via\.placeholder/.test(first)) return { reason: "placeholder image" };
  if (/source\.unsplash\.com/.test(first)) return { reason: "retired source.unsplash.com link" };
  if (/^\/Users\//.test(first) || /^[A-Za-z]:\\/.test(first)) return { reason: "path on a developer's computer" };
  if (first.startsWith("/")) return { reason: existsSync(path.join(root, "public", first)) ? "public file" : "missing file" };
  return { reason: "unusable image reference" };
}

function cleanTitle(title, context) {
  const cleaned = String(title)
    .replace(/\s*[–-]\s*Tier Packages$/i, "")
    .replace(/\s+-{1,2}\s+/g, " – ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned !== String(title).trim()) report.tierSuffixes.push(`${context}: "${title}" → "${cleaned}"`);
  return cleaned;
}

// ---------- services ----------
const byId = new Map(); // `${gender}:${id}` → { pkg, categoryKeys:Set }
const order = [];
for (const [key, { legacy }] of categoryByLegacy) {
  const gender = key.split("/")[0];
  for (const pkg of legacy.packages ?? []) {
    // Keyed by slug, so "henna-application" and "henna_application" merge too.
    const id = `${gender}:${slugify(pkg.id)}`;
    const existing = byId.get(id);
    if (existing) {
      existing.categoryKeys.add(key);
      // Keep the most complete copy of a duplicate (rule 1).
      if (Object.keys(pkg).length > Object.keys(existing.pkg).length) existing.pkg = pkg;
      existing.copies++;
      continue;
    }
    byId.set(id, { gender, pkg, categoryKeys: new Set([key]), copies: 1 });
    order.push(id);
  }
}

const usedSlugs = new Map(); // slug → gender
const crossGender = new Set(order.filter((id) => id.startsWith("men:") && byId.has(`women:${id.slice(4)}`)).map((id) => id.slice(4)));
const crossGenderIds = new Set([...crossGender]);

const imageReasons = new Map(); // slug → why it has no photo
const services = order.map((id, index) => {
  const { gender, pkg, categoryKeys, copies } = byId.get(id);
  const context = `${gender}/${pkg.id}`;
  if (copies > 1) report.merged.push(`${context}: ${copies} copies merged into one (${[...categoryKeys].map((key) => categoryByLegacy.get(key).category.slug).join(", ")})`);

  let slug = slugify(pkg.id);
  if (gender === "men" && crossGenderIds.has(slugify(pkg.id))) {
    report.renamed.push(`${context} → men-${slug} (same id existed for women)`);
    slug = `men-${slug}`;
  }
  if (usedSlugs.has(slug)) throw new Error(`Slug collision: ${slug}`);
  usedSlugs.set(slug, gender);

  const cats = [...categoryKeys].map((key) => categoryByLegacy.get(key).category);
  const allowedFilters = new Map();
  for (const key of categoryKeys) for (const label of categoryByLegacy.get(key).legacy.filters ?? []) allowedFilters.set(label, FILTERS[label]?.[0]);
  const filterSlugs = [];
  for (const raw of pkg.withFilter ?? []) {
    const label = allowedFilters.has(raw) ? raw : FILTER_ALIASES[raw];
    const slugForFilter = label ? FILTERS[label]?.[0] : undefined;
    if (!allowedFilters.has(raw)) bump(report.filterFixes, `"${raw}" → ${slugForFilter ?? "(dropped)"}`);
    if (slugForFilter && cats.some((category) => category.filters.some((filter) => filter.slug === slugForFilter)) && !filterSlugs.includes(slugForFilter)) {
      filterSlugs.push(slugForFilter);
    }
  }
  if (filterSlugs.length === 0 && cats[0].filters[0]) filterSlugs.push(cats[0].filters[0].slug);

  const baseDuration = parseDuration(pkg.duration, context, true);
  const tiers = (pkg.tiers?.length ? pkg.tiers : [{ id: "standard", label: "Standard", price: pkg.price, oldPrice: pkg.oldPrice, duration: pkg.duration }]).map((tier) => {
    const parsed = parseDuration(tier.duration, `${context}/${tier.id}`) ?? baseDuration;
    if (!parsed) report.durationDefaults.push(`${context}/${tier.id}: no duration, set to 30 min`);
    const label = tier.label === "Standard" ? L("Standard", "स्टैंडर्ड") : L(String(tier.label).trim());
    return {
      id: slugify(tier.id) || "standard",
      label,
      pricePaise: paise(tier.price ?? pkg.price ?? pkg.startsFrom),
      compareAtPaise: compareAt(tier.price ?? pkg.price, tier.oldPrice, `${context}/${tier.id}`),
      durationMin: parsed?.durationMin ?? 30,
      sessions: parsed?.sessions && parsed.sessions > 1 ? parsed.sessions : sessionsFromLabel(tier.label),
    };
  });

  const image = photo(pkg);
  if (image.source && image.stock) report.imagesStock.push(`${slug}: ${image.source}`);
  else if (image.source) report.imagesRehosted.push(`${slug}: ${image.source}`);
  else {
    bump(report.imagesDropped, image.reason);
    imageReasons.set(slug, image.reason);
  }

  return {
    slug,
    gender,
    categorySlugs: cats.map((category) => category.slug),
    filterSlugs,
    name: L(cleanTitle(pkg.title, context)),
    summary: L(String(pkg.subtitle ?? "").trim()),
    overview: overview(pkg),
    thingsToKnow: [...texts(pkg.things_to_know), ...texts(pkg.precautions)].map((text) => L(text)),
    aftercare: texts(pkg.after_care ?? pkg.aftercare).map((text) => L(text)),
    recommendedFor: texts(pkg.recommendedFor ?? pkg.recommended_for).map((text) => L(text)),
    products: texts(pkg.products_used ?? pkg.products_and_brand).map((text) => L(text)),
    faq: faqs(pkg),
    tiers,
    requiredSkills: [...new Set(cats.map((category) => category.skill))],
    images: image.source ? [{ source: image.source, stock: image.stock }] : [],
    active: true,
    order: index,
  };
});

// Five pedicure-only items carried the combo's name ("… Manicure & Pedicure") in the old data;
// their slug, lower price and summary all say pedicure.
for (const service of services) {
  if (/-pedicure$/.test(service.slug) && /manicure\s*&\s*pedicure/i.test(service.name.en)) {
    const fixed = service.name.en.replace(/\s*manicure\s*&\s*/i, " ").replace(/\s+/g, " ").trim();
    report.renamed.push(`${service.slug}: "${service.name.en}" → "${fixed}" (pedicure only, by slug, price and summary)`);
    service.name.en = fixed;
  }
}

// The same name twice in one list reads as a mistake (audit rule 1). Copies with identical
// prices and durations merge into the most detailed one; copies that differ in price are a
// business decision, so they stay and are listed for the client.
const nameKey = (service) =>
  `${service.gender}:${service.name.en.toLowerCase().replace(/eyebrows/g, "eyebrow").replace(/\blips\b/g, "lip").replace(/[^a-z0-9]/g, "")}`;
const tierKey = (service) => service.tiers.map((tier) => `${tier.pricePaise}/${tier.durationMin}/${tier.sessions}`).join(",");
const detail = (service) => service.overview.length + service.faq.length + service.thingsToKnow.length + service.aftercare.length + service.images.length;
const byName = new Map();
for (const service of services) byName.set(nameKey(service), [...(byName.get(nameKey(service)) ?? []), service]);
const dropped = new Set();
for (const group of byName.values()) {
  if (group.length < 2) continue;
  const byTiers = new Map();
  for (const service of group) byTiers.set(tierKey(service), [...(byTiers.get(tierKey(service)) ?? []), service]);
  for (const copies of byTiers.values()) {
    if (copies.length < 2) continue;
    const keep = [...copies].sort((a, b) => detail(b) - detail(a) || a.order - b.order)[0];
    for (const other of copies) {
      if (other === keep) continue;
      keep.categorySlugs = [...new Set([...keep.categorySlugs, ...other.categorySlugs])].slice(0, 3);
      keep.filterSlugs = [...new Set([...keep.filterSlugs, ...other.filterSlugs])].slice(0, 6);
      keep.requiredSkills = [...new Set([...keep.requiredSkills, ...other.requiredSkills])].slice(0, 3);
      keep.order = Math.min(keep.order, other.order);
      dropped.add(other);
      report.duplicatesMerged.push(`${other.slug} → ${keep.slug} ("${keep.name.en}", same price and duration)`);
    }
  }
  const remaining = group.filter((service) => !dropped.has(service));
  if (remaining.length > 1) {
    const rupees = (service) => service.tiers.map((tier) => `₹${tier.pricePaise / 100} · ${tier.durationMin} min`).join(" / ");
    report.duplicatesToDecide.push(`"${remaining[0].name.en}": ${remaining.map((service) => `\`${service.slug}\` ${rupees(service)}`).join(", ")}`);
  }
}
for (let index = services.length - 1; index >= 0; index--) if (dropped.has(services[index])) services.splice(index, 1);
for (const service of dropped) {
  report.imagesStock = report.imagesStock.filter((line) => !line.startsWith(`${service.slug}:`));
  const reason = imageReasons.get(service.slug);
  if (reason) report.imagesDropped.set(reason, report.imagesDropped.get(reason) - 1);
}

// A stock photo repeated across many services reads as filler, not as that service:
// keep it only where it is used at most twice (plan B6: consistent, honest imagery).
const MAX_REUSE = 2;
const uses = new Map();
for (const service of services) for (const image of service.images) uses.set(image.source, (uses.get(image.source) ?? 0) + 1);
for (const service of services) {
  const kept = service.images.filter((image) => !image.stock || uses.get(image.source) <= MAX_REUSE);
  if (kept.length < service.images.length) {
    report.imagesStock = report.imagesStock.filter((line) => !line.startsWith(`${service.slug}:`));
    bump(report.imagesDropped, `stock photo repeated on more than ${MAX_REUSE} services`);
  }
  service.images = kept;
}

// ---------- write ----------
const outDir = path.join(root, "apps/api/seed");
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "catalog.json"), JSON.stringify({ generatedAt: new Date().toISOString(), source: "src/store/data", categories, services }, null, 2));

const table = (headers, rows) => [`| ${headers.join(" | ")} |`, `|${headers.map(() => "---").join("|")}|`, ...rows.map((row) => `| ${row.join(" | ")} |`)].join("\n");
const list = (items) => (items.length ? items.map((item) => `- ${item}`).join("\n") : "- None");
const women = services.filter((service) => service.gender === "women").length;

const md = `# Catalogue migration

Generated ${new Date().toISOString().slice(0, 10)} by \`node scripts/catalog/migrate.mjs\` from \`src/store/data\`, following the rules in [catalog-audit.md](catalog-audit.md). Output: \`apps/api/seed/catalog.json\`, loaded with \`npm run seed:catalog\` in \`apps/api\`.

## Result
${table(
  ["", "Women", "Men", "Total"],
  [
    ["Categories", String(categories.filter((c) => c.gender === "women").length), String(categories.filter((c) => c.gender === "men").length), String(categories.length)],
    ["Services", String(women), String(services.length - women), String(services.length)],
    ["Price tiers", "", "", String(services.reduce((sum, s) => sum + s.tiers.length, 0))],
  ],
)}

## Identity (rule 1)
${list(report.merged)}

Renamed because the same id existed for women and men:
${list(report.renamed)}

Titles cleaned:
${list(report.tierSuffixes)}

Identical copies under different ids (same name, price and duration) merged into the most detailed one:
${list(report.duplicatesMerged)}

**Client: please decide.** The same name appears more than once with different prices. Both stay bookable until you deactivate one in the admin (Services):
${list(report.duplicatesToDecide)}

## Filters (rule 5)
${table(
  ["Legacy value", "Services"],
  [...report.filterFixes].map(([fix, n]) => [fix, String(n)]),
)}

The "Shadadi" typo is now "Shaadi packages". Spa no longer lists two hair filters that were copied into it by mistake. A service with no valid filter appears under its category's first filter.

## Prices (rule 4)
Before-prices that weren't higher than the price were dropped (no fake discount is shown):
${list(report.compareAtDropped)}

## Durations (rule 3)
Ranges use the upper bound, so a professional is never booked too tightly:
${list(report.durationRanges)}

No duration in the old data, set to 30 minutes. **Client: please confirm.**
${list(report.durationDefaults)}

## Images (rule 6)
- **Bundled photos re-hosted** as AVIF/WebP: ${report.imagesRehosted.length}
- **Stock photos re-hosted** (Pexels/Unsplash): ${report.imagesStock.length}. Free licences, but they don't match each other. **Replace them with your own photography.**
- **No usable photo** (the card shows the neutral tile with the name):

${table(
  ["Reason", "Services"],
  [...report.imagesDropped].map(([reason, n]) => [reason, String(n)]),
)}

Category photos:
- From real photos: \`hair.jpg\`, \`makeup.jpg\`, \`spa.jpg\`, \`maleGrooming.jpg\` and the barber photo.
- \`female-spa.png\` is not used: it is AI-generated, so "Spa for women" shows the neutral tile until a real photo arrives.
- Not used: the men's massage renders (\`src/asset/men/*.png\`) are AI-generated and carry the generator's watermark. \`image.png\` and \`download.png\` are vector illustrations. Plan B6 rules out both.
- Three men's categories show the neutral tile until real photos arrive.
- The home page hero is \`mehndi.jpg\` (a real photograph), built by \`node scripts/images/hero.mjs\`.

## Hindi (rule 7)
Category and filter names have Hindi. Service text is English with Hindi empty, flagged "Missing Hindi" in the admin. A first-draft translation of service names and summaries is loaded from \`apps/api/seed/hindi-drafts.json\` when present, for a native speaker to review (assumption A14).

## Skills (rule 8)
${table(
  ["Category", "Skill a professional needs"],
  categories.map((category) => [category.slug, category.skill]),
)}

## Not migrated
Legacy ratings and booking counts aren't carried over: they weren't real reviews. Ratings return from real reviews (Phase 7).
`;
writeFileSync(path.join(root, "docs/catalog-migration.md"), md);

console.log(`Wrote ${categories.length} categories and ${services.length} services to apps/api/seed/catalog.json`);
console.log(`Images: ${report.imagesRehosted.length} bundled, ${report.imagesStock.length} stock, ${[...report.imagesDropped.values()].reduce((a, b) => a + b, 0)} without a usable photo`);
console.log("Report: docs/catalog-migration.md");
