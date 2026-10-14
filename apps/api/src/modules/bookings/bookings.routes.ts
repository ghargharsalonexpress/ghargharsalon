import { createBookingSchema, paymentVerifySchema, quoteRequestSchema, z } from "@brand/shared";
import express, { Router } from "express";
import { AppError } from "../../errors";
import { currentUser, requireRole } from "../../http/auth";
import { objectIdParam } from "../../http/ids";
import { createCheckoutLimits } from "../../http/rateLimits";
import { bodyOf, validateBody } from "../../http/validate";
import type { Logger } from "../../logger";
import { quote } from "../availability/availability.service";
import { LocalGateway, type PaymentGateway } from "../payments/gateway";
import { Payment } from "../payments/payment.model";
import { handleWebhook, verifyCheckout } from "../payments/payments.service";
import { getSettings } from "../settings/settings.service";
import { idempotent } from "../system/idempotency";
import { Booking } from "./booking.model";
import { assertCanView, createBooking, listForCustomer, retryPayment, toBookingDto, type Viewer } from "./bookings.service";

const viewerOf = (req: express.Request): Viewer => {
  const user = currentUser(req);
  return { role: user.role, id: user._id };
};

/** /v1/availability, /v1/bookings and the payment steps (plan C12, W4). */
export function bookingsRouter({ gateway, logger, rateLimits = true }: { gateway: PaymentGateway; logger: Logger; rateLimits?: boolean }): Router {
  const router = Router();
  const limits = createCheckoutLimits(rateLimits);

  router.post("/availability/quote", limits.quote, validateBody(quoteRequestSchema), async (req, res) => {
    const { settings } = await getSettings();
    res.json(await quote(req.user?._id ?? null, bodyOf(req, quoteRequestSchema), settings));
  });

  router.post("/bookings", requireRole("customer"), limits.createBooking, validateBody(createBookingSchema), async (req, res) => {
    const customer = currentUser(req);
    const result = await idempotent(req, customer._id, async () => {
      const { settings } = await getSettings();
      const booking = await createBooking(customer, bodyOf(req, createBookingSchema), settings, gateway, logger);
      return { status: 201, body: await toBookingDto(booking, { role: "customer", id: customer._id }, gateway) };
    });
    res.status(result.status).json(result.body);
  });

  router.get("/bookings", requireRole("customer"), async (req, res) => {
    const before = typeof req.query.before === "string" && !Number.isNaN(Date.parse(req.query.before)) ? new Date(req.query.before) : undefined;
    res.json(await listForCustomer(currentUser(req)._id, before));
  });

  router.get("/bookings/:id", requireRole("customer", "professional", "admin"), async (req, res) => {
    const booking = await Booking.findById(objectIdParam(req.params.id));
    if (!booking) throw new AppError("NOT_FOUND");
    const viewer = viewerOf(req);
    assertCanView(booking, viewer);
    res.json(await toBookingDto(booking, viewer, gateway));
  });

  router.post("/bookings/:id/payments/verify", requireRole("customer"), limits.verify, validateBody(paymentVerifySchema), async (req, res) => {
    const customer = currentUser(req);
    const booking = await Booking.findOne({ _id: objectIdParam(req.params.id), customerId: customer._id });
    if (!booking) throw new AppError("NOT_FOUND");
    const updated = await verifyCheckout(gateway, booking, bodyOf(req, paymentVerifySchema), logger);
    res.json(await toBookingDto(updated, { role: "customer", id: customer._id }, gateway));
  });

  router.post("/bookings/:id/payments/retry", requireRole("customer"), async (req, res) => {
    const customer = currentUser(req);
    const booking = await Booking.findOne({ _id: objectIdParam(req.params.id), customerId: customer._id });
    if (!booking) throw new AppError("NOT_FOUND");
    res.json(await retryPayment(booking, gateway));
  });

  // The local gateway's "payment sheet" (development and tests only; never with Razorpay).
  if (gateway instanceof LocalGateway) {
    const localPaySchema = z.strictObject({ orderId: z.string().min(5).max(100), outcome: z.enum(["success", "failure"]) });
    router.post("/payments/local/pay", requireRole("customer"), validateBody(localPaySchema), async (req, res) => {
      const { orderId, outcome } = bodyOf(req, localPaySchema);
      const payment = await Payment.findOne({ orderId }).lean();
      const booking = payment && (await Booking.findOne({ _id: payment.bookingId, customerId: currentUser(req)._id }).lean());
      if (!payment || !booking) throw new AppError("NOT_FOUND");
      res.json(gateway.pay(orderId, outcome, payment.amountPaise));
    });
  }

  return router;
}

/**
 * POST /v1/webhooks/razorpay: mounted before the JSON parser, sessions and CSRF, because the
 * signature covers the exact raw bytes and the caller is Razorpay, not a browser.
 */
export function webhooksRouter({ gateway, logger }: { gateway: PaymentGateway; logger: Logger }): Router {
  const router = Router();
  router.post("/razorpay", express.raw({ type: "application/json", limit: "200kb" }), async (req, res) => {
    const signature = req.get("x-razorpay-signature") ?? "";
    const eventId = req.get("x-razorpay-event-id") ?? "";
    if (!Buffer.isBuffer(req.body) || !signature || !eventId) throw new AppError("VALIDATION_FAILED", { detail: "webhook headers" });
    await handleWebhook(gateway, req.body, signature, eventId, logger);
    res.json({ ok: true });
  });
  return router;
}
