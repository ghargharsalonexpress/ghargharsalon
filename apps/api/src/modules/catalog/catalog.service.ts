import { createHash } from "node:crypto";
import {
  type AdminServiceRow,
  type CartPriceInput,
  cartLineKey,
  type CartPriceResponse,
  type CatalogResponse,
  type CategoryDto,
  type CategoryInput,
  computeTotals,
  hasMissingHindi,
  type PricedLine,
  type ServiceDto,
  type ServiceInput,
  type ServiceSummaryDto,
  type Settings,
  V,
} from "@brand/shared";

type CartLineInput = CartPriceInput["lines"][number];
import { AppError } from "../../errors";
import { isDuplicateKeyError } from "../users/user.model";
import { type auditActor, recordAudit } from "../audit/audit.model";
import { Category, type CategoryFields, Service, type ServiceFields } from "./catalog.models";

type Actor = ReturnType<typeof auditActor>;
type Lean<T> = T & { _id: unknown };

const SERVICE_FIELDS = [
  "slug",
  "gender",
  "categorySlugs",
  "filterSlugs",
  "name",
  "summary",
  "overview",
  "thingsToKnow",
  "aftercare",
  "recommendedFor",
  "products",
  "faq",
  "tiers",
  "requiredSkills",
  "images",
  "active",
  "order",
] as const satisfies ReadonlyArray<keyof ServiceInput>;

export function toServiceInput(doc: Lean<ServiceFields>): ServiceInput {
  return Object.fromEntries(SERVICE_FIELDS.map((field) => [field, doc[field]])) as ServiceInput;
}

export function toServiceDto(doc: Lean<ServiceFields>): ServiceDto {
  return { ...toServiceInput(doc), id: String(doc._id), version: doc.version, updatedAt: doc.updatedAt.toISOString() };
}

export function toSummary(doc: Pick<ServiceFields, "slug" | "gender" | "categorySlugs" | "filterSlugs" | "name" | "summary" | "tiers" | "images">): ServiceSummaryDto {
  const cheapest = [...doc.tiers].sort((a, b) => a.pricePaise - b.pricePaise)[0];
  if (!cheapest) throw new AppError("INTERNAL", { detail: `service ${doc.slug} has no tiers` });
  return {
    slug: doc.slug,
    gender: doc.gender,
    categorySlugs: doc.categorySlugs,
    filterSlugs: doc.filterSlugs,
    name: doc.name,
    summary: doc.summary,
    fromPricePaise: cheapest.pricePaise,
    compareAtPaise: cheapest.compareAtPaise,
    durationMin: cheapest.durationMin,
    tierCount: doc.tiers.length,
    tiers: doc.tiers.map((tier) => ({ id: tier.id, label: tier.label, pricePaise: tier.pricePaise, compareAtPaise: tier.compareAtPaise ?? null, durationMin: tier.durationMin, sessions: tier.sessions })),
    image: doc.images[0] ?? null,
  };
}

const toCategoryInput = (doc: Lean<CategoryFields>): CategoryInput => ({
  slug: doc.slug,
  gender: doc.gender,
  name: doc.name,
  description: doc.description,
  filters: doc.filters,
  skill: doc.skill,
  image: doc.image ?? null,
  order: doc.order,
  active: doc.active,
});

/** Changes whenever any category or service changes; used as the public ETag. */
async function catalogVersion(): Promise<string> {
  const [service, category, services, categories] = await Promise.all([
    Service.findOne({}, { updatedAt: 1 }).sort({ updatedAt: -1 }).lean(),
    Category.findOne({}, { updatedAt: 1 }).sort({ updatedAt: -1 }).lean(),
    Service.estimatedDocumentCount(),
    Category.estimatedDocumentCount(),
  ]);
  const raw = `${services}:${categories}:${service?.updatedAt.getTime() ?? 0}:${category?.updatedAt.getTime() ?? 0}`;
  return createHash("sha1").update(raw).digest("base64url").slice(0, 16);
}

let cached: CatalogResponse | null = null;

/** The whole public catalogue (active categories and services). ~200 services fit easily in one cached response. */
export async function publicCatalog(): Promise<CatalogResponse> {
  const version = await catalogVersion();
  if (cached?.version === version) return cached;

  const [categories, services] = await Promise.all([
    Category.find({ active: true }).sort({ gender: -1, order: 1 }).lean(),
    Service.find({ active: true }).sort({ order: 1, "name.en": 1 }).lean(),
  ]);
  const counts = new Map<string, number>();
  for (const service of services) for (const slug of service.categorySlugs) counts.set(slug, (counts.get(slug) ?? 0) + 1);

  cached = {
    version,
    categories: categories.map((category): CategoryDto => ({ ...toCategoryInput(category), serviceCount: counts.get(category.slug) ?? 0 })),
    services: services.map(toSummary),
  };
  return cached;
}

export async function publicService(slug: string): Promise<ServiceDto> {
  const doc = await Service.findOne({ slug, active: true }).lean();
  if (!doc) throw new AppError("NOT_FOUND");
  return toServiceDto(doc);
}

/** Categories must exist and match the gender; filters must belong to those categories. */
async function checkReferences(input: ServiceInput): Promise<void> {
  const categories = await Category.find({ slug: { $in: input.categorySlugs } }).lean();
  const fields: Record<string, string> = {};
  input.categorySlugs.forEach((slug, index) => {
    const category = categories.find((candidate) => candidate.slug === slug);
    if (!category || category.gender !== input.gender) fields[`categorySlugs.${index}`] = V.unknownCategory;
  });
  const allowed = new Set(categories.flatMap((category) => category.filters.map((filter) => filter.slug)));
  input.filterSlugs.forEach((slug, index) => {
    if (!allowed.has(slug)) fields[`filterSlugs.${index}`] = V.unknownFilter;
  });
  if (Object.keys(fields).length > 0) throw new AppError("VALIDATION_FAILED", { fields });
}

export interface AdminServiceFilters {
  gender?: string;
  category?: string;
  active?: boolean;
  missingHindi?: boolean;
  q?: string;
}

export async function adminServices(filters: AdminServiceFilters): Promise<AdminServiceRow[]> {
  const query: Record<string, unknown> = {};
  if (filters.gender) query.gender = filters.gender;
  if (filters.category) query.categorySlugs = filters.category;
  if (filters.active !== undefined) query.active = filters.active;
  if (filters.q) {
    const pattern = new RegExp(filters.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [{ "name.en": pattern }, { "name.hi": pattern }, { slug: pattern }];
  }
  const docs = await Service.find(query).sort({ updatedAt: -1 }).lean();
  return docs
    .map((doc) => ({
      ...toSummary(doc),
      id: String(doc._id),
      active: doc.active,
      missingHindi: hasMissingHindi(toServiceInput(doc)),
      version: doc.version,
      updatedAt: doc.updatedAt.toISOString(),
    }))
    .filter((row) => filters.missingHindi === undefined || row.missingHindi === filters.missingHindi);
}

export async function adminService(id: string): Promise<ServiceDto> {
  const doc = await Service.findById(id).lean();
  if (!doc) throw new AppError("NOT_FOUND");
  return toServiceDto(doc);
}

export async function createService(input: ServiceInput, actor: Actor): Promise<ServiceDto> {
  await checkReferences(input);
  try {
    const doc = await Service.create({ ...input, version: 1 });
    await recordAudit({ action: "service.create", entity: { type: "service", id: doc.id as string }, after: input }, actor);
    return toServiceDto(doc.toObject());
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new AppError("VALIDATION_FAILED", { fields: { slug: V.slugTaken } });
    throw error;
  }
}

/** Saves only if nobody else saved in between (plan W13). Price changes are audited. */
export async function updateService(id: string, version: number, input: ServiceInput, actor: Actor): Promise<ServiceDto> {
  await checkReferences(input);
  const before = await Service.findById(id).lean();
  if (!before) throw new AppError("NOT_FOUND");
  try {
    const doc = await Service.findOneAndUpdate({ _id: id, version }, { $set: input, $inc: { version: 1 } }, { returnDocument: "after", runValidators: true }).lean();
    if (!doc) throw new AppError("VERSION_CONFLICT", { detail: `service ${id} expected v${version}, now v${before.version}` });
    await recordAudit({ action: "service.update", entity: { type: "service", id }, before: toServiceInput(before), after: input }, actor);
    return toServiceDto(doc);
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new AppError("VALIDATION_FAILED", { fields: { slug: V.slugTaken } });
    throw error;
  }
}

export async function adminCategories(): Promise<CategoryDto[]> {
  const [categories, services] = await Promise.all([Category.find().sort({ gender: -1, order: 1 }).lean(), Service.find({}, { categorySlugs: 1 }).lean()]);
  const counts = new Map<string, number>();
  for (const service of services) for (const slug of service.categorySlugs) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  return categories.map((category) => ({ ...toCategoryInput(category), serviceCount: counts.get(category.slug) ?? 0 }));
}

export async function saveCategory(slug: string | null, input: CategoryInput, actor: Actor): Promise<CategoryDto> {
  try {
    const before = slug ? await Category.findOne({ slug }).lean() : null;
    if (slug && !before) throw new AppError("NOT_FOUND");
    const doc = slug
      ? await Category.findOneAndUpdate({ slug }, { $set: input }, { returnDocument: "after", runValidators: true }).lean()
      : (await Category.create(input)).toObject();
    if (!doc) throw new AppError("NOT_FOUND");
    if (slug && slug !== input.slug) await Service.updateMany({ categorySlugs: slug }, { $set: { "categorySlugs.$": input.slug } });
    await recordAudit({ action: slug ? "category.update" : "category.create", entity: { type: "category", id: input.slug }, before: before ? toCategoryInput(before) : null, after: input }, actor);
    const serviceCount = await Service.countDocuments({ categorySlugs: input.slug });
    return { ...toCategoryInput(doc), serviceCount };
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new AppError("VALIDATION_FAILED", { fields: { slug: V.slugTaken } });
    throw error;
  }
}

/** Saves a new order (keyboard up/down or drag in the admin, plan Phase 3). */
export async function reorderCategories(slugs: string[], actor: Actor): Promise<void> {
  await Category.bulkWrite(slugs.map((slug, order) => ({ updateOne: { filter: { slug }, update: { $set: { order } } } })));
  await recordAudit({ action: "category.reorder", entity: { type: "category", id: "*" }, after: slugs }, actor);
}

/**
 * The server prices every cart from the database (plan C9); the browser's numbers are
 * estimates. Each line says why it changed: unavailable, price changed, quantity capped.
 */
export async function priceCart(lines: ReadonlyArray<CartLineInput>, settings: Settings): Promise<CartPriceResponse> {
  const services = await Service.find({ slug: { $in: lines.map((line) => line.serviceSlug) } }).lean();
  const maxQuantity = settings.pricing.maxQuantityPerLine;

  const priced: PricedLine[] = lines.map((line) => {
    const service = services.find((candidate) => candidate.slug === line.serviceSlug);
    const tier = service?.tiers.find((candidate) => candidate.id === line.tierId);
    const key = cartLineKey(line.serviceSlug, line.tierId);
    if (!service || !service.active || !tier) {
      return {
        key,
        serviceSlug: line.serviceSlug,
        tierId: line.tierId,
        name: service?.name ?? { en: line.serviceSlug, hi: "" },
        tierLabel: tier?.label ?? { en: "", hi: "" },
        tierCount: service?.tiers.length ?? 0,
        unitPricePaise: 0,
        quantity: line.quantity,
        linePaise: 0,
        durationMin: 0,
        status: "unavailable",
      };
    }
    const quantity = Math.min(line.quantity, maxQuantity);
    const status = quantity < line.quantity ? "quantity_capped" : line.seenUnitPricePaise !== undefined && line.seenUnitPricePaise !== tier.pricePaise ? "price_changed" : "ok";
    return {
      key,
      serviceSlug: service.slug,
      tierId: tier.id,
      name: service.name,
      tierLabel: tier.label,
      tierCount: service.tiers.length,
      unitPricePaise: tier.pricePaise,
      quantity,
      linePaise: tier.pricePaise * quantity,
      durationMin: tier.durationMin * quantity,
      status,
    };
  });

  const pricing = { platformFeePaise: settings.pricing.platformFeePaise, gstRateBps: settings.pricing.gstRateBps, pricesIncludeGst: settings.pricing.pricesIncludeGst };
  const totals = computeTotals(
    priced.filter((line) => line.status !== "unavailable"),
    pricing,
  );
  return { ...totals, lines: priced, gstRateBps: pricing.gstRateBps, pricesIncludeGst: pricing.pricesIncludeGst, maxQuantityPerLine: maxQuantity };
}
