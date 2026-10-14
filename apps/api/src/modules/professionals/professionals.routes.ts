import {
  heartbeatSchema,
  presenceChangeSchema,
  professionalInputSchema,
  professionalStatusSchema,
  professionalUpdateSchema,
  pushSubscriptionSchema,
  pushUnsubscribeSchema,
} from "@brand/shared";
import { Router } from "express";
import { currentUser, requireRole } from "../../http/auth";
import { objectIdParam } from "../../http/ids";
import { createProLimits } from "../../http/rateLimits";
import { bodyOf, validateBody } from "../../http/validate";
import { auditActor } from "../audit/audit.model";
import type { ProfessionalService } from "./professionals.service";
import type { PushService } from "./push";

/** /v1/admin/professionals (plan Phase 4, W11, W15). */
export function adminProfessionalsRouter({ service }: { service: ProfessionalService }): Router {
  const router = Router();
  router.use(requireRole("admin"));

  router.get("/", async (_req, res) => {
    res.json(await service.list());
  });

  router.post("/", validateBody(professionalInputSchema), async (req, res) => {
    res.status(201).json(await service.create(bodyOf(req, professionalInputSchema), currentUser(req), auditActor(req)));
  });

  router.get("/:id", async (req, res) => {
    res.json(await service.get(objectIdParam(req.params.id)));
  });

  router.put("/:id", validateBody(professionalUpdateSchema), async (req, res) => {
    const { version, professional } = bodyOf(req, professionalUpdateSchema);
    res.json(await service.update(objectIdParam(req.params.id), version, professional, currentUser(req), auditActor(req)));
  });

  router.post("/:id/status", validateBody(professionalStatusSchema), async (req, res) => {
    const { status, reason } = bodyOf(req, professionalStatusSchema);
    res.json(await service.setStatus(objectIdParam(req.params.id), status, reason, auditActor(req)));
  });

  router.post("/:id/set-password-link", async (req, res) => {
    await service.resendSetPassword(objectIdParam(req.params.id), auditActor(req));
    res.status(204).end();
  });

  router.post("/:id/test-alert", async (req, res) => {
    res.json(await service.sendTest(objectIdParam(req.params.id)));
  });

  return router;
}

/** /v1/pro: the professional's own panel (plan Phase 4, W11, W12). */
export function proRouter({ service, push }: { service: ProfessionalService; push: PushService }): Router {
  const router = Router();
  const limits = createProLimits();
  router.use(requireRole("professional"));

  router.get("/me", async (req, res) => {
    res.json(await service.self(currentUser(req)));
  });

  router.post("/presence", limits.presence, validateBody(presenceChangeSchema), async (req, res) => {
    const { online, location } = bodyOf(req, presenceChangeSchema);
    res.json(await service.changePresence(currentUser(req), online, location));
  });

  router.post("/heartbeat", limits.heartbeat, validateBody(heartbeatSchema), async (req, res) => {
    res.json(await service.heartbeat(currentUser(req), bodyOf(req, heartbeatSchema).location));
  });

  router.post("/push-subscriptions", validateBody(pushSubscriptionSchema), async (req, res) => {
    const devices = await push.subscribe(currentUser(req)._id, bodyOf(req, pushSubscriptionSchema), req.get("user-agent") ?? "");
    res.status(201).json({ devices });
  });

  router.delete("/push-subscriptions", validateBody(pushUnsubscribeSchema), async (req, res) => {
    res.json({ devices: await push.unsubscribe(currentUser(req)._id, bodyOf(req, pushUnsubscribeSchema).endpoint) });
  });

  router.post("/push-test", limits.pushTest, async (req, res) => {
    res.json(await service.sendTest(String(currentUser(req)._id)));
  });

  return router;
}
