import {
  cartPriceSchema,
  categoryInputSchema,
  reorderSchema,
  serviceInputSchema,
  slugSchema,
  V,
  z,
} from "@brand/shared";
import { Router } from "express";
import multer from "multer";
import { AppError } from "../../errors";
import { requireRole } from "../../http/auth";
import { bodyOf, validateBody } from "../../http/validate";
import { auditActor } from "../audit/audit.model";
import { processImage } from "../media/images";
import type { MediaStorage } from "../media/storage";
import { getSettings } from "../settings/settings.service";
import {
  adminCategories,
  adminService,
  adminServices,
  createService,
  priceCart,
  publicCatalog,
  publicService,
  reorderCategories,
  saveCategory,
  updateService,
} from "./catalog.service";

/** GET /v1/catalog, GET /v1/services/:slug, POST /v1/cart/price (public, plan C12). */
export function catalogRouter(): Router {
  const router = Router();

  router.get("/catalog", async (req, res) => {
    const catalog = await publicCatalog();
    const etag = `"${catalog.version}"`;
    // Browsers keep a copy but check the ETag every time (a tiny 304), so a change an admin
    // publishes shows on the next visit instead of after a cache window.
    res.set({ ETag: etag, "Cache-Control": "no-cache" });
    if (req.get("if-none-match") === etag) {
      res.status(304).end();
      return;
    }
    res.json(catalog);
  });

  router.get("/services/:slug", async (req, res) => {
    const slug = slugSchema.safeParse(req.params.slug);
    if (!slug.success) throw new AppError("NOT_FOUND");
    res.set("Cache-Control", "no-cache").json(await publicService(slug.data));
  });

  /**
   * The server re-prices every cart from the database (plan C9): the browser's numbers are
   * estimates. Lines report why they changed: unavailable, price changed, quantity capped.
   */
  router.post("/cart/price", validateBody(cartPriceSchema), async (req, res) => {
    const { settings } = await getSettings();
    res.json(await priceCart(bodyOf(req, cartPriceSchema).lines, settings));
  });

  return router;
}

const serviceUpdateSchema = z.strictObject({ version: z.number().int().min(1), service: serviceInputSchema });
/** A Mongo ObjectId from the path, or 404 (never a CastError 500). */
function objectId(value: unknown): string {
  if (typeof value !== "string" || !/^[a-f0-9]{24}$/.test(value)) throw new AppError("NOT_FOUND");
  return value;
}

const booleanQuery = (value: unknown) => (value === "true" ? true : value === "false" ? false : undefined);
const stringQuery = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim().slice(0, 80) : undefined);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
const mediaFolderSchema = z.enum(["services", "categories", "professionals"]);

/** /v1/admin/services, /v1/admin/categories, /v1/admin/media (plan W13). */
export function adminCatalogRouter({ media }: { media: MediaStorage }): Router {
  const router = Router();
  router.use(requireRole("admin"));

  router.get("/services", async (req, res) => {
    res.json(
      await adminServices({
        gender: stringQuery(req.query.gender),
        category: stringQuery(req.query.category),
        active: booleanQuery(req.query.active),
        missingHindi: booleanQuery(req.query.missingHindi),
        q: stringQuery(req.query.q),
      }),
    );
  });

  router.get("/services/:id", async (req, res) => {
    res.json(await adminService(objectId(req.params.id)));
  });

  router.post("/services", validateBody(serviceInputSchema), async (req, res) => {
    res.status(201).json(await createService(bodyOf(req, serviceInputSchema), auditActor(req)));
  });

  router.put("/services/:id", validateBody(serviceUpdateSchema), async (req, res) => {
    const { version, service } = bodyOf(req, serviceUpdateSchema);
    res.json(await updateService(objectId(req.params.id), version, service, auditActor(req)));
  });

  router.get("/categories", async (_req, res) => {
    res.json(await adminCategories());
  });

  router.post("/categories", validateBody(categoryInputSchema), async (req, res) => {
    res.status(201).json(await saveCategory(null, bodyOf(req, categoryInputSchema), auditActor(req)));
  });

  router.put("/categories/:slug", validateBody(categoryInputSchema), async (req, res) => {
    const slug = slugSchema.safeParse(req.params.slug);
    if (!slug.success) throw new AppError("NOT_FOUND");
    res.json(await saveCategory(slug.data, bodyOf(req, categoryInputSchema), auditActor(req)));
  });

  router.post("/categories/reorder", validateBody(reorderSchema), async (req, res) => {
    await reorderCategories(bodyOf(req, reorderSchema).slugs, auditActor(req));
    res.status(204).end();
  });

  /** One image (JPEG/PNG/WebP/AVIF/HEIC, ≤ 5 MB) → AVIF + WebP sizes in storage (plan C11 uploads). */
  router.post("/media", (req, res, next) => {
    upload.single("file")(req, res, (error: unknown) => {
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") return next(new AppError("VALIDATION_FAILED", { fields: { file: V.imageTooLarge } }));
      if (error) return next(error);
      next();
    });
  });
  router.post("/media", async (req, res) => {
    const folder = mediaFolderSchema.safeParse(req.query.folder ?? "services");
    if (!req.file) throw new AppError("VALIDATION_FAILED", { fields: { file: V.required } });
    if (!folder.success) throw new AppError("VALIDATION_FAILED", { fields: { folder: V.invalid } });
    const { image, files } = await processImage(req.file.buffer, folder.data);
    await media.put(files);
    res.status(201).json({ image });
  });

  return router;
}
