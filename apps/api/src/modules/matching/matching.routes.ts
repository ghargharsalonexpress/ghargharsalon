import { adminOfferSchema, declineOfferSchema } from "@brand/shared";
import { Router } from "express";
import { currentUser, requireRole } from "../../http/auth";
import { objectIdParam } from "../../http/ids";
import { bodyOf, validateBody } from "../../http/validate";
import type { PaymentGateway } from "../payments/gateway";
import { toBookingDto } from "../bookings/bookings.service";
import type { Matching } from "./matching.service";

/** /v1/pro/offers (plan C12): the professional's job alerts. */
export function proOffersRouter({ matching, gateway }: { matching: Matching; gateway: PaymentGateway }): Router {
  const router = Router();
  router.use(requireRole("professional"));

  router.get("/", async (req, res) => {
    res.json(await matching.openOffersFor(currentUser(req)));
  });

  router.get("/:id", async (req, res) => {
    res.json(await matching.offerFor(currentUser(req), objectIdParam(req.params.id)));
  });

  router.post("/:id/accept", async (req, res) => {
    const pro = currentUser(req);
    const booking = await matching.accept(pro, objectIdParam(req.params.id));
    res.json(await toBookingDto(booking, { role: "professional", id: pro._id }, gateway));
  });

  router.post("/:id/decline", validateBody(declineOfferSchema), async (req, res) => {
    await matching.decline(currentUser(req), objectIdParam(req.params.id), bodyOf(req, declineOfferSchema).reason);
    res.status(204).end();
  });

  return router;
}

/** POST /v1/admin/bookings/:id/offer (plan W14): a direct offer to a chosen professional. */
export function adminOffersRouter({ matching }: { matching: Matching }): Router {
  const router = Router();
  router.use(requireRole("admin"));
  router.post("/:id/offer", validateBody(adminOfferSchema), async (req, res) => {
    res.status(201).json(await matching.directOffer(objectIdParam(req.params.id), bodyOf(req, adminOfferSchema).professionalId));
  });
  return router;
}
