import { createHash } from "node:crypto";
import {
  type AdminPageDto,
  type AreaRequestDto,
  type AreaRequestInput,
  type CreatePageInput,
  DEFAULT_PAGES,
  DEFAULT_SITE_CONFIG,
  defaultPage,
  type GeoPoint,
  type LocateResponse,
  type Localized,
  type PageContent,
  type PageStatus,
  type PageSummaryDto,
  type PageVersionDto,
  type PublicPageDto,
  type PublicReviewDto,
  type PublicSiteDto,
  type SavePageInput,
  type SiteConfig,
  type SiteConfigResponse,
  type SiteVersionDto,
  V,
} from "@brand/shared";
import { Types } from "mongoose";
import { AppError } from "../../errors";
import { type auditActor, recordAudit } from "../audit/audit.model";
import { pointInRing } from "../availability/geo";
import { Booking } from "../bookings/booking.model";
import { Service } from "../catalog/catalog.models";
import { getSettings } from "../settings/settings.service";
import { isDuplicateKeyError, User } from "../users/user.model";
import { AreaRequest, Page, type PageFields, PageVersion, SiteHistory, SiteModel } from "./site.models";

type Actor = ReturnType<typeof auditActor>;
const SITE_ID = "site";
const KEEP_VERSIONS = 20;

export const etagOf = (value: unknown): string => `"${createHash("sha1").update(JSON.stringify(value)).digest("base64url").slice(0, 20)}"`;

/** Fills fields added after the site was first saved with their defaults (arrays are taken whole). */
function withDefaults<T>(defaults: T, stored: unknown): T {
  if (Array.isArray(defaults) || typeof defaults !== "object" || defaults === null) return (stored === undefined ? defaults : stored) as T;
  const source = (typeof stored === "object" && stored !== null ? stored : {}) as Record<string, unknown>;
  return Object.fromEntries(Object.entries(defaults as Record<string, unknown>).map(([key, value]) => [key, withDefaults(value, source[key])])) as T;
}

async function names(ids: Array<Types.ObjectId | null>): Promise<Map<string, string>> {
  const wanted = [...new Set(ids.filter((id): id is Types.ObjectId => id !== null).map(String))];
  if (wanted.length === 0) return new Map();
  const users = await User.find({ _id: { $in: wanted } }, { name: 1 }).lean();
  return new Map(users.map((user) => [String(user._id), user.name]));
}

// ---------------------------------------------------------------------------------------
// Site configuration

async function siteDoc() {
  const doc = await SiteModel.findOneAndUpdate(
    { _id: SITE_ID },
    { $setOnInsert: { version: 1, values: DEFAULT_SITE_CONFIG, seededPages: [], updatedBy: null } },
    { upsert: true, returnDocument: "after" },
  ).lean();
  if (!doc) throw new AppError("INTERNAL", { detail: "site upsert returned nothing" });
  return doc;
}

const toSiteResponse = (doc: { version: number; values: SiteConfig; updatedAt: Date }): SiteConfigResponse => ({
  version: doc.version,
  site: withDefaults(DEFAULT_SITE_CONFIG, doc.values),
  updatedAt: doc.updatedAt.toISOString(),
});

export async function getSite(): Promise<SiteConfigResponse> {
  return toSiteResponse(await siteDoc());
}

/** Optimistic concurrency like the settings: two admins never silently overwrite each other. */
export async function updateSite(expectedVersion: number, values: SiteConfig, actor: Actor): Promise<SiteConfigResponse> {
  const before = await getSite();
  const doc = await SiteModel.findOneAndUpdate(
    { _id: SITE_ID, version: expectedVersion },
    { $set: { values, updatedBy: actor.actorId }, $inc: { version: 1 } },
    { returnDocument: "after" },
  ).lean();
  if (!doc) throw new AppError("VERSION_CONFLICT", { detail: `site expected v${expectedVersion}, now v${before.version}` });
  await SiteHistory.create({ version: doc.version, values, changedBy: actor.actorId, changedAt: new Date() });
  await SiteHistory.deleteMany({ version: { $lte: doc.version - 50 } });
  await recordAudit({ action: "site.update", entity: { type: "site", id: SITE_ID }, before: before.site, after: values }, actor);
  return toSiteResponse(doc);
}

export async function siteVersions(): Promise<SiteVersionDto[]> {
  const rows = await SiteHistory.find({}, { version: 1, changedAt: 1, changedBy: 1 }).sort({ version: -1 }).limit(30).lean();
  const who = await names(rows.map((row) => row.changedBy));
  return rows.map((row) => ({ version: row.version, changedAt: row.changedAt.toISOString(), changedBy: row.changedBy ? (who.get(String(row.changedBy)) ?? null) : null }));
}

/** Saves an earlier version again as the newest one. */
export async function restoreSite(version: number, expectedVersion: number, actor: Actor): Promise<SiteConfigResponse> {
  const old = await SiteHistory.findOne({ version }).lean();
  if (!old) throw new AppError("NOT_FOUND");
  return updateSite(expectedVersion, withDefaults(DEFAULT_SITE_CONFIG, old.values), actor);
}

/** GET /v1/site. */
export async function publicSite(): Promise<PublicSiteDto> {
  const [{ version, site }, { settings }] = await Promise.all([getSite(), getSettings()]);
  return { version, site, areas: settings.operations.activeAreas.map((area) => area.name) };
}

// ---------------------------------------------------------------------------------------
// Pages

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function statusOf(doc: Pick<PageFields, "content" | "published">): PageStatus {
  if (!doc.published) return "draft";
  return same(doc.content, doc.published) ? "published" : "changed";
}

type LeanPage = PageFields & { _id: Types.ObjectId };

const toSummary = (doc: LeanPage): PageSummaryDto => ({
  id: String(doc._id),
  path: doc.path,
  title: doc.content.title,
  locked: doc.locked,
  hasDefault: Boolean(defaultPage(doc.path)),
  status: statusOf(doc),
  version: doc.version,
  updatedAt: doc.updatedAt.toISOString(),
  publishedAt: doc.publishedAt?.toISOString() ?? null,
});

const toAdminPage = (doc: LeanPage): AdminPageDto => ({ ...toSummary(doc), content: doc.content, published: doc.published });

/** Creates the pages the site ships with, once each (a default page that was deleted stays deleted). */
export async function ensureDefaultPages(): Promise<void> {
  const site = await siteDoc();
  const missing = DEFAULT_PAGES.filter((page) => !site.seededPages.includes(page.path));
  if (missing.length === 0) return;
  const now = new Date();
  for (const page of missing) {
    await Page.updateOne(
      { path: page.path },
      { $setOnInsert: { path: page.path, locked: page.locked, content: page.content, published: page.content, publishedAt: now, publishedBy: null, publishCount: 0, version: 1, updatedBy: null } },
      { upsert: true },
    );
  }
  await SiteModel.updateOne({ _id: SITE_ID }, { $addToSet: { seededPages: { $each: missing.map((page) => page.path) } } });
}

export async function listPages(): Promise<PageSummaryDto[]> {
  await ensureDefaultPages();
  const docs = await Page.find().sort({ locked: -1, path: 1 }).lean<LeanPage[]>();
  return docs.map(toSummary);
}

function objectId(id: string): Types.ObjectId {
  if (!/^[a-f0-9]{24}$/.test(id)) throw new AppError("NOT_FOUND");
  return new Types.ObjectId(id);
}

async function findPage(id: string): Promise<LeanPage> {
  const doc = await Page.findById(objectId(id)).lean<LeanPage>();
  if (!doc) throw new AppError("NOT_FOUND");
  return doc;
}

export async function adminPage(id: string): Promise<AdminPageDto> {
  return toAdminPage(await findPage(id));
}

const pathTaken = () => new AppError("VALIDATION_FAILED", { fields: { path: V.slugTaken } });

/** A new page starts with a header (or a copy of another page's sections) and is not public until published. */
export async function createPage(input: CreatePageInput, actor: Actor): Promise<AdminPageDto> {
  let sections: PageContent["sections"] = [
    {
      id: "pagehead",
      visible: true,
      anchor: "",
      tone: "soft",
      type: "pageHeader",
      eyebrow: { en: "", hi: "" },
      title: input.title,
      subtitle: { en: "", hi: "" },
      image: null,
      primary: { label: { en: "", hi: "" }, href: "" },
    },
  ];
  if (input.copyFrom) sections = (await findPage(input.copyFrom)).content.sections;
  const content: PageContent = { title: input.title, seo: { title: { en: "", hi: "" }, description: { en: "", hi: "" }, image: null, noindex: false }, sections };
  try {
    const doc = await Page.create({ path: input.path, locked: false, content, published: null, publishedAt: null, publishedBy: null, publishCount: 0, version: 1, updatedBy: actor.actorId });
    await recordAudit({ action: "page.create", entity: { type: "page", id: String(doc._id) }, after: { path: input.path, title: input.title } }, actor);
    return adminPage(String(doc._id));
  } catch (error) {
    if (isDuplicateKeyError(error)) throw pathTaken();
    throw error;
  }
}

export async function savePage(id: string, input: SavePageInput, actor: Actor): Promise<AdminPageDto> {
  const before = await findPage(id);
  if (before.locked && input.path !== before.path) throw new AppError("VALIDATION_FAILED", { fields: { path: V.invalid } });
  try {
    const doc = await Page.findOneAndUpdate(
      { _id: before._id, version: input.version },
      { $set: { path: input.path, content: input.content, updatedBy: actor.actorId }, $inc: { version: 1 } },
      { returnDocument: "after" },
    ).lean<LeanPage>();
    if (!doc) throw new AppError("VERSION_CONFLICT", { detail: `page ${id} expected v${input.version}, now v${before.version}` });
    await recordAudit(
      { action: "page.save", entity: { type: "page", id }, before: { path: before.path, version: before.version }, after: { path: doc.path, version: doc.version, sections: doc.content.sections.length } },
      actor,
    );
    return toAdminPage(doc);
  } catch (error) {
    if (isDuplicateKeyError(error)) throw pathTaken();
    throw error;
  }
}

/** Makes `content` the public page and keeps a copy for restore. */
async function publishContent(doc: LeanPage, content: PageContent, actor: Actor, action: "page.publish" | "page.rollback"): Promise<AdminPageDto> {
  const now = new Date();
  const updated = await Page.findOneAndUpdate(
    { _id: doc._id, publishCount: doc.publishCount },
    { $set: { content, published: content, publishedAt: now, publishedBy: actor.actorId, updatedBy: actor.actorId }, $inc: { publishCount: 1, version: 1 } },
    { returnDocument: "after" },
  ).lean<LeanPage>();
  // Someone else published in the same moment: their copy stands, ask to reload.
  if (!updated) throw new AppError("VERSION_CONFLICT", { detail: `page ${String(doc._id)} published concurrently` });
  await PageVersion.create({ pageId: doc._id, number: updated.publishCount, content, publishedAt: now, publishedBy: actor.actorId });
  await PageVersion.deleteMany({ pageId: doc._id, number: { $lte: updated.publishCount - KEEP_VERSIONS } });
  await recordAudit({ action, entity: { type: "page", id: String(doc._id) }, after: { path: updated.path, number: updated.publishCount } }, actor);
  return toAdminPage(updated);
}

export async function publishPage(id: string, expectedVersion: number, actor: Actor): Promise<AdminPageDto> {
  const doc = await findPage(id);
  // Publishing what the admin is looking at, not a newer draft someone else saved since.
  if (doc.version !== expectedVersion) throw new AppError("VERSION_CONFLICT", { detail: `page ${id} expected v${expectedVersion}, now v${doc.version}` });
  return publishContent(doc, doc.content, actor, "page.publish");
}

export async function pageVersions(id: string): Promise<PageVersionDto[]> {
  const doc = await findPage(id);
  const rows = await PageVersion.find({ pageId: doc._id }, { number: 1, "content.title": 1, publishedAt: 1, publishedBy: 1 }).sort({ number: -1 }).lean();
  const who = await names(rows.map((row) => row.publishedBy));
  return rows.map((row) => ({
    number: row.number,
    title: row.content.title,
    publishedAt: row.publishedAt.toISOString(),
    publishedBy: row.publishedBy ? (who.get(String(row.publishedBy)) ?? null) : null,
  }));
}

/** Puts an earlier published copy back live (and in the editor). */
export async function restorePageVersion(id: string, number: number, actor: Actor): Promise<AdminPageDto> {
  const doc = await findPage(id);
  const version = await PageVersion.findOne({ pageId: doc._id, number }).lean();
  if (!version) throw new AppError("NOT_FOUND");
  return publishContent(doc, version.content, actor, "page.rollback");
}

/** The shipped content back into the draft; it goes live when published. */
export async function resetPage(id: string, expectedVersion: number, actor: Actor): Promise<AdminPageDto> {
  const doc = await findPage(id);
  const original = defaultPage(doc.path);
  if (!original) throw new AppError("NOT_FOUND");
  return savePage(id, { version: expectedVersion, path: doc.path, content: original.content }, actor);
}

export async function deletePage(id: string, actor: Actor): Promise<void> {
  const doc = await findPage(id);
  if (doc.locked) throw new AppError("FORBIDDEN", { detail: `page ${doc.path} is locked` });
  await Page.deleteOne({ _id: doc._id });
  await PageVersion.deleteMany({ pageId: doc._id });
  await recordAudit({ action: "page.delete", entity: { type: "page", id }, before: { path: doc.path, title: doc.content.title } }, actor);
}

/** The published page at a path; `preview` (admins only) returns the draft instead. */
export async function publicPage(path: string, { preview = false }: { preview?: boolean } = {}): Promise<PublicPageDto> {
  const doc = await Page.findOne({ path }).lean<LeanPage>();
  if (doc && preview) return { path, title: doc.content.title, seo: doc.content.seo, sections: doc.content.sections, updatedAt: doc.updatedAt.toISOString(), draft: true };
  if (doc?.published) return { path, title: doc.published.title, seo: doc.published.seo, sections: doc.published.sections, updatedAt: (doc.publishedAt ?? doc.updatedAt).toISOString() };
  if (!doc) {
    // Not created yet (a fresh database): the shipped page, unless an admin deleted it.
    const original = defaultPage(path);
    const site = original ? await siteDoc() : null;
    if (original && site && !site.seededPages.includes(path)) {
      return { path, title: original.content.title, seo: original.content.seo, sections: original.content.sections, updatedAt: site.updatedAt.toISOString() };
    }
  }
  throw new AppError("NOT_FOUND");
}

/** Published pages for the sitemap (search engines skip noindex pages). */
export async function sitemapPages(): Promise<Array<{ path: string; updatedAt: Date }>> {
  await ensureDefaultPages();
  const docs = await Page.find({ published: { $ne: null }, "published.seo.noindex": { $ne: true } }, { path: 1, publishedAt: 1, updatedAt: 1 }).lean();
  return docs.map((doc) => ({ path: doc.path, updatedAt: doc.publishedAt ?? doc.updatedAt }));
}

export async function sitemapServices(): Promise<Array<{ slug: string; updatedAt: Date }>> {
  const docs = await Service.find({ active: true }, { slug: 1, updatedAt: 1 }).lean();
  return docs.map((doc) => ({ slug: doc.slug, updatedAt: doc.updatedAt }));
}

// ---------------------------------------------------------------------------------------
// Reviews, location and area requests

let reviewCache: { at: number; reviews: PublicReviewDto[] } | null = null;
const REVIEW_CACHE_MS = 5 * 60_000;

/** "Priya S." — never a full name or anything that identifies the customer further. */
function shortName(name: string): string {
  const [first = "", ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last.charAt(0).toUpperCase()}.` : first;
}

/** Recent 4–5★ reviews with a comment, not hidden by the team. */
export async function publicReviews(): Promise<PublicReviewDto[]> {
  if (reviewCache && Date.now() - reviewCache.at < REVIEW_CACHE_MS) return reviewCache.reviews;
  const rows = await Booking.find({ "review.rating": { $gte: 4 }, "review.hidden": false, "review.comment": { $regex: /\S/ } }, { customerId: 1, items: 1, review: 1 })
    .sort({ "review.at": -1 })
    .limit(12)
    .lean();
  const who = await names(rows.map((row) => row.customerId));
  const reviews = rows.flatMap((row): PublicReviewDto[] => {
    const name = shortName(who.get(String(row.customerId)) ?? "");
    if (!row.review || !name) return [];
    const service: Localized = row.items[0]?.name ?? { en: "", hi: "" };
    return [{ name, rating: row.review.rating, comment: row.review.comment, service, at: row.review.at.toISOString() }];
  });
  reviewCache = { at: Date.now(), reviews };
  return reviews;
}

export const clearReviewCache = (): void => {
  reviewCache = null;
};

/** Is this point inside an area we serve? Same rule as booking (no areas configured = anywhere). */
export async function locate(point: GeoPoint): Promise<LocateResponse> {
  const { settings } = await getSettings();
  const areas = settings.operations.activeAreas;
  if (areas.length === 0) return { served: true, area: null };
  const area = areas.find((candidate) => pointInRing(point, candidate.polygon));
  return { served: Boolean(area), area: area?.name ?? null };
}

export async function saveAreaRequest(input: AreaRequestInput, ip: string | null): Promise<void> {
  const location = typeof input.lat === "number" && typeof input.lng === "number" ? { lat: input.lat, lng: input.lng } : null;
  // One request per number per day is plenty.
  const recent = await AreaRequest.exists({ phone: input.phone, createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60_000) } });
  if (recent) return;
  await AreaRequest.create({ phone: input.phone, place: input.place ?? "", location, ip });
}

export async function listAreaRequests(): Promise<AreaRequestDto[]> {
  const rows = await AreaRequest.find().sort({ createdAt: -1 }).limit(500).lean();
  return rows.map((row) => ({ id: String(row._id), phone: row.phone, place: row.place, location: row.location ?? null, createdAt: row.createdAt.toISOString() }));
}

export async function deleteAreaRequest(id: string, actor: Actor): Promise<void> {
  const result = await AreaRequest.deleteOne({ _id: objectId(id) });
  if (result.deletedCount === 0) throw new AppError("NOT_FOUND");
  await recordAudit({ action: "area_request.delete", entity: { type: "area_request", id } }, actor);
}
