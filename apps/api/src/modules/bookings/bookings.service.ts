import {
  type BookingDto,
  type BookingSummaryDto,
  computeTotals,
  type createBookingSchema,
  REVEAL_STATUSES,
  type Settings,
  type z,
} from "@brand/shared";
import { Types } from "mongoose";
import { AppError } from "../../errors";
import type { Logger } from "../../logger";
import { ownAddress } from "../addresses/addresses";
import { distanceMeters } from "../availability/geo";
import { findEligible, inActiveArea, Quote, skillsFor } from "../availability/availability.service";
import { priceCart } from "../catalog/catalog.service";
import type { PaymentGateway } from "../payments/gateway";
import { Payment, Refund } from "../payments/payment.model";
import { openOrder, toPaymentDto } from "../payments/payments.service";
import { Professional } from "../professionals/professional.model";
import { nextSequence } from "../system/counters";
import { User, type UserDoc } from "../users/user.model";
import { Booking, type BookingDoc, type BookingFields } from "./booking.model";
import { revealOtp } from "./otp";

type CreateInput = z.output<typeof createBookingSchema>;

/** Who is looking decides what they see (plan A7 permissions, ADR-0016). */
export type Viewer = { role: "customer" | "professional" | "admin"; id: Types.ObjectId };

export function assertCanView(booking: Pick<BookingDoc, "customerId" | "professionalId">, viewer: Viewer): void {
  if (viewer.role === "admin") return;
  if (viewer.role === "customer" && booking.customerId.equals(viewer.id)) return;
  if (viewer.role === "professional" && booking.professionalId?.equals(viewer.id)) return;
  throw new AppError("NOT_FOUND");
}

/** A plain copy: a document from a transaction carries its session, which can't be serialised. */
const plain = (booking: BookingDoc): BookingFields & { _id: Types.ObjectId } => (typeof booking.toObject === "function" ? booking.toObject() : booking) as BookingFields & { _id: Types.ObjectId };

export async function toBookingDto(document: BookingDoc, viewer: Viewer, gateway: PaymentGateway): Promise<BookingDto> {
  const booking = plain(document);
  const [payment, refund, pro, proProfile] = await Promise.all([
    Payment.findOne({ bookingId: booking._id }).sort({ createdAt: -1 }).lean(),
    booking.refundId ? Refund.findById(booking.refundId).lean() : null,
    booking.professionalId ? User.findById(booking.professionalId, { name: 1, phone: 1 }).lean() : null,
    booking.professionalId ? Professional.findOne({ userId: booking.professionalId }, { photo: 1, gender: 1, stats: 1 }).lean() : null,
  ]);
  const revealed = REVEAL_STATUSES.includes(booking.status);
  const [lng, lat] = booking.address.location.coordinates;
  const tracking = booking.tracking && (booking.status === "accepted" || booking.status === "arrived") ? booking.tracking : null;

  return {
    id: String(booking._id),
    number: booking.number,
    status: booking.status,
    createdAt: booking.createdAt.toISOString(),
    paymentExpiresAt: booking.paymentExpiresAt?.toISOString() ?? null,
    items: booking.items.map((item) => ({ ...item })),
    pricing: {
      itemsPaise: booking.pricing.itemsPaise,
      platformFeePaise: booking.pricing.platformFeePaise,
      taxablePaise: booking.pricing.taxablePaise,
      gstPaise: booking.pricing.gstPaise,
      totalPaise: booking.pricing.totalPaise,
      gstRateBps: booking.pricing.gstRateBps,
      pricesIncludeGst: booking.pricing.pricesIncludeGst,
    },
    address: { ...booking.address, location: { lat, lng } },
    preference: booking.preference,
    note: booking.note,
    timeline: booking.statusHistory.map((entry) => ({ status: entry.status, at: entry.at.toISOString() })),
    search: booking.status === "searching" && booking.search ? { startedAt: booking.search.startedAt.toISOString(), deadlineAt: booking.search.deadlineAt.toISOString() } : null,
    professional:
      pro && proProfile
        ? {
            id: String(pro._id),
            name: pro.name,
            photo: proProfile.photo,
            gender: proProfile.gender,
            rating: proProfile.stats.rating,
            ratingCount: proProfile.stats.ratingCount,
            phone: revealed || viewer.role === "admin" ? pro.phone : null,
          }
        : null,
    eta: booking.eta && (booking.status === "accepted" || booking.status === "arrived") ? { minMinutes: booking.eta.min, maxMinutes: booking.eta.max, at: booking.eta.at.toISOString() } : null,
    // Only the customer holds the start code, and only until the service starts.
    otp: viewer.role === "customer" && (booking.status === "accepted" || booking.status === "arrived") ? revealOtp(booking) : null,
    tracking: tracking ? { lat: tracking.point.coordinates[1], lng: tracking.point.coordinates[0], heading: tracking.heading, at: tracking.at.toISOString() } : null,
    cancellation: booking.cancellation ? { ...booking.cancellation, at: booking.cancellation.at.toISOString() } : null,
    refund: refund
      ? { amountPaise: refund.amountPaise, status: refund.status === "processed" ? "processed" : refund.status === "failed" ? "failed" : "pending", reason: refund.reason, createdAt: refund.createdAt.toISOString() }
      : null,
    payment: payment && viewer.role !== "professional" ? toPaymentDto(payment, gateway.keyId) : null,
    review: booking.review && !booking.review.hidden ? { rating: booking.review.rating, comment: booking.review.comment } : null,
    invoiceNumber: booking.invoiceNumber,
  };
}

export function toSummaryDto(document: BookingDoc, professionalName: string | null): BookingSummaryDto {
  const booking = plain(document);
  return {
    id: String(booking._id),
    number: booking.number,
    status: booking.status,
    createdAt: booking.createdAt.toISOString(),
    totalPaise: booking.pricing.totalPaise,
    items: booking.items.map((item) => ({ name: item.name, quantity: item.quantity })),
    professionalName,
  };
}

/** Booking numbers: BK-1001, BK-1002… */
const bookingNumber = async () => `BK-${1000 + (await nextSequence("booking"))}`;

/**
 * POST /v1/bookings (plan C9, W4): re-prices from the database, re-checks the quote and that
 * someone is still free, snapshots the address, then opens a payment order.
 */
export async function createBooking(customer: UserDoc, input: CreateInput, settings: Settings, gateway: PaymentGateway, logger: Logger): Promise<BookingDoc> {
  const address = await ownAddress(customer._id, input.addressId);
  const location = { lat: address.location.coordinates[1], lng: address.location.coordinates[0] };
  if (!inActiveArea(location, settings)) throw new AppError("OUTSIDE_AREA");

  // The quote must be this customer's, fresh, and for this place (within 300 m) and preference.
  const quote = await Quote.findById(input.quoteId).lean();
  const fresh = quote && quote.expiresAt.getTime() > Date.now() && (!quote.userId || quote.userId.equals(customer._id));
  if (!quote || !fresh || quote.preference !== input.preference || distanceMeters(quote.location, location) > 300) throw new AppError("QUOTE_EXPIRED");

  const priced = await priceCart(input.lines, settings);
  if (priced.lines.some((line) => line.status === "unavailable")) throw new AppError("CART_UNAVAILABLE");
  if (priced.lines.some((line) => line.status !== "ok")) throw new AppError("PRICE_CHANGED");

  // Someone may have gone busy since the quote (plan W4: "Professionals just got busy").
  const skills = await skillsFor(input.lines);
  const eligible = await findEligible({ location, skills, preference: input.preference, settings, limit: 1 });
  if (eligible.length === 0) throw new AppError("NO_PROFESSIONALS");

  const totals = computeTotals(priced.lines, settings.pricing);
  const now = new Date();
  const booking = await Booking.create({
    number: await bookingNumber(),
    customerId: customer._id,
    items: priced.lines.map((line) => ({
      serviceSlug: line.serviceSlug,
      tierId: line.tierId,
      name: line.name,
      tierLabel: line.tierLabel,
      tierCount: line.tierCount,
      unitPricePaise: line.unitPricePaise,
      quantity: line.quantity,
      linePaise: line.linePaise,
      durationMin: line.durationMin,
    })),
    skills,
    pricing: { ...totals, gstRateBps: settings.pricing.gstRateBps, pricesIncludeGst: settings.pricing.pricesIncludeGst, commissionBps: settings.pricing.commissionBps },
    address: {
      label: address.label,
      house: address.house,
      building: address.building,
      street: address.street,
      landmark: address.landmark,
      city: address.city,
      pincode: address.pincode,
      location: address.location,
    },
    preference: input.preference,
    note: input.note ?? "",
    status: "awaiting_payment",
    statusHistory: [{ status: "awaiting_payment", at: now, by: "customer" }],
    paymentExpiresAt: new Date(now.getTime() + settings.operations.unpaidExpiryMinutes * 60_000),
  });

  try {
    await openOrder(gateway, booking);
  } catch (error) {
    logger.error({ err: error, bookingId: String(booking._id) }, "payment order failed");
    await Booking.updateOne({ _id: booking._id }, { $set: { status: "expired", paymentExpiresAt: null }, $push: { statusHistory: { status: "expired", at: new Date(), by: "system" } } });
    throw new AppError("SERVICE_UNAVAILABLE", { detail: "payment gateway" });
  }
  // A quote is used once.
  await Quote.deleteOne({ _id: input.quoteId });
  return booking;
}

/** A new order for an unpaid booking whose earlier attempt failed (plan W4: "try again"). */
export async function retryPayment(booking: BookingDoc, gateway: PaymentGateway) {
  if (booking.status !== "awaiting_payment" || !booking.paymentExpiresAt || booking.paymentExpiresAt.getTime() <= Date.now()) throw new AppError("BOOKING_STATE");
  const open = await Payment.findOne({ bookingId: booking._id, status: "created" }).lean();
  if (open) return toPaymentDto(open, gateway.keyId);
  return openOrder(gateway, booking);
}

export async function listForCustomer(customerId: Types.ObjectId, before?: Date, limit = 20): Promise<BookingSummaryDto[]> {
  const bookings = await Booking.find({ customerId, ...(before ? { createdAt: { $lt: before } } : {}) })
    .sort({ createdAt: -1 })
    .limit(limit);
  const proIds = bookings.map((booking) => booking.professionalId).filter((id): id is Types.ObjectId => id !== null);
  const pros = new Map((await User.find({ _id: { $in: proIds } }, { name: 1 }).lean()).map((user) => [String(user._id), user.name]));
  return bookings.map((booking) => toSummaryDto(booking, booking.professionalId ? (pros.get(String(booking.professionalId)) ?? null) : null));
}

export const isObjectId = (value: string) => Types.ObjectId.isValid(value) && /^[a-f0-9]{24}$/.test(value);
