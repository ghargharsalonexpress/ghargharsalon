import { type DeclineReason, type Language, type OfferDto, type PushPayload, RT, type Settings } from "@brand/shared";
import mongoose, { type Types } from "mongoose";
import { AppError } from "../../errors";
import type { Logger } from "../../logger";
import { findEligible, type EligibleProfessional } from "../availability/availability.service";
import { etaRange } from "../availability/geo";
import { Booking, type BookingDoc } from "../bookings/booking.model";
import { announce, bookingEvents, transition } from "../bookings/lifecycle";
import { newOtp } from "../bookings/otp";
import { queueBookingEmail, raiseAlert } from "../notifications/notifications";
import { requestRefund } from "../payments/payments.service";
import { Professional } from "../professionals/professional.model";
import type { PushService } from "../professionals/push";
import { realtime } from "../realtime/realtime";
import { getSettings } from "../settings/settings.service";
import { User, type UserDoc } from "../users/user.model";
import { notifyOffersClosed } from "./closed";
import { Offer, type OfferDoc } from "./offer.model";

/** What the professional earns on a booking: services after commission; the platform fee stays with us (plan A4, D5). */
export function earningsFor(booking: Pick<BookingDoc, "pricing">): { grossPaise: number; commissionPaise: number; netPaise: number } {
  const grossPaise = booking.pricing.itemsPaise;
  const commissionPaise = Math.round((grossPaise * booking.pricing.commissionBps) / 10_000);
  return { grossPaise, commissionPaise, netPaise: grossPaise - commissionPaise };
}

/**
 * Ranking (plan C6): nearest first in 500 m bands, then better rated, then fewer jobs today,
 * then whoever finished a job longest ago, so work spreads fairly.
 */
export function rank(candidates: EligibleProfessional[]): EligibleProfessional[] {
  return [...candidates].sort(
    (a, b) =>
      Math.floor(a.distance / 500) - Math.floor(b.distance / 500) ||
      (b.rating ?? 4.5) - (a.rating ?? 4.5) ||
      a.jobsToday - b.jobsToday ||
      (a.lastCompletedAt?.getTime() ?? 0) - (b.lastCompletedAt?.getTime() ?? 0),
  );
}

export function toOfferDto(offer: OfferDoc | (OfferDoc & { toObject?: unknown }), booking: Pick<BookingDoc, "_id" | "number" | "address" | "items">): OfferDto {
  return {
    id: String(offer._id),
    status: offer.status,
    sentAt: offer.sentAt.toISOString(),
    expiresAt: offer.expiresAt.toISOString(),
    bookingId: String(booking._id),
    bookingNumber: booking.number,
    locality: [booking.address.street, booking.address.city].filter(Boolean).join(", "),
    distanceMeters: offer.distanceMeters,
    etaMinutes: { min: offer.etaMin, max: offer.etaMax },
    items: booking.items.map((item) => ({ name: item.name, tierLabel: item.tierLabel, tierCount: item.tierCount, quantity: item.quantity })),
    totalDurationMin: booking.items.reduce((sum, item) => sum + item.durationMin, 0),
    earningsPaise: offer.earningsPaise,
    direct: offer.round === 0,
  };
}

const rupees = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);

function offerPush(offer: OfferDoc, booking: BookingDoc, lang: Language): PushPayload {
  const names = booking.items.map((item) => (lang === "hi" && item.name.hi ? item.name.hi : item.name.en));
  const what = names.length > 1 ? `${names[0]} +${names.length - 1}` : (names[0] ?? "");
  const km = (offer.distanceMeters / 1000).toFixed(1);
  return {
    kind: "offer",
    title: lang === "hi" ? `नया काम · ${rupees(offer.earningsPaise)}` : `New job · ${rupees(offer.earningsPaise)}`,
    body: `${booking.address.street} · ${km} km · ${what}`,
    url: `/pro/offers/${String(offer._id)}`,
    tag: `offer:${String(booking._id)}`,
    requireInteraction: true,
    expiresAt: offer.expiresAt.getTime(),
    actions: [{ action: "accept", title: lang === "hi" ? "स्वीकार करें" : "Accept" }],
    actionUrls: { accept: `/pro/offers/${String(offer._id)}?intent=accept` },
  };
}

/** The matching engine (plan C6, C7, W5/W6). */
export function createMatching({ push, logger }: { push: PushService; logger: Logger }) {
  async function notifyNewOffer(offer: OfferDoc, booking: BookingDoc, settings: Settings): Promise<void> {
    realtime.toUser(offer.professionalId, RT.offerNew, toOfferDto(offer, booking));
    const pro = await User.findById(offer.professionalId, { locale: 1 }).lean();
    const result = await push.sendToUser(offer.professionalId, offerPush(offer, booking, pro?.locale ?? "hi"), {
      ttlSeconds: settings.matching.acceptWindowSeconds,
      urgency: "high",
    });
    await Offer.updateOne({ _id: offer._id }, { $set: { pushSent: result.sent } });
  }

  const notifyClosed = (offers: Array<Pick<OfferDoc, "_id" | "professionalId" | "bookingId">>, reason: "taken" | "revoked" | "expired") => notifyOffersClosed(push, offers, reason);

  /** Sends the next round of offers (plan C6), or ends the search when the time is up. */
  async function startRound(bookingId: Types.ObjectId | string): Promise<void> {
    const booking = await Booking.findById(bookingId);
    if (!booking || booking.status !== "searching" || !booking.search) return;
    const now = new Date();
    if (booking.search.deadlineAt <= now) return noMatch(booking._id);
    if ((await Offer.countDocuments({ bookingId: booking._id, status: "pending", expiresAt: { $gt: now } })) > 0) return;

    const { settings } = await getSettings();
    const [lng, lat] = booking.address.location.coordinates;
    const eligible = await findEligible({ location: { lat, lng }, skills: booking.skills, preference: booking.preference, settings, exclude: booking.search.offeredUserIds, limit: 20 });
    const picked = rank(eligible).slice(0, Math.min(settings.matching.offersPerRound, 5));
    if (picked.length === 0) {
      // Nobody new right now: look again in 10 s, until the deadline.
      await Booking.updateOne({ _id: booking._id, status: "searching" }, { $set: { "search.nextRoundAt": new Date(now.getTime() + 10_000) } });
      return;
    }

    const expiresAt = new Date(now.getTime() + settings.matching.acceptWindowSeconds * 1000);
    // Claim this round so overlapping sweeps can't send it twice.
    const claimed = await Booking.findOneAndUpdate(
      { _id: booking._id, status: "searching", "search.round": booking.search.round },
      { $inc: { "search.round": 1 }, $addToSet: { "search.offeredUserIds": { $each: picked.map((pro) => pro.userId) } }, $set: { "search.nextRoundAt": expiresAt } },
      { returnDocument: "after" },
    );
    if (!claimed?.search) return;

    const earnings = earningsFor(booking).netPaise;
    const offers = await Offer.insertMany(
      picked.map((pro) => {
        const eta = etaRange(pro.distance);
        return { bookingId: booking._id, professionalId: pro.userId, round: claimed.search?.round ?? 1, status: "pending", sentAt: now, expiresAt, distanceMeters: Math.round(pro.distance), etaMin: eta.min, etaMax: eta.max, earningsPaise: earnings };
      }),
    );
    await Professional.updateMany({ userId: { $in: picked.map((pro) => pro.userId) } }, { $inc: { "stats.offers": 1 } });
    logger.info({ bookingId: String(booking._id), round: claimed.search.round, offered: offers.length }, "offers sent");
    await Promise.all(offers.map((offer) => notifyNewOffer(offer, claimed, settings).catch((error: unknown) => logger.warn({ err: error }, "offer notification failed"))));
  }

  /** Time's up with no accept: full refund, customer email, admin alert (plan W5/W6). */
  async function noMatch(bookingId: Types.ObjectId): Promise<void> {
    const { settings } = await getSettings();
    let ended: BookingDoc | null = null;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        ended = await transition(bookingId, "searching", "no_professional_found", "system", { "search.nextRoundAt": null }, session);
        if (!ended) return;
        await requestRefund({ bookingId, amountPaise: ended.pricing.totalPaise, reason: "no_match", initiatedBy: "system" }, session);
        await queueBookingEmail("no_professional", bookingId, session);
        await raiseAlert("no_match", bookingId, `${ended.number}: no professional accepted within ${settings.matching.searchTimeoutSeconds} seconds. Full refund started.`, session);
      });
    } finally {
      await session.endSession();
    }
    if (!ended) return;
    announce(ended);
    const pending = await Offer.find({ bookingId, status: "pending" }, { professionalId: 1, bookingId: 1 }).lean();
    await Offer.updateMany({ bookingId, status: "pending" }, { $set: { status: "revoked", respondedAt: new Date() } });
    await notifyClosed(pending, "revoked");
  }

  /** The sweeper's matching duties (plan C7), every 2 seconds. */
  async function sweep(now = new Date()): Promise<void> {
    const due = await Offer.find({ status: "pending", expiresAt: { $lte: now } }, { professionalId: 1, bookingId: 1 }).lean();
    if (due.length) {
      await Offer.updateMany({ _id: { $in: due.map((offer) => offer._id) }, status: "pending" }, { $set: { status: "expired" } });
      await notifyClosed(due, "expired");
    }
    for (const { _id } of await Booking.find({ status: "searching", "search.deadlineAt": { $lte: now } }, { _id: 1 }).lean()) await noMatch(_id);
    for (const { _id } of await Booking.find({ status: "searching", "search.nextRoundAt": { $lte: now } }, { _id: 1 }).lean()) await startRound(_id);

    // Plan W14: tell the team about a search running long, while there's still time to help.
    const slow = await Booking.find({ status: "searching", "search.startedAt": { $lte: new Date(now.getTime() - 90_000) } }, { number: 1 }).lean();
    for (const booking of slow) await raiseAlert("slow_search", booking._id, `${booking.number} has been searching for over 90 seconds.`);
  }

  /** First accept wins (plan C6): one transaction claims the professional and the booking. */
  async function accept(pro: UserDoc, offerId: string): Promise<BookingDoc> {
    const now = new Date();
    let booking: BookingDoc | null = null;
    let alreadyMine = false;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        alreadyMine = false;
        const offer = await Offer.findOne({ _id: offerId, professionalId: pro._id }).session(session);
        if (!offer) throw new AppError("NOT_FOUND");
        if (offer.status === "accepted") {
          alreadyMine = true;
          return;
        }
        if (offer.status === "revoked") throw new AppError("OFFER_TAKEN");
        if (offer.status !== "pending" || offer.expiresAt <= now) throw new AppError("OFFER_EXPIRED");

        const claimed = await Professional.updateOne(
          { userId: pro._id, "presence.activeBookingId": null, "presence.state": { $in: ["available", "stale"] } },
          { $set: { "presence.activeBookingId": offer.bookingId, "presence.state": "busy", "presence.since": now }, $inc: { "stats.accepted": 1 } },
          { session },
        );
        if (claimed.modifiedCount === 0) throw new AppError("PRO_BUSY");

        booking = await transition(
          offer.bookingId,
          "searching",
          "accepted",
          "professional",
          { professionalId: pro._id, acceptedAt: now, otp: newOtp(String(offer.bookingId)), eta: { min: offer.etaMin, max: offer.etaMax, at: now, source: "estimate" }, "search.nextRoundAt": null },
          session,
        );
        if (!booking) throw new AppError("OFFER_TAKEN");
        offer.status = "accepted";
        offer.respondedAt = now;
        await offer.save({ session });
        await Offer.updateMany({ bookingId: offer.bookingId, status: "pending", _id: { $ne: offer._id } }, { $set: { status: "revoked", respondedAt: now } }, { session });
        await queueBookingEmail("booking_confirmed", offer.bookingId, session);
      });
    } finally {
      await session.endSession();
    }

    if (alreadyMine) {
      const offer = await Offer.findById(offerId).lean();
      const mine = offer && (await Booking.findById(offer.bookingId));
      if (!mine) throw new AppError("NOT_FOUND");
      return mine;
    }
    const accepted = booking as BookingDoc | null;
    if (!accepted) throw new AppError("OFFER_TAKEN");
    announce(accepted);
    const others = await Offer.find({ bookingId: accepted._id, status: "revoked", respondedAt: now }, { professionalId: 1, bookingId: 1 }).lean();
    await notifyClosed(others, "taken");
    logger.info({ bookingId: String(accepted._id), professionalId: String(pro._id) }, "offer accepted");
    return accepted;
  }

  async function decline(pro: UserDoc, offerId: string, reason: DeclineReason | undefined): Promise<void> {
    const offer = await Offer.findOneAndUpdate(
      { _id: offerId, professionalId: pro._id, status: "pending" },
      { $set: { status: "declined", respondedAt: new Date(), declineReason: reason ?? null } },
      { returnDocument: "after" },
    ).lean();
    if (!offer) return;
    // Everyone in the round said no: the next round starts now, not when the window ends.
    if ((await Offer.countDocuments({ bookingId: offer.bookingId, status: "pending" })) === 0) {
      await Booking.updateOne({ _id: offer.bookingId, status: "searching" }, { $set: { "search.nextRoundAt": new Date() } });
      await startRound(offer.bookingId);
    }
  }

  /** Plan W14: an admin offers a searching booking straight to a chosen professional. */
  async function directOffer(bookingId: string, professionalUserId: string): Promise<OfferDto> {
    const booking = await Booking.findById(bookingId);
    if (!booking || booking.status !== "searching") throw new AppError("BOOKING_STATE");
    const { settings } = await getSettings();
    const [lng, lat] = booking.address.location.coordinates;
    const eligible = await findEligible({ location: { lat, lng }, skills: booking.skills, preference: "any", settings, limit: 50 });
    const pro = eligible.find((candidate) => String(candidate.userId) === professionalUserId);
    if (!pro) throw new AppError("NO_PROFESSIONALS", { detail: "not eligible for this booking" });
    const now = new Date();
    const eta = etaRange(pro.distance);
    const offer = await Offer.findOneAndUpdate(
      { bookingId: booking._id, professionalId: pro.userId },
      {
        $set: { round: 0, status: "pending", sentAt: now, expiresAt: new Date(now.getTime() + settings.matching.acceptWindowSeconds * 1000), respondedAt: null, declineReason: null, distanceMeters: Math.round(pro.distance), etaMin: eta.min, etaMax: eta.max, earningsPaise: earningsFor(booking).netPaise },
      },
      { upsert: true, returnDocument: "after" },
    );
    await Booking.updateOne({ _id: booking._id }, { $addToSet: { "search.offeredUserIds": pro.userId } });
    await notifyNewOffer(offer, booking, settings);
    return toOfferDto(offer, booking);
  }

  async function offerFor(pro: UserDoc, offerId: string): Promise<OfferDto> {
    const offer = await Offer.findOne({ _id: offerId, professionalId: pro._id });
    if (!offer) throw new AppError("NOT_FOUND");
    const booking = await Booking.findById(offer.bookingId);
    if (!booking) throw new AppError("NOT_FOUND");
    if (offer.status === "pending" && offer.expiresAt <= new Date()) offer.status = "expired";
    return toOfferDto(offer, booking);
  }

  async function openOffersFor(pro: UserDoc): Promise<OfferDto[]> {
    const offers = await Offer.find({ professionalId: pro._id, status: "pending", expiresAt: { $gt: new Date() } }).sort({ sentAt: -1 });
    const bookings = new Map((await Booking.find({ _id: { $in: offers.map((offer) => offer.bookingId) } })).map((booking) => [String(booking._id), booking]));
    return offers.flatMap((offer) => {
      const booking = bookings.get(String(offer.bookingId));
      return booking ? [toOfferDto(offer, booking)] : [];
    });
  }

  // Paid (or re-opened): the first round goes out at once instead of waiting for the sweeper.
  bookingEvents.on("searching", (booking) => {
    startRound(booking._id).catch((error: unknown) => logger.error({ err: error, bookingId: String(booking._id) }, "first round failed"));
  });

  return { startRound, noMatch, sweep, accept, decline, directOffer, offerFor, openOffersFor };
}

export type Matching = ReturnType<typeof createMatching>;
