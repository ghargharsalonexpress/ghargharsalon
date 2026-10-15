import { areaRequestSchema, createPageSchema, locateSchema, pagePathSchema, savePageSchema, updateSiteSchema, z } from "@brand/shared";
import { Router } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import type { Config } from "../../config";
import { AppError } from "../../errors";
import { requireRole } from "../../http/auth";
import { bodyOf, validateBody } from "../../http/validate";
import { auditActor } from "../audit/audit.model";
import {
  adminPage,
  createPage,
  deleteAreaRequest,
  deletePage,
  etagOf,
  getSite,
  listAreaRequests,
  listPages,
  locate,
  pageVersions,
  publicPage,
  publicReviews,
  publicSite,
  publishPage,
  resetPage,
  restorePageVersion,
  restoreSite,
  saveAreaRequest,
  savePage,
  siteVersions,
  sitemapPages,
  sitemapServices,
  updateSite,
} from "./site.service";

const limiter = (name: string, windowMs: number, limit: number) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => `${name}:${ipKeyGenerator(req.ip ?? "unknown")}`,
    handler: (_req, _res, next) => next(new AppError("RATE_LIMITED", { retryAfterSeconds: Math.ceil(windowMs / 1000) })),
  });

const xml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const day = (date: Date) => date.toISOString().slice(0, 10);

/**
 * Public website content (ADR-0021): GET /v1/site, GET /v1/pages?path=, GET /v1/site/reviews,
 * POST /v1/locate, POST /v1/site/area-requests, GET /v1/sitemap.xml.
 */
export function publicSiteRouter({ config }: { config: Config }): Router {
  const router = Router();

  // Browsers keep a copy and check the ETag on every visit, so a change shows straight away.
  router.get("/site", async (req, res) => {
    const site = await publicSite();
    const etag = etagOf(site);
    res.set({ ETag: etag, "Cache-Control": "no-cache" });
    if (req.get("if-none-match") === etag) {
      res.status(304).end();
      return;
    }
    res.json(site);
  });

  router.get("/pages", async (req, res) => {
    const path = pagePathSchema.safeParse(typeof req.query.path === "string" ? req.query.path : "");
    if (!path.success) throw new AppError("NOT_FOUND");
    // An admin's preview shows the unpublished draft and is never cached.
    const preview = req.query.preview === "1" && req.user?.role === "admin";
    const page = await publicPage(path.data, { preview });
    if (preview) {
      res.set("Cache-Control", "no-store").json(page);
      return;
    }
    const etag = etagOf(page);
    res.set({ ETag: etag, "Cache-Control": "no-cache" });
    if (req.get("if-none-match") === etag) {
      res.status(304).end();
      return;
    }
    res.json(page);
  });

  router.get("/site/reviews", async (_req, res) => {
    res.set("Cache-Control", "public, max-age=300").json(await publicReviews());
  });

  router.post("/locate", limiter("locate", 60_000, 30), validateBody(locateSchema), async (req, res) => {
    res.json(await locate(bodyOf(req, locateSchema)));
  });

  router.post("/site/area-requests", limiter("area-request", 60 * 60_000, 5), validateBody(areaRequestSchema), async (req, res) => {
    const input = bodyOf(req, areaRequestSchema);
    // Bots fill hidden fields; they get the same answer but nothing is stored.
    if (!input.website) await saveAreaRequest(input, req.ip ?? null);
    res.status(202).json({});
  });

  router.get("/sitemap.xml", async (_req, res) => {
    const web = config.WEB_URL.replace(/\/$/, "");
    const [pages, services] = await Promise.all([sitemapPages(), sitemapServices()]);
    const urls = [
      ...pages.map((page) => ({ loc: `${web}${page.path === "/" ? "/" : page.path}`, lastmod: day(page.updatedAt) })),
      { loc: `${web}/services`, lastmod: day(new Date()) },
      ...services.map((service) => ({ loc: `${web}/services/${service.slug}`, lastmod: day(service.updatedAt) })),
    ];
    const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((url) => `  <url><loc>${xml(url.loc)}</loc><lastmod>${url.lastmod}</lastmod></url>`)
      .join("\n")}\n</urlset>\n`;
    res.set({ "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" }).send(body);
  });

  return router;
}

const versionBody = z.strictObject({ version: z.number().int().min(1) });
const positiveInt = (value: unknown): number => {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) throw new AppError("NOT_FOUND");
  return number;
};
const param = (value: unknown): string => (typeof value === "string" ? value : "");

/** /v1/admin/site: the website editor (brand, theme, menus, pages, area requests). */
export function adminSiteRouter(): Router {
  const router = Router();
  router.use(requireRole("admin"));

  router.get("/", async (_req, res) => {
    res.json(await getSite());
  });

  router.put("/", validateBody(updateSiteSchema), async (req, res) => {
    const { version, site } = bodyOf(req, updateSiteSchema);
    res.json(await updateSite(version, site, auditActor(req)));
  });

  router.get("/versions", async (_req, res) => {
    res.json(await siteVersions());
  });

  router.post("/versions/:version/restore", validateBody(versionBody), async (req, res) => {
    res.json(await restoreSite(positiveInt(req.params.version), bodyOf(req, versionBody).version, auditActor(req)));
  });

  router.get("/pages", async (_req, res) => {
    res.json(await listPages());
  });

  router.post("/pages", validateBody(createPageSchema), async (req, res) => {
    res.status(201).json(await createPage(bodyOf(req, createPageSchema), auditActor(req)));
  });

  router.get("/pages/:id", async (req, res) => {
    res.json(await adminPage(param(req.params.id)));
  });

  router.put("/pages/:id", validateBody(savePageSchema), async (req, res) => {
    res.json(await savePage(param(req.params.id), bodyOf(req, savePageSchema), auditActor(req)));
  });

  router.delete("/pages/:id", async (req, res) => {
    await deletePage(param(req.params.id), auditActor(req));
    res.status(204).end();
  });

  router.post("/pages/:id/publish", validateBody(versionBody), async (req, res) => {
    res.json(await publishPage(param(req.params.id), bodyOf(req, versionBody).version, auditActor(req)));
  });

  router.post("/pages/:id/reset", validateBody(versionBody), async (req, res) => {
    res.json(await resetPage(param(req.params.id), bodyOf(req, versionBody).version, auditActor(req)));
  });

  router.get("/pages/:id/versions", async (req, res) => {
    res.json(await pageVersions(param(req.params.id)));
  });

  router.post("/pages/:id/versions/:number/restore", async (req, res) => {
    res.json(await restorePageVersion(param(req.params.id), positiveInt(req.params.number), auditActor(req)));
  });

  router.get("/area-requests", async (_req, res) => {
    res.json(await listAreaRequests());
  });

  router.delete("/area-requests/:id", async (req, res) => {
    await deleteAreaRequest(param(req.params.id), auditActor(req));
    res.status(204).end();
  });

  return router;
}
