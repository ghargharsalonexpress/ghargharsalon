import type { BookingPaymentDto } from "@brand/shared";
import type { ClientSession, Types } from "mongoose";
import { AppError } from "../../errors";
import type { Logger } from "../../logger";
import { recordAudit } from "../audit/audit.model";
import { Booking, type BookingDoc } from "../bookings/booking.model";
import { transition } from "../bookings/lifecycle";
import { Alert, raiseAlert } from "../notifications/notifications";
import { getSettings } from "../settings/settings.service";
import { enqueue } from "../system/outbox";
import type { PaymentGateway } from "./gateway";
import { Payment, Refund, WebhookEvent } from "./payment.model";

export const toPaymentDto = (payment: { provider: BookingPaymentDto["provider"]; orderId: string; amountPaise: number; status: string }, keyId: string | null): BookingPaymentDto => ({
  provider: payment.provider,
  orderId: payment.orderId,
  keyId,
  amountPaise: payment.amountPaise,
  status: payment.status === "captured" || payment.status === "refunded" ? "captured" : payment.status === "failed" ? "failed" : "created",
});

/** Opens a gateway order for the booking's total (plan C9: receipt = booking number). */
export async function openOrder(gateway: PaymentGateway, booking: Pick<BookingDoc, "_id" | "number" | "pricing">): Promise<BookingPaymentDto> {
  const { orderId } = await gateway.createOrder({ amountPaise: booking.pricing.totalPaise, receipt: booking.number, notes: { bookingId: String(booking._id), bookingNumber: booking.number } });
  const payment = await Payment.create({ bookingId: booking._id, provider: gateway.provider, orderId, amountPaise: booking.pricing.totalPaise, status: "created" });
  return toPaymentDto(payment, gateway.keyId);
}

// ---------- refunds ----------

/**
 * Queues a refund once per booking and reason (plan C9). The outbox delivers it, retrying
 * until the gateway accepts it; a captured payment is required.
 */
export async function requestRefund(
  { bookingId, amountPaise, reason, initiatedBy }: { bookingId: Types.ObjectId; amountPaise: number; reason: string; initiatedBy: "system" | "admin" | "customer" },
  session?: ClientSession,
): Promise<Types.ObjectId | null> {
  if (amountPaise <= 0) return null;
  const payment = await Payment.findOne({ bookingId, status: { $in: ["captured", "refunded"] } }, null, { session }).lean();
  if (!payment?.paymentId) return null;
  const idempotencyKey = `${String(bookingId)}:${reason}`;
  const existing = await Refund.findOne({ idempotencyKey }, null, { session }).lean();
  if (existing) return existing._id;
  const [refund] = await Refund.create([{ bookingId, paymentId: payment.paymentId, amountPaise, reason, idempotencyKey, initiatedBy, status: "queued" }], { session });
  if (!refund) return null;
  await Booking.updateOne({ _id: bookingId }, { $set: { refundId: refund._id } }, { session });
  await enqueue("refund", { refundId: String(refund._id) }, session);
  return refund._id;
}

async function alertRefundFailed(refund: { bookingId: Types.ObjectId; amountPaise: number; lastError: string | null }): Promise<void> {
  const booking = await Booking.findById(refund.bookingId, { number: 1 }).lean();
  const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(refund.amountPaise / 100);
  await raiseAlert("refund_failed", refund.bookingId, `${booking?.number ?? "A booking"}: the refund of ${rupees} failed (${refund.lastError ?? "gateway error"}). Retry it from the booking or Payments.`);
}

/** The outbox gave up on a refund after its retries (plan W10): mark it failed and alert the team. */
export async function refundGaveUp(payload: Record<string, unknown>): Promise<void> {
  const refund = await Refund.findOneAndUpdate({ _id: payload.refundId, status: "queued" }, { $set: { status: "failed" } }, { returnDocument: "after" }).lean();
  if (refund) await alertRefundFailed(refund);
}

/** "Retry" on a failed refund (plan W14): queued again for the gateway; the open alert is resolved. */
export async function retryRefund(refundId: string, actorId: Types.ObjectId): Promise<void> {
  const refund = await Refund.findOneAndUpdate({ _id: refundId, status: "failed" }, { $set: { status: "queued", lastError: null } }, { returnDocument: "after" }).lean();
  if (!refund) throw new AppError("BOOKING_STATE", { detail: "refund is not failed" });
  await enqueue("refund", { refundId: String(refund._id) });
  await Alert.updateMany({ bookingId: refund.bookingId, kind: "refund_failed", resolvedAt: null }, { $set: { resolvedAt: new Date(), resolvedBy: actorId } });
}

/** Outbox handler: sends a queued refund to the gateway (instant refunds, speed "optimum"). */
export function refundHandler(gateway: PaymentGateway, logger: Logger) {
  return async (payload: Record<string, unknown>) => {
    const refund = await Refund.findById(payload.refundId);
    if (!refund || refund.status !== "queued") return;
    try {
      const result = await gateway.refund({ paymentId: refund.paymentId, amountPaise: refund.amountPaise, speed: "optimum", receipt: String(refund._id), notes: { bookingId: String(refund.bookingId), reason: refund.reason } });
      refund.gatewayRefundId = result.refundId;
      refund.status = result.status === "processed" ? "processed" : result.status === "failed" ? "failed" : "pending";
      if (refund.status === "processed") refund.processedAt = new Date();
      refund.lastError = null;
      await refund.save();
      if (refund.status === "processed") await Payment.updateOne({ paymentId: refund.paymentId }, { $set: { status: "refunded" } });
      logger.info({ refundId: String(refund._id), status: refund.status }, "refund sent");
    } catch (error) {
      refund.lastError = error instanceof Error ? error.message.slice(0, 300) : String(error);
      await refund.save();
      throw error;
    }
  };
}

// ---------- capture ----------

/**
 * A captured payment, from Checkout's handler or a webhook, whichever comes first (plan C9).
 * The booking starts searching; a payment for a booking that already expired or was
 * cancelled is refunded in full.
 */
export async function onCaptured({ orderId, paymentId, method }: { orderId: string; paymentId: string; method: string | null }, logger: Logger): Promise<BookingDoc | null> {
  const payment = await Payment.findOneAndUpdate(
    { orderId, status: { $in: ["created", "failed"] } },
    { $set: { status: "captured", paymentId, method, capturedAt: new Date() } },
    { returnDocument: "after" },
  ).lean();
  const record = payment ?? (await Payment.findOne({ orderId }).lean());
  if (!record) {
    logger.warn({ orderId }, "capture for an unknown order");
    return null;
  }
  if (!payment) return Booking.findById(record.bookingId);

  const { settings } = await getSettings();
  const now = new Date();
  const searching = await transition(record.bookingId, "awaiting_payment", "searching", "system", {
    paymentExpiresAt: null,
    search: { round: 0, startedAt: now, deadlineAt: new Date(now.getTime() + settings.matching.searchTimeoutSeconds * 1000), offeredUserIds: [], nextRoundAt: now },
  });
  if (searching) return searching;

  // Paid too late (expired) or after cancelling: give it all back.
  const booking = await Booking.findById(record.bookingId);
  if (booking && (booking.status === "expired" || booking.status === "cancelled")) {
    await requestRefund({ bookingId: booking._id, amountPaise: record.amountPaise, reason: "late_capture", initiatedBy: "system" });
    await recordAudit({ action: "payment.late_capture_refund", entity: { type: "booking", id: String(booking._id) }, after: { orderId, paymentId } });
  }
  return booking;
}

/** POST /v1/bookings/:id/payments/verify: Checkout's signed result (plan W4). */
export async function verifyCheckout(
  gateway: PaymentGateway,
  booking: BookingDoc,
  input: { orderId: string; paymentId: string; signature: string },
  logger: Logger,
): Promise<BookingDoc> {
  const payment = await Payment.findOne({ orderId: input.orderId, bookingId: booking._id }).lean();
  if (!payment) throw new AppError("PAYMENT_VERIFICATION_FAILED", { detail: "order not for this booking" });
  if (!gateway.verifyPaymentSignature(input)) throw new AppError("PAYMENT_VERIFICATION_FAILED", { detail: "bad signature" });
  // The signature proves the customer paid; confirm the method from the gateway when we can.
  const details = await gateway.fetchPayment(input.paymentId).catch(() => null);
  if (details && details.status === "failed") throw new AppError("PAYMENT_VERIFICATION_FAILED", { detail: "gateway says failed" });
  const updated = await onCaptured({ orderId: input.orderId, paymentId: input.paymentId, method: details?.method ?? null }, logger);
  return updated ?? booking;
}

// ---------- webhooks ----------

interface RazorpayWebhook {
  event: string;
  payload: {
    payment?: { entity: { id: string; order_id: string; method?: string; status: string } };
    refund?: { entity: { id: string; payment_id: string; status: string } };
  };
}

/** POST /v1/webhooks/razorpay: signed, de-duplicated, safe in any order (plan C9). */
export async function handleWebhook(gateway: PaymentGateway, rawBody: Buffer, signature: string, eventId: string, logger: Logger): Promise<void> {
  if (!gateway.verifyWebhookSignature(rawBody, signature)) throw new AppError("FORBIDDEN", { detail: "webhook signature" });
  const body = JSON.parse(rawBody.toString("utf8")) as RazorpayWebhook;
  try {
    await WebhookEvent.create({ eventId, type: body.event, processedAt: new Date() });
  } catch {
    return; // Already handled: Razorpay retries until it gets a 2xx.
  }

  const payment = body.payload.payment?.entity;
  const refund = body.payload.refund?.entity;
  switch (body.event) {
    case "payment.captured":
    case "order.paid":
      if (payment) await onCaptured({ orderId: payment.order_id, paymentId: payment.id, method: payment.method ?? null }, logger);
      break;
    case "payment.failed":
      // Only a payment that hasn't been captured can fail; a later capture still wins.
      if (payment) await Payment.updateOne({ orderId: payment.order_id, status: "created" }, { $set: { status: "failed", paymentId: payment.id } });
      break;
    case "refund.processed":
      if (refund) {
        await Refund.updateOne({ gatewayRefundId: refund.id }, { $set: { status: "processed", processedAt: new Date() } });
        await Payment.updateOne({ paymentId: refund.payment_id }, { $set: { status: "refunded" } });
      }
      break;
    case "refund.failed":
      if (refund) {
        const failed = await Refund.findOneAndUpdate({ gatewayRefundId: refund.id }, { $set: { status: "failed", lastError: "refund.failed webhook" } }, { returnDocument: "after" }).lean();
        logger.error({ refundId: refund.id }, "refund failed at the gateway");
        if (failed) await alertRefundFailed(failed);
      }
      break;
    default:
      logger.info({ event: body.event }, "webhook ignored");
  }
}

// ---------- background jobs ----------

/** Unpaid bookings expire after settings.operations.unpaidExpiryMinutes (plan A8). */
export async function expireUnpaid(now = new Date()): Promise<number> {
  const due = await Booking.find({ status: "awaiting_payment", paymentExpiresAt: { $lte: now } }, { _id: 1 }).lean();
  let expired = 0;
  for (const { _id } of due) if (await transition(_id, "awaiting_payment", "expired", "system", { paymentExpiresAt: null })) expired++;
  return expired;
}

/**
 * Every 10 minutes (plan C9): asks the gateway about bookings still waiting for payment, in case
 * both Checkout's handler and the webhook were lost.
 */
export async function reconcile(gateway: PaymentGateway, logger: Logger): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60_000);
  const waiting = await Payment.find({ status: "created", createdAt: { $gte: since, $lte: new Date(Date.now() - 60_000) } }).lean();
  let fixed = 0;
  for (const payment of waiting) {
    const attempts = await gateway.fetchOrderPayments(payment.orderId).catch(() => []);
    const captured = attempts.find((attempt) => attempt.status === "captured");
    if (!captured) continue;
    await onCaptured({ orderId: payment.orderId, paymentId: captured.paymentId, method: captured.method }, logger);
    fixed++;
  }
  if (fixed) logger.warn({ fixed }, "reconciliation captured payments the app had missed");
  return fixed;
}
