import { publicInfo, updateSettingsSchema } from "@brand/shared";
import { Router } from "express";
import { requireRole } from "../../http/auth";
import { bodyOf, validateBody } from "../../http/validate";
import { auditActor } from "../audit/audit.model";
import { getSettings, updateSettings } from "./settings.service";

/** GET/PUT /v1/admin/settings (plan C12). The admin Settings screen arrives in Phase 8. */
export function settingsRouter(): Router {
  const router = Router();
  router.use(requireRole("admin"));

  router.get("/", async (_req, res) => {
    res.json(await getSettings());
  });

  router.put("/", validateBody(updateSettingsSchema), async (req, res) => {
    const { version, settings } = bodyOf(req, updateSettingsSchema);
    res.json(await updateSettings(version, settings, auditActor(req)));
  });

  return router;
}

/** GET /v1/info: hours, fees and limits that public pages and policies quote. */
export function publicInfoRouter(): Router {
  const router = Router();
  router.get("/info", async (_req, res) => {
    const { settings } = await getSettings();
    res.set("Cache-Control", "public, max-age=60");
    res.json(publicInfo(settings));
  });
  return router;
}
