import { adminCancelSchema, arrivedSchema, completeJobSchema, customerCancelSchema, jobLocationSchema, proCancelSchema, reviewSchema, startJobSchema } from "@brand/shared";
import { Router } from "express";
import { AppError } from "../../errors";
import { currentUser, requireRole } from "../../http/auth";
import { objectIdParam } from "../../http/ids";
import { bodyOf, validateBody } from "../../http/validate";
import { auditActor, recordAudit } from "../audit/audit.model";
import { Booking } from "../bookings/booking.model";
import { assertCanView, toBookingDto } from "../bookings/bookings.service";
import type { PaymentGateway } from "../payments/gateway";
import type { Jobs } from "./jobs.service";

/** /v1/pro/jobs (plan C12): the professional's steps on a job. */
export function proJobsRouter({ jobs }: { jobs: Jobs }): Router {
  const router = Router();
  router.use(requireRole("professional"));

  router.get("/", async (req, res) => {
    res.json(await jobs.jobs(currentUser(req)));
  });
  router.get("/earnings", async (req, res) => {
    res.json(await jobs.earnings(currentUser(req)));
  });
  router.get("/:id", async (req, res) => {
    res.json(await jobs.job(currentUser(req), objectIdParam(req.params.id)));
  });
  router.post("/:id/arrived", validateBody(arrivedSchema), async (req, res) => {
    const { location, confirmFar } = bodyOf(req, arrivedSchema);
    res.json(await jobs.arrived(currentUser(req), objectIdParam(req.params.id), location, confirmFar ?? false));
  });
  router.post("/:id/start", validateBody(startJobSchema), async (req, res) => {
    res.json(await jobs.start(currentUser(req), objectIdParam(req.params.id), bodyOf(req, startJobSchema).otp));
  });
  router.post("/:id/complete", validateBody(completeJobSchema), async (req, res) => {
    res.json(await jobs.complete(currentUser(req), objectIdParam(req.params.id), bodyOf(req, completeJobSchema).confirmEarly ?? false));
  });
  router.post("/:id/call", async (req, res) => {
    await jobs.logCall(currentUser(req), objectIdParam(req.params.id));
    res.status(204).end();
  });
  router.post("/:id/customer-unavailable", async (req, res) => {
    res.json(await jobs.customerUnavailable(currentUser(req), objectIdParam(req.params.id)));
  });
  router.post("/:id/cancel", validateBody(proCancelSchema), async (req, res) => {
    await jobs.proCancel(currentUser(req), objectIdParam(req.params.id), bodyOf(req, proCancelSchema).reason);
    res.status(204).end();
  });
  router.post("/:id/location", validateBody(jobLocationSchema), async (req, res) => {
    const { location, heading } = bodyOf(req, jobLocationSchema);
    res.json(await jobs.updateLocation(currentUser(req), objectIdParam(req.params.id), location, heading ?? null));
  });
  return router;
}

/** The customer's booking actions: cancel (with a preview), review, invoice (plan C12). */
export function customerJobsRouter({ jobs, gateway }: { jobs: Jobs; gateway: PaymentGateway }): Router {
  const router = Router();

  router.get("/bookings/:id/cancel-preview", requireRole("customer"), async (req, res) => {
    const booking = await Booking.findOne({ _id: objectIdParam(req.params.id), customerId: currentUser(req)._id });
    if (!booking) throw new AppError("NOT_FOUND");
    res.json(await jobs.cancelPreview(booking));
  });

  router.post("/bookings/:id/cancel", requireRole("customer"), validateBody(customerCancelSchema), async (req, res) => {
    const customer = currentUser(req);
    const booking = await jobs.customerCancel(customer, objectIdParam(req.params.id), bodyOf(req, customerCancelSchema).reason);
    res.json(await toBookingDto(booking, { role: "customer", id: customer._id }, gateway));
  });

  router.post("/bookings/:id/review", requireRole("customer"), validateBody(reviewSchema), async (req, res) => {
    const { rating, comment } = bodyOf(req, reviewSchema);
    await jobs.review(currentUser(req), objectIdParam(req.params.id), rating, comment);
    res.status(204).end();
  });

  router.get("/bookings/:id/invoice", requireRole("customer", "admin"), async (req, res) => {
    const user = currentUser(req);
    const booking = await Booking.findById(objectIdParam(req.params.id), { customerId: 1, professionalId: 1 });
    if (!booking) throw new AppError("NOT_FOUND");
    assertCanView(booking, { role: user.role, id: user._id });
    res.json(await jobs.invoice({ role: user.role, id: user._id }, String(booking._id)));
  });

  return router;
}

/** POST /v1/admin/bookings/:id/cancel (plan W14): cancel with the refund the admin chooses. */
export function adminJobsRouter({ jobs, gateway }: { jobs: Jobs; gateway: PaymentGateway }): Router {
  const router = Router();
  router.use(requireRole("admin"));
  router.post("/:id/cancel", validateBody(adminCancelSchema), async (req, res) => {
    const { reason, feePaise } = bodyOf(req, adminCancelSchema);
    const booking = await jobs.adminCancel(objectIdParam(req.params.id), reason, feePaise);
    await recordAudit({ action: "booking.cancel", entity: { type: "booking", id: String(booking._id) }, after: { reason, feePaise } }, auditActor(req));
    const admin = currentUser(req);
    res.json(await toBookingDto(booking, { role: "admin", id: admin._id }, gateway));
  });
  return router;
}
