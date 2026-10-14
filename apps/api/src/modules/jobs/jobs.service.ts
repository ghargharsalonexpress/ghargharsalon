import {
  type CancelPreviewDto,
  type InvoiceDto,
  type LocationFix,
  type ProEarningsDto,
  type ProJobDto,
  type ProJobSummaryDto,
  RT,
  type Settings,
} from "@brand/shared";
import mongoose, { model, Schema, type Types } from "mongoose";
import type { Config } from "../../config";
import { AppError } from "../../errors";
import type { Logger } from "../../logger";
import { distanceMeters, etaRange } from "../availability/geo";
import { type Actor, Booking, type BookingDoc } from "../bookings/booking.model";
import { announce, transition } from "../bookings/lifecycle";
import { otpMatches } from "../bookings/otp";
import { notifyOffersClosed } from "../matching/closed";
import { earningsFor } from "../matching/matching.service";
import { Offer, type OfferDoc } from "../matching/offer.model";
import { queueBookingEmail, raiseAlert } from "../notifications/notifications";
import { Payment } from "../payments/payment.model";
import { requestRefund } from "../payments/payments.service";
import { Professional, type GeoJsonPoint, toPoint } from "../professionals/professional.model";
import type { PushService } from "../professionals/push";
import { realtime } from "../realtime/realtime";
import { getSettings } from "../settings/settings.service";
import { nextSequence } from "../system/counters";
import { User, type UserDoc } from "../users/user.model";

// ---------- location trail (plan C5: one sample a minute, kept 30 days for disputes) ----------

interface LocationPingFields {
  bookingId: Types.ObjectId;
  professionalId: Types.ObjectId;
  point: GeoJsonPoint;
  at: Date;
}
const pingSchema = new Schema<LocationPingFields>(
  { bookingId: { type: Schema.Types.ObjectId, required: true }, professionalId: { type: Schema.Types.ObjectId, required: true }, point: { type: { type: String }, coordinates: [Number] }, at: { type: Date, required: true } },
  { versionKey: false },
);
pingSchema.index({ bookingId: 1, at: 1 });
pingSchema.index({ at: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
export const LocationPing = model<LocationPingFields>("LocationPing", pingSchema, "location_pings");

/** India's financial year, April to March: "2026-27". */
export function financialYear(date: Date): string {
  const ist = new Date(date.getTime() + 330 * 60_000);
  const year = ist.getUTCMonth() >= 3 ? ist.getUTCFullYear() : ist.getUTCFullYear() - 1;
  return `${year}-${String((year + 1) % 100).padStart(2, "0")}`;
}

const GEOFENCE_METERS = 200;

/** Job execution (plan Phase 7): arrival, OTP, completion, tracking, cancellations, reviews, invoices. */
export function createJobs({ push, logger, config }: { push: PushService; logger: Logger; config: Config }) {
  /** The assigned professional's job, or 404. */
  async function jobOf(pro: UserDoc, bookingId: string): Promise<BookingDoc> {
    const booking = await Booking.findOne({ _id: bookingId, professionalId: pro._id });
    if (!booking) throw new AppError("NOT_FOUND");
    return booking;
  }

  async function toJobDto(booking: BookingDoc, settings: Settings): Promise<ProJobDto> {
    const plain = booking.toObject();
    const customer = await User.findById(plain.customerId, { name: 1, phone: 1 }).lean();
    const revealed = ["accepted", "arrived", "in_progress"].includes(plain.status);
    const [lng, lat] = plain.address.location.coordinates;
    const attempts = plain.otp?.attempts ?? 0;
    return {
      id: String(plain._id),
      number: plain.number,
      status: plain.status,
      customer: { firstName: customer?.name.split(" ")[0] ?? "", phone: revealed ? (customer?.phone ?? null) : null },
      address: { ...plain.address, location: { lat, lng } },
      items: plain.items.map((item) => ({ ...item })),
      note: plain.note,
      eta: plain.eta ? { minMinutes: plain.eta.min, maxMinutes: plain.eta.max, at: plain.eta.at.toISOString() } : null,
      acceptedAt: plain.acceptedAt?.toISOString() ?? null,
      arrivedAt: plain.arrivedAt?.toISOString() ?? null,
      startedAt: plain.startedAt?.toISOString() ?? null,
      completedAt: plain.completedAt?.toISOString() ?? null,
      expectedDurationMin: plain.items.reduce((sum, item) => sum + item.durationMin, 0),
      earningsPaise: plain.earnings?.netPaise ?? earningsFor(plain).netPaise,
      otpAttemptsLeft: Math.max(0, settings.operations.otpAttempts - attempts),
      otpLocked: Boolean(plain.otp?.lockedAt),
      noShowAvailableAt: plain.arrivedAt ? new Date(plain.arrivedAt.getTime() + settings.operations.noShowWaitMinutes * 60_000).toISOString() : null,
      callAttempts: plain.callAttempts,
      cancellation: plain.cancellation ? { by: plain.cancellation.by, reason: plain.cancellation.reason } : null,
    };
  }

  async function job(pro: UserDoc, bookingId: string): Promise<ProJobDto> {
    const [booking, { settings }] = await Promise.all([jobOf(pro, bookingId), getSettings()]);
    return toJobDto(booking, settings);
  }

  async function jobs(pro: UserDoc): Promise<{ current: ProJobSummaryDto[]; past: ProJobSummaryDto[] }> {
    const bookings = await Booking.find({ professionalId: pro._id }).sort({ acceptedAt: -1 }).limit(50).lean();
    const summary = (booking: (typeof bookings)[number]): ProJobSummaryDto => ({
      id: String(booking._id),
      number: booking.number,
      status: booking.status,
      locality: [booking.address.street, booking.address.city].filter(Boolean).join(", "),
      acceptedAt: booking.acceptedAt?.toISOString() ?? null,
      completedAt: booking.completedAt?.toISOString() ?? null,
      earningsPaise: booking.earnings?.netPaise ?? earningsFor(booking).netPaise,
    });
    const active = ["accepted", "arrived", "in_progress"];
    return { current: bookings.filter((booking) => active.includes(booking.status)).map(summary), past: bookings.filter((booking) => !active.includes(booking.status)).map(summary) };
  }

  /** Frees the professional after a job ends (they stay online if they were). */
  async function release(professionalId: Types.ObjectId, session?: mongoose.ClientSession) {
    await Professional.updateOne(
      { userId: professionalId },
      { $set: { "presence.activeBookingId": null, "presence.state": "available", "presence.since": new Date(), "presence.lastHeartbeatAt": new Date() } },
      { session },
    );
  }

  // ---------- the professional's steps ----------

  /** "I've arrived" (plan A8): a soft geofence; further than 200 m asks them to confirm. */
  async function arrived(pro: UserDoc, bookingId: string, location: LocationFix | undefined, confirmFar: boolean): Promise<ProJobDto> {
    const booking = await jobOf(pro, bookingId);
    if (booking.status !== "accepted") throw new AppError("BOOKING_STATE");
    if (location && !confirmFar) {
      const [lng, lat] = booking.address.location.coordinates;
      const away = distanceMeters({ lat, lng }, location);
      if (away > GEOFENCE_METERS) throw new AppError("CONFIRM_REQUIRED", { detail: `far:${Math.round(away)}` });
    }
    const updated = await transition(booking._id, "accepted", "arrived", "professional", { arrivedAt: new Date() });
    if (!updated) throw new AppError("BOOKING_STATE");
    return toJobDto(updated, (await getSettings()).settings);
  }

  /** The customer's code starts the service (plan W8); five wrong tries lock it and alert the team. */
  async function start(pro: UserDoc, bookingId: string, otp: string): Promise<ProJobDto> {
    const { settings } = await getSettings();
    const booking = await jobOf(pro, bookingId);
    if (booking.status !== "arrived") throw new AppError("BOOKING_STATE");
    if (!booking.otp) throw new AppError("BOOKING_STATE", { detail: "no otp" });
    if (booking.otp.lockedAt) throw new AppError("OTP_LOCKED");

    if (!otpMatches(String(booking._id), booking.otp.hash, otp)) {
      const attempts = booking.otp.attempts + 1;
      const locked = attempts >= settings.operations.otpAttempts;
      await Booking.updateOne({ _id: booking._id }, { $set: { "otp.attempts": attempts, ...(locked ? { "otp.lockedAt": new Date() } : {}) } });
      if (locked) {
        await raiseAlert("otp_locked", booking._id, `${booking.number}: the start code was entered wrong ${attempts} times.`);
        throw new AppError("OTP_LOCKED");
      }
      throw new AppError("OTP_INVALID", { fields: { otp: "validation.otpWrong" }, detail: `attempts ${attempts}` });
    }
    const updated = await transition(booking._id, "arrived", "in_progress", "professional", { startedAt: new Date() });
    if (!updated) throw new AppError("BOOKING_STATE");
    return toJobDto(updated, settings);
  }

  /** Done (plan W8): earnings, invoice number, the professional free again, receipt email. */
  async function complete(pro: UserDoc, bookingId: string, confirmEarly: boolean): Promise<ProJobDto> {
    const { settings } = await getSettings();
    const booking = await jobOf(pro, bookingId);
    if (booking.status !== "in_progress" || !booking.startedAt) throw new AppError("BOOKING_STATE");
    const expectedMs = booking.items.reduce((sum, item) => sum + item.durationMin, 0) * 60_000;
    if (!confirmEarly && Date.now() - booking.startedAt.getTime() < expectedMs / 2) throw new AppError("CONFIRM_REQUIRED", { detail: "early" });

    const now = new Date();
    const fy = financialYear(now);
    const earnings = earningsFor(booking);
    let done: BookingDoc | null = null;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const invoiceNumber = `INV/${fy}/${String(await nextSequence(`invoice:${fy}`, session)).padStart(6, "0")}`;
        done = await transition(booking._id, "in_progress", "completed", "professional", { completedAt: now, invoiceNumber, earnings: { ...earnings, payoutStatus: "pending", paidAt: null } }, session);
        if (!done) throw new AppError("BOOKING_STATE");
        const today = new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
        const profile = await Professional.findOne({ userId: pro._id }, { stats: 1 }).session(session).lean();
        const jobsToday = profile?.stats.jobsTodayDate === today ? profile.stats.jobsToday + 1 : 1;
        await Professional.updateOne(
          { userId: pro._id },
          {
            $set: {
              "presence.activeBookingId": null,
              "presence.state": "available",
              "presence.since": now,
              "presence.lastHeartbeatAt": now,
              "stats.jobsToday": jobsToday,
              "stats.jobsTodayDate": today,
              "stats.lastCompletedAt": now,
            },
          },
          { session },
        );
        await queueBookingEmail("booking_completed", booking._id, session);
      });
    } finally {
      await session.endSession();
    }
    const completed = done as BookingDoc | null;
    if (!completed) throw new AppError("BOOKING_STATE");
    announce(completed);
    return toJobDto(completed, settings);
  }

  async function logCall(pro: UserDoc, bookingId: string): Promise<void> {
    const booking = await jobOf(pro, bookingId);
    if (!["accepted", "arrived"].includes(booking.status)) throw new AppError("BOOKING_STATE");
    await Booking.updateOne({ _id: booking._id }, { $inc: { callAttempts: 1 } });
  }

  /**
   * "Customer not reachable" (plan A8): after the wait, with at least two calls logged. The
   * booking is cancelled with the no-show fee; the rest is refunded.
   */
  async function customerUnavailable(pro: UserDoc, bookingId: string): Promise<ProJobDto> {
    const { settings } = await getSettings();
    const booking = await jobOf(pro, bookingId);
    if (booking.status !== "arrived" || !booking.arrivedAt) throw new AppError("BOOKING_STATE");
    if (Date.now() < booking.arrivedAt.getTime() + settings.operations.noShowWaitMinutes * 60_000 || booking.callAttempts < 2) throw new AppError("BOOKING_STATE", { detail: "wait or calls" });
    const fee = Math.min(settings.fees.noShowPaise, booking.pricing.totalPaise);
    const ended = await cancelBooking(booking, "professional", "customer_unavailable", fee, ["arrived"]);
    return toJobDto(ended, settings);
  }

  /**
   * The professional can't make it (plan A8): the booking goes back to searching with a fresh
   * deadline, they're excluded, and the team is told.
   */
  async function proCancel(pro: UserDoc, bookingId: string, reason: string): Promise<void> {
    const booking = await jobOf(pro, bookingId);
    await reopen(booking, pro._id, "professional", `${booking.number}: ${pro.name} cancelled (${reason}). Searching again.`);
    await Professional.updateOne({ userId: pro._id }, { $inc: { "stats.cancellations": 1 } });
    logger.warn({ bookingId: String(booking._id), professionalId: String(pro._id), reason }, "professional cancelled a job");
  }

  /**
   * Plan W14 "reassign": the team takes an accepted job back from its professional; the booking
   * searches again without them. They're told on their panel and by push.
   */
  async function adminReassign(bookingId: string): Promise<BookingDoc> {
    const booking = await Booking.findById(bookingId);
    if (!booking || !booking.professionalId) throw new AppError("BOOKING_STATE");
    const professionalId = booking.professionalId;
    const again = await reopen(booking, professionalId, "admin", null);
    realtime.toUser(professionalId, RT.bookingUpdated, { bookingId: String(booking._id), status: "searching", version: again.version });
    const pro = await User.findById(professionalId, { locale: 1 }).lean();
    const hindi = (pro?.locale ?? "hi") === "hi";
    await push
      .sendToUser(professionalId, {
        kind: "job-update",
        title: hindi ? "काम वापस ले लिया गया" : "Job reassigned",
        body: hindi ? `टीम ने ${booking.number} किसी और को दे दिया है। आप नए काम के लिए ख़ाली हैं।` : `The team has handed ${booking.number} to someone else. You're free for new jobs.`,
        url: "/pro",
        tag: `job:${String(booking._id)}`,
      }, { ttlSeconds: 15 * 60, urgency: "high" })
      .catch((error: unknown) => logger.warn({ err: error }, "reassign push failed"));
    return again;
  }

  /** Back to searching with a fresh deadline; the professional is released and excluded from the next rounds. */
  async function reopen(booking: BookingDoc, excludedProId: Types.ObjectId, by: Actor, alert: string | null): Promise<BookingDoc> {
    if (booking.status !== "accepted" && booking.status !== "arrived") throw new AppError("BOOKING_STATE");
    const { settings } = await getSettings();
    const now = new Date();
    let reopened: BookingDoc | null = null;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        reopened = await transition(
          booking._id,
          ["accepted", "arrived"],
          "searching",
          by,
          {
            professionalId: null,
            acceptedAt: null,
            arrivedAt: null,
            otp: null,
            eta: null,
            tracking: null,
            callAttempts: 0,
            search: {
              round: booking.search?.round ?? 0,
              startedAt: now,
              deadlineAt: new Date(now.getTime() + settings.matching.searchTimeoutSeconds * 1000),
              offeredUserIds: [...(booking.search?.offeredUserIds ?? []), excludedProId],
              nextRoundAt: now,
            },
          },
          session,
        );
        if (!reopened) throw new AppError("BOOKING_STATE");
        await release(excludedProId, session);
        if (alert) await raiseAlert("pro_cancelled", booking._id, alert, session);
      });
    } finally {
      await session.endSession();
    }
    const again = reopened as BookingDoc | null;
    if (!again) throw new AppError("BOOKING_STATE");
    announce(again, true);
    return again;
  }

  // ---------- tracking (plan C8, W7) ----------

  const lastWrite = new Map<string, number>();
  const lastPing = new Map<string, number>();

  /**
   * Location while on the way or arrived: shown to the customer at once, written to the
   * booking every 30 s and to the trail once a minute. Fixes worse than 100 m are ignored.
   */
  async function updateLocation(pro: UserDoc, bookingId: string, location: LocationFix, heading: number | null): Promise<{ accepted: boolean }> {
    if (location.accuracy > 100) return { accepted: false };
    const booking = await Booking.findOne({ _id: bookingId, professionalId: pro._id, status: { $in: ["accepted", "arrived"] } }, { _id: 1, address: 1, eta: 1, acceptedAt: 1, status: 1 }).lean();
    if (!booking) throw new AppError("NOT_FOUND");
    const now = Date.now();
    const at = new Date(now);
    realtime.toBooking(booking._id, RT.bookingLocation, { bookingId, lat: location.lat, lng: location.lng, heading, at: at.toISOString() });

    const key = String(booking._id);
    if (now - (lastWrite.get(key) ?? 0) >= 30_000) {
      lastWrite.set(key, now);
      const [lng, lat] = booking.address.location.coordinates;
      const remaining = distanceMeters({ lat, lng }, location);
      // Without the Routes API (no key yet), the estimate is refreshed from the straight-line distance every 3 minutes.
      const refresh = booking.status === "accepted" && (!booking.eta || now - booking.eta.at.getTime() >= 3 * 60_000);
      const eta = refresh ? etaRange(remaining) : null;
      await Booking.updateOne(
        { _id: booking._id },
        { $set: { tracking: { point: toPoint(location.lat, location.lng), heading, at }, ...(eta ? { eta: { min: Math.max(1, eta.min - 3), max: eta.max - 3, at, source: "estimate" } } : {}) } },
      );
      await Professional.updateOne({ userId: pro._id }, { $set: { "presence.location": toPoint(location.lat, location.lng), "presence.locationAt": at, "presence.lastHeartbeatAt": at } });
    }
    if (now - (lastPing.get(key) ?? 0) >= 60_000) {
      lastPing.set(key, now);
      await LocationPing.create({ bookingId: booking._id, professionalId: pro._id, point: toPoint(location.lat, location.lng), at });
    }
    return { accepted: true };
  }

  // ---------- the customer's side ----------

  /** Plan D3: free while searching or if the professional is late; a fee once someone is on the way. */
  async function cancelPreview(booking: BookingDoc): Promise<CancelPreviewDto> {
    const { settings } = await getSettings();
    const total = booking.pricing.totalPaise;
    switch (booking.status) {
      case "awaiting_payment":
        return { allowed: true, feePaise: 0, refundPaise: 0, basis: "unpaid" };
      case "searching":
        return { allowed: true, feePaise: settings.fees.cancelWhileSearchingPaise, refundPaise: total - settings.fees.cancelWhileSearchingPaise, basis: "searching" };
      case "accepted":
      case "arrived": {
        if (isLate(booking, settings)) return { allowed: true, feePaise: 0, refundPaise: total, basis: "professional_late" };
        const fee = Math.min(settings.fees.cancelAfterAcceptPaise, total);
        return { allowed: true, feePaise: fee, refundPaise: total - fee, basis: "after_accept" };
      }
      default:
        return { allowed: false, feePaise: 0, refundPaise: 0, basis: "not_allowed" };
    }
  }

  function isLate(booking: Pick<BookingDoc, "status" | "acceptedAt" | "eta" | "lateAlertAt">, settings: Settings): boolean {
    if (booking.status !== "accepted" || !booking.acceptedAt || !booking.eta || !settings.fees.freeCancelWhenProfessionalLate) return false;
    return Date.now() > booking.acceptedAt.getTime() + (booking.eta.max + settings.operations.lateThresholdMinutes) * 60_000;
  }

  /** One cancellation path for everyone: state, fee, refund, offers, the professional, emails. */
  async function cancelBooking(booking: BookingDoc, by: Actor, reason: string, feePaise: number, from: Array<BookingDoc["status"]>): Promise<BookingDoc> {
    const paid = Boolean(await Payment.exists({ bookingId: booking._id, status: { $in: ["captured", "refunded"] } }));
    let ended: BookingDoc | null = null;
    // Professionals still looking at the job alert: told below, so it stops ringing.
    let withdrawn: Array<Pick<OfferDoc, "_id" | "professionalId" | "bookingId">> = [];
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        ended = await transition(booking._id, from, "cancelled", by, { cancellation: { by, reason, feePaise: paid ? feePaise : 0, at: new Date() }, "search.nextRoundAt": null, paymentExpiresAt: null }, session);
        if (!ended) throw new AppError("BOOKING_STATE");
        if (paid) await requestRefund({ bookingId: booking._id, amountPaise: booking.pricing.totalPaise - feePaise, reason: `cancel_${by}`, initiatedBy: by === "admin" ? "admin" : by === "customer" ? "customer" : "system" }, session);
        if (booking.professionalId) await release(booking.professionalId, session);
        withdrawn = await Offer.find({ bookingId: booking._id, status: "pending" }, { professionalId: 1, bookingId: 1 }).session(session).lean();
        await Offer.updateMany({ bookingId: booking._id, status: "pending" }, { $set: { status: "revoked", respondedAt: new Date() } }, { session });
        if (paid) await queueBookingEmail("booking_cancelled", booking._id, session);
      });
    } finally {
      await session.endSession();
    }
    if (!(ended as BookingDoc | null)) throw new AppError("BOOKING_STATE");
    // Re-read: the refund was linked to the booking after the status changed.
    const cancelled = await Booking.findById(booking._id);
    if (!cancelled) throw new AppError("NOT_FOUND");
    announce(cancelled);
    await notifyOffersClosed(push, withdrawn, "revoked");
    if (booking.professionalId && by !== "professional") {
      const pro = await User.findById(booking.professionalId, { locale: 1 }).lean();
      const hi = pro?.locale !== "en";
      await push
        .sendToUser(booking.professionalId, { kind: "job-cancelled", title: hi ? "बुकिंग रद्द हो गई" : "Booking cancelled", body: hi ? `${booking.number} रद्द कर दी गई है।` : `${booking.number} was cancelled.`, url: "/pro", tag: `job:${String(booking._id)}` }, { ttlSeconds: 600, urgency: "high" })
        .catch(() => undefined);
    }
    return cancelled;
  }

  async function customerCancel(customer: UserDoc, bookingId: string, reason: string): Promise<BookingDoc> {
    const booking = await Booking.findOne({ _id: bookingId, customerId: customer._id });
    if (!booking) throw new AppError("NOT_FOUND");
    const preview = await cancelPreview(booking);
    if (!preview.allowed) throw new AppError("BOOKING_STATE");
    return cancelBooking(booking, "customer", reason, preview.feePaise, ["awaiting_payment", "searching", "accepted", "arrived"]);
  }

  /** Admin cancel (plan W14): any active booking, with a chosen refund. */
  async function adminCancel(bookingId: string, reason: string, feePaise: number): Promise<BookingDoc> {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new AppError("NOT_FOUND");
    return cancelBooking(booking, "admin", reason, Math.min(Math.max(0, feePaise), booking.pricing.totalPaise), ["awaiting_payment", "searching", "accepted", "arrived", "in_progress"]);
  }

  /** One rating per completed booking (plan W9); the professional's average updates. */
  async function review(customer: UserDoc, bookingId: string, rating: number, comment: string): Promise<void> {
    const booking = await Booking.findOneAndUpdate(
      { _id: bookingId, customerId: customer._id, status: "completed", review: null },
      { $set: { review: { rating, comment, at: new Date(), hidden: false } } },
      { returnDocument: "after" },
    );
    if (!booking) {
      const existing = await Booking.findOne({ _id: bookingId, customerId: customer._id }, { status: 1, review: 1 }).lean();
      if (!existing) throw new AppError("NOT_FOUND");
      throw new AppError(existing.review ? "REVIEW_EXISTS" : "BOOKING_STATE");
    }
    if (booking.professionalId) {
      const profile = await Professional.findOne({ userId: booking.professionalId }, { stats: 1 }).lean();
      const count = (profile?.stats.ratingCount ?? 0) + 1;
      const average = ((profile?.stats.rating ?? 0) * (count - 1) + rating) / count;
      await Professional.updateOne({ userId: booking.professionalId }, { $set: { "stats.rating": Math.round(average * 100) / 100, "stats.ratingCount": count } });
    }
  }

  /** The tax invoice (plan C9). Seller details come from config until the CA confirms them (A1). */
  async function invoice(viewer: { role: string; id: Types.ObjectId }, bookingId: string): Promise<InvoiceDto> {
    const booking = await Booking.findById(bookingId);
    if (!booking || (viewer.role === "customer" && !booking.customerId.equals(viewer.id)) || viewer.role === "professional") throw new AppError("NOT_FOUND");
    if (booking.status !== "completed" || !booking.invoiceNumber || !booking.completedAt) throw new AppError("BOOKING_STATE");
    const [customer, payment] = await Promise.all([User.findById(booking.customerId, { name: 1, phone: 1 }).lean(), Payment.findOne({ bookingId: booking._id, status: { $in: ["captured", "refunded"] } }).lean()]);
    const rate = booking.pricing.gstRateBps;
    // Inclusive prices: each line's GST is taken out of its price (plan A2).
    const split = (total: number) => {
      const taxable = Math.floor((2 * total * 10_000 + (10_000 + rate)) / (2 * (10_000 + rate)));
      return { taxablePaise: taxable, gstPaise: total - taxable, totalPaise: total };
    };
    const lines = [
      ...booking.items.map((item) => ({ description: `${item.name.en}${item.tierCount > 1 ? ` (${item.tierLabel.en})` : ""}`, sac: "999722", quantity: item.quantity, ...split(item.linePaise) })),
      ...(booking.pricing.platformFeePaise > 0 ? [{ description: "Platform fee", sac: "998599", quantity: 1, ...split(booking.pricing.platformFeePaise) }] : []),
    ];
    const address = booking.address;
    return {
      number: booking.invoiceNumber,
      issuedAt: booking.completedAt.toISOString(),
      bookingNumber: booking.number,
      seller: { name: config.SELLER_NAME, address: config.SELLER_ADDRESS, gstin: config.SELLER_GSTIN, phone: config.SUPPORT_PHONE, email: config.SUPPORT_EMAIL },
      buyer: { name: customer?.name ?? "", address: [address.house, address.building, address.street, address.city, address.pincode].filter(Boolean).join(", "), phone: customer?.phone ?? "" },
      lines,
      taxablePaise: lines.reduce((sum, line) => sum + line.taxablePaise, 0),
      gstRateBps: rate,
      gstPaise: lines.reduce((sum, line) => sum + line.gstPaise, 0),
      totalPaise: booking.pricing.totalPaise,
      paymentId: payment?.paymentId ?? null,
    };
  }

  async function earnings(pro: UserDoc): Promise<ProEarningsDto> {
    const now = new Date();
    const istNow = new Date(now.getTime() + 330 * 60_000);
    const startOfDay = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate()) - 330 * 60_000);
    const weekday = (istNow.getUTCDay() + 6) % 7; // Monday = 0
    const startOfWeek = new Date(startOfDay.getTime() - weekday * 24 * 60 * 60_000);
    const done = await Booking.find({ professionalId: pro._id, status: "completed" }).sort({ completedAt: -1 }).limit(100).lean();
    const sum = (since: Date) => done.filter((booking) => (booking.completedAt?.getTime() ?? 0) >= since.getTime()).reduce((total, booking) => total + (booking.earnings?.netPaise ?? 0), 0);
    return {
      todayPaise: sum(startOfDay),
      weekPaise: sum(startOfWeek),
      pendingPayoutPaise: done.filter((booking) => booking.earnings?.payoutStatus === "pending").reduce((total, booking) => total + (booking.earnings?.netPaise ?? 0), 0),
      jobs: done.map((booking) => ({
        id: String(booking._id),
        number: booking.number,
        completedAt: booking.completedAt?.toISOString() ?? "",
        grossPaise: booking.earnings?.grossPaise ?? 0,
        commissionPaise: booking.earnings?.commissionPaise ?? 0,
        netPaise: booking.earnings?.netPaise ?? 0,
        payoutStatus: booking.earnings?.payoutStatus ?? "pending",
      })),
    };
  }

  /** The sweeper's job duties (plan A8): a late professional alerts the team once. */
  async function sweep(now = new Date()): Promise<void> {
    const { settings } = await getSettings();
    const enRoute = await Booking.find({ status: "accepted", lateAlertAt: null, acceptedAt: { $ne: null } }, { number: 1, acceptedAt: 1, eta: 1, status: 1, lateAlertAt: 1 });
    for (const booking of enRoute) {
      if (!isLate(booking, settings)) continue;
      const marked = await Booking.updateOne({ _id: booking._id, lateAlertAt: null }, { $set: { lateAlertAt: now } });
      if (marked.modifiedCount) {
        await raiseAlert("late", booking._id, `${booking.number}: the professional hasn't arrived ${settings.operations.lateThresholdMinutes} minutes after the estimate. The customer can cancel free.`);
        const fresh = await Booking.findById(booking._id);
        if (fresh) announce(fresh);
      }
    }
  }

  return { job, jobs, arrived, start, complete, logCall, customerUnavailable, proCancel, adminReassign, updateLocation, cancelPreview, customerCancel, adminCancel, review, invoice, earnings, sweep };
}

export type Jobs = ReturnType<typeof createJobs>;
