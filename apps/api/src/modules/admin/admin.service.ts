import {
  ADMIN_PAGE_SIZE,
  type AdminAlertDto,
  type AdminAuditRow,
  type AdminBookingDetailDto,
  type AdminBookingRow,
  type AdminBookingView,
  type AdminCustomerDetailDto,
  type AdminCustomerRow,
  type AdminDashboardDto,
  type AdminEligibleProDto,
  type AdminLiveDto,
  type AdminPaymentRow,
  type AdminProPerformanceDto,
  type AdminRefundRow,
  type AdminReviewRow,
  type BookingStatus,
  type Paged,
} from "@brand/shared";
import { type QueryFilter, Types } from "mongoose";
import { AppError } from "../../errors";
import { revokeUserSessions } from "../../http/session";
import { AuditLog } from "../audit/audit.model";
import { findEligible } from "../availability/availability.service";
import { Booking, type BookingDoc, type BookingFields } from "../bookings/booking.model";
import { toBookingDto, toSummaryDto } from "../bookings/bookings.service";
import { Offer } from "../matching/offer.model";
import { Alert } from "../notifications/notifications";
import type { PaymentGateway } from "../payments/gateway";
import { Payment, type PaymentFields, Refund, type RefundFields } from "../payments/payment.model";
import { requestRefund } from "../payments/payments.service";
import { Professional } from "../professionals/professional.model";
import { getSettings } from "../settings/settings.service";
import { User, type UserFields } from "../users/user.model";

const IST_MS = 330 * 60_000;

/** Admin filters are built from query strings and checked here; the casts only quiet Mongoose's strict filter types. */
const loose = <T>(filter: Record<string, unknown>) => filter as unknown as QueryFilter<T>;

/** Midnight IST of the given day, as a Date (plan B10: the business runs on India time). */
export function istMidnight(at: Date): Date {
  const ist = new Date(at.getTime() + IST_MS);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST_MS);
}

/** "2026-10-06" (IST) → that day's midnight IST; invalid input gives null. */
function istDay(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00+05:30`);
  return Number.isNaN(date.getTime()) ? null : date;
}

const LIVE: BookingStatus[] = ["accepted", "arrived", "in_progress"];
const ENDED: BookingStatus[] = ["cancelled", "no_professional_found", "expired"];
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pageOf = (value: unknown) => Math.max(1, Math.min(10_000, Number.parseInt(String(value ?? "1"), 10) || 1));
const area = (address: BookingFields["address"]) => [address.street, address.city].filter(Boolean).join(", ");

async function namesOf(ids: Array<Types.ObjectId | null | undefined>): Promise<Map<string, { name: string; phone: string; email: string }>> {
  const unique = [...new Set(ids.filter((id): id is Types.ObjectId => Boolean(id)).map(String))];
  if (unique.length === 0) return new Map();
  const users = await User.find({ _id: { $in: unique } }, { name: 1, phone: 1, email: 1 }).lean();
  return new Map(users.map((user) => [String(user._id), { name: user.name, phone: user.phone, email: user.email }]));
}

function alertDto(alert: { _id: Types.ObjectId; kind: AdminAlertDto["kind"]; bookingId: Types.ObjectId | null; message: string; createdAt: Date; resolvedAt: Date | null }, numbers: Map<string, string>): AdminAlertDto {
  return {
    id: String(alert._id),
    kind: alert.kind,
    bookingId: alert.bookingId ? String(alert.bookingId) : null,
    bookingNumber: alert.bookingId ? (numbers.get(String(alert.bookingId)) ?? null) : null,
    message: alert.message,
    createdAt: alert.createdAt.toISOString(),
    resolvedAt: alert.resolvedAt?.toISOString() ?? null,
  };
}

async function bookingNumbers(ids: Array<Types.ObjectId | null | undefined>): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is Types.ObjectId => Boolean(id)).map(String))];
  if (unique.length === 0) return new Map();
  const bookings = await Booking.find({ _id: { $in: unique } }, { number: 1 }).lean();
  return new Map(bookings.map((booking) => [String(booking._id), booking.number]));
}

const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? (sorted[middle] ?? null) : Math.round(((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2);
};

/** Admin operations (plan Phase 8, W14–W16). Every change here is audited by the routes. */
export function createAdmin({ gateway }: { gateway: PaymentGateway }) {
  // ---------- dashboard ----------

  async function dashboard(now = new Date()): Promise<AdminDashboardDto> {
    const start = istMidnight(now);
    const [bookings, paid, completed, cancelled, noMatch, searching, live, online, busy, captured, refunded, accepted, alerts] = await Promise.all([
      Booking.countDocuments({ createdAt: { $gte: start } }),
      Booking.countDocuments({ createdAt: { $gte: start }, "statusHistory.status": "searching" }),
      Booking.countDocuments({ completedAt: { $gte: start } }),
      Booking.countDocuments({ status: "cancelled", "cancellation.at": { $gte: start } }),
      Booking.countDocuments({ statusHistory: { $elemMatch: { status: "no_professional_found", at: { $gte: start } } } }),
      Booking.countDocuments({ status: "searching" }),
      Booking.countDocuments({ status: { $in: LIVE } }),
      Professional.countDocuments({ "presence.state": { $in: ["available", "busy"] } }),
      Professional.countDocuments({ "presence.state": "busy" }),
      Payment.aggregate<{ total: number }>([{ $match: { capturedAt: { $gte: start }, status: { $in: ["captured", "refunded"] } } }, { $group: { _id: null, total: { $sum: "$amountPaise" } } }]),
      Refund.aggregate<{ total: number }>([{ $match: { createdAt: { $gte: start }, status: { $ne: "failed" } } }, { $group: { _id: null, total: { $sum: "$amountPaise" } } }]),
      Booking.find({ acceptedAt: { $gte: start } }, { statusHistory: 1, acceptedAt: 1 }).limit(1000).lean(),
      Alert.find({ resolvedAt: null }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);
    const acceptSeconds = accepted.flatMap((booking) => {
      const paidAt = booking.statusHistory.find((entry) => entry.status === "searching")?.at;
      return paidAt && booking.acceptedAt ? [Math.max(0, Math.round((booking.acceptedAt.getTime() - paidAt.getTime()) / 1000))] : [];
    });
    const numbers = await bookingNumbers(alerts.map((alert) => alert.bookingId));
    return {
      today: {
        bookings,
        paid,
        completed,
        cancelled,
        noMatch,
        revenuePaise: Math.max(0, (captured[0]?.total ?? 0) - (refunded[0]?.total ?? 0)),
        noMatchRate: paid > 0 ? noMatch / paid : null,
        medianAcceptSeconds: median(acceptSeconds),
      },
      now: { searching, live, onlineProfessionals: online, busyProfessionals: busy },
      alerts: alerts.map((alert) => alertDto(alert, numbers)),
    };
  }

  async function alerts(includeResolved: boolean): Promise<AdminAlertDto[]> {
    const rows = await Alert.find(includeResolved ? {} : { resolvedAt: null }).sort({ createdAt: -1 }).limit(100).lean();
    const numbers = await bookingNumbers(rows.map((alert) => alert.bookingId));
    return rows.map((alert) => alertDto(alert, numbers));
  }

  async function resolveAlert(alertId: string, adminId: Types.ObjectId): Promise<void> {
    const result = await Alert.updateOne({ _id: alertId, resolvedAt: null }, { $set: { resolvedAt: new Date(), resolvedBy: adminId } });
    if (result.matchedCount === 0) throw new AppError("NOT_FOUND");
  }

  // ---------- live board ----------

  async function live(): Promise<AdminLiveDto> {
    const [pros, active] = await Promise.all([
      Professional.find({ "presence.state": { $ne: "offline" } }, { userId: 1, presence: 1 }).lean(),
      Booking.find({ status: { $in: ["searching", ...LIVE] } }, { number: 1, status: 1, address: 1, professionalId: 1, createdAt: 1, search: 1 }).sort({ createdAt: -1 }).limit(300).lean(),
    ]);
    const names = await namesOf([...pros.map((pro) => pro.userId), ...active.map((booking) => booking.professionalId)]);
    const numbers = new Map(active.map((booking) => [String(booking._id), booking.number]));
    const missing = pros.map((pro) => pro.presence.activeBookingId).filter((id): id is Types.ObjectId => Boolean(id) && !numbers.has(String(id)));
    for (const [id, number] of await bookingNumbers(missing)) numbers.set(id, number);

    return {
      professionals: pros.map((pro) => {
        const point = pro.presence.location?.coordinates;
        const activeId = pro.presence.activeBookingId ? String(pro.presence.activeBookingId) : null;
        return {
          id: String(pro.userId),
          name: names.get(String(pro.userId))?.name ?? "",
          state: pro.presence.state,
          location: point ? { lat: point[1] ?? 0, lng: point[0] ?? 0 } : null,
          locationAt: pro.presence.locationAt?.toISOString() ?? null,
          activeBooking: activeId ? { id: activeId, number: numbers.get(activeId) ?? "" } : null,
        };
      }),
      bookings: active.map((booking) => ({
        id: String(booking._id),
        number: booking.number,
        status: booking.status,
        area: area(booking.address),
        location: { lat: booking.address.location.coordinates[1] ?? 0, lng: booking.address.location.coordinates[0] ?? 0 },
        professionalName: booking.professionalId ? (names.get(String(booking.professionalId))?.name ?? null) : null,
        createdAt: booking.createdAt.toISOString(),
        deadlineAt: booking.status === "searching" ? (booking.search?.deadlineAt.toISOString() ?? null) : null,
      })),
      at: new Date().toISOString(),
    };
  }

  // ---------- bookings ----------

  async function bookingFilter(query: Record<string, unknown>): Promise<QueryFilter<BookingFields>> {
    const filter: Record<string, unknown> = {};
    const view = (typeof query.view === "string" ? query.view : "all") as AdminBookingView;
    if (view === "active") filter.status = { $in: ["searching", ...LIVE] };
    if (view === "searching") filter.status = "searching";
    if (view === "completed") filter.status = "completed";
    if (view === "cancelled") filter.status = { $in: ENDED };
    if (view === "attention") {
      const open = await Alert.find({ resolvedAt: null, bookingId: { $ne: null } }, { bookingId: 1 }).lean();
      filter._id = { $in: open.map((alert) => alert.bookingId) };
    }

    const from = istDay(query.from);
    const to = istDay(query.to);
    if (from || to) filter.createdAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lt: new Date(to.getTime() + 86_400_000) } : {}) };
    if (typeof query.professionalId === "string" && Types.ObjectId.isValid(query.professionalId)) filter.professionalId = new Types.ObjectId(query.professionalId);

    const q = typeof query.q === "string" ? query.q.trim() : "";
    if (q) {
      const digits = q.replace(/\D/g, "");
      if (/^bk-?\d+$/i.test(q) || (/^\d{1,6}$/.test(q) && digits.length <= 6)) {
        filter.number = `BK-${digits}`;
      } else {
        const pattern = new RegExp(escapeRegex(digits.length >= 10 ? digits.slice(-10) : q), "i");
        const users = await User.find({ role: "customer", $or: [{ name: pattern }, { email: pattern }, { phone: pattern }] }, { _id: 1 }).limit(200).lean();
        filter.customerId = { $in: users.map((user) => user._id) };
      }
    }
    return loose<BookingFields>(filter);
  }

  async function bookingRows(bookings: Array<Pick<BookingDoc, "_id" | "number" | "status" | "createdAt" | "customerId" | "professionalId" | "address" | "pricing" | "refundId">>): Promise<AdminBookingRow[]> {
    const ids = bookings.map((booking) => booking._id);
    const [people, refunds, openAlerts] = await Promise.all([
      namesOf([...bookings.map((booking) => booking.customerId), ...bookings.map((booking) => booking.professionalId)]),
      Refund.find({ bookingId: { $in: ids } }, { bookingId: 1, status: 1, createdAt: 1 }).sort({ createdAt: 1 }).lean(),
      Alert.find({ bookingId: { $in: ids }, resolvedAt: null }, { bookingId: 1, kind: 1 }).lean(),
    ]);
    const refundOf = new Map(refunds.map((refund) => [String(refund.bookingId), refund.status]));
    const alertOf = new Map(openAlerts.map((alert) => [String(alert.bookingId), alert.kind]));
    return bookings.map((booking) => {
      const customer = people.get(String(booking.customerId));
      return {
        id: String(booking._id),
        number: booking.number,
        status: booking.status,
        createdAt: booking.createdAt.toISOString(),
        customerName: customer?.name ?? "",
        customerPhone: customer?.phone ?? "",
        professionalName: booking.professionalId ? (people.get(String(booking.professionalId))?.name ?? null) : null,
        area: area(booking.address),
        totalPaise: booking.pricing.totalPaise,
        refundStatus: refundOf.get(String(booking._id)) ?? null,
        alert: alertOf.get(String(booking._id)) ?? null,
      };
    });
  }

  async function listBookings(query: Record<string, unknown>): Promise<Paged<AdminBookingRow>> {
    const filter = await bookingFilter(query);
    const page = pageOf(query.page);
    const [total, bookings] = await Promise.all([
      Booking.countDocuments(filter),
      Booking.find(filter, { number: 1, status: 1, createdAt: 1, customerId: 1, professionalId: 1, address: 1, pricing: 1, refundId: 1 })
        .sort({ createdAt: -1 })
        .skip((page - 1) * ADMIN_PAGE_SIZE)
        .limit(ADMIN_PAGE_SIZE)
        .lean(),
    ]);
    return { rows: await bookingRows(bookings), total, page, pageSize: ADMIN_PAGE_SIZE };
  }

  /** CSV for spreadsheets (plan Phase 8): the same filters, at most 5,000 rows. */
  async function exportBookings(query: Record<string, unknown>): Promise<string> {
    const filter = await bookingFilter(query);
    const bookings = await Booking.find(filter, { number: 1, status: 1, createdAt: 1, customerId: 1, professionalId: 1, address: 1, pricing: 1, refundId: 1 }).sort({ createdAt: -1 }).limit(5000).lean();
    const rows = await bookingRows(bookings);
    const cell = (value: string | number | null) => {
      const text = value === null ? "" : String(value);
      // Quote everything; neutralise spreadsheet formulas (CSV injection).
      const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const istText = (iso: string) => new Date(Date.parse(iso) + IST_MS).toISOString().slice(0, 16).replace("T", " ");
    const header = ["Booking", "Created (IST)", "Status", "Customer", "Phone", "Professional", "Area", "Total (INR)", "Refund"];
    const lines = rows.map((row) => [row.number, istText(row.createdAt), row.status, row.customerName, row.customerPhone, row.professionalName, row.area, (row.totalPaise / 100).toFixed(2), row.refundStatus].map(cell).join(","));
    return [header.map(cell).join(","), ...lines].join("\r\n");
  }

  async function refundRow(refund: { _id: Types.ObjectId; bookingId: Types.ObjectId; amountPaise: number; status: AdminRefundRow["status"]; reason: string; initiatedBy: string; createdAt: Date; processedAt: Date | null; lastError: string | null }, numbers: Map<string, string>): Promise<AdminRefundRow> {
    return {
      id: String(refund._id),
      bookingId: String(refund.bookingId),
      bookingNumber: numbers.get(String(refund.bookingId)) ?? "",
      amountPaise: refund.amountPaise,
      status: refund.status,
      reason: refund.reason,
      initiatedBy: refund.initiatedBy,
      createdAt: refund.createdAt.toISOString(),
      processedAt: refund.processedAt?.toISOString() ?? null,
      lastError: refund.lastError,
    };
  }

  async function refundable(bookingId: Types.ObjectId): Promise<number> {
    const [payments, refunds] = await Promise.all([
      Payment.find({ bookingId, status: { $in: ["captured", "refunded"] } }, { amountPaise: 1 }).lean(),
      Refund.find({ bookingId, status: { $ne: "failed" } }, { amountPaise: 1 }).lean(),
    ]);
    const captured = payments.reduce((sum, payment) => sum + payment.amountPaise, 0);
    const back = refunds.reduce((sum, refund) => sum + refund.amountPaise, 0);
    return Math.max(0, captured - back);
  }

  async function bookingDetail(bookingId: string, adminId: Types.ObjectId): Promise<AdminBookingDetailDto> {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new AppError("NOT_FOUND");
    const [customer, offers, payments, refunds, alertsFor, refundablePaise] = await Promise.all([
      User.findById(booking.customerId, { name: 1, phone: 1, email: 1, status: 1 }).lean(),
      Offer.find({ bookingId: booking._id }).sort({ sentAt: 1 }).lean(),
      Payment.find({ bookingId: booking._id }).sort({ createdAt: 1 }).lean(),
      Refund.find({ bookingId: booking._id }).sort({ createdAt: 1 }).lean(),
      Alert.find({ bookingId: booking._id }).sort({ createdAt: -1 }).lean(),
      refundable(booking._id),
    ]);
    const pros = await namesOf(offers.map((offer) => offer.professionalId));
    const numbers = new Map([[String(booking._id), booking.number]]);
    return {
      booking: await toBookingDto(booking, { role: "admin", id: adminId }, gateway),
      customer: { id: String(booking.customerId), name: customer?.name ?? "", phone: customer?.phone ?? "", email: customer?.email ?? "", status: customer?.status ?? "active" },
      history: booking.statusHistory.map((entry) => ({ status: entry.status, at: entry.at.toISOString(), by: entry.by })),
      offers: offers.map((offer) => ({
        id: String(offer._id),
        professionalId: String(offer.professionalId),
        professionalName: pros.get(String(offer.professionalId))?.name ?? "",
        round: offer.round,
        // Pending past its window reads as expired, even before the sweeper runs.
        status: offer.status === "pending" && offer.expiresAt <= new Date() ? "expired" : offer.status,
        sentAt: offer.sentAt.toISOString(),
        respondedAt: offer.respondedAt?.toISOString() ?? null,
        declineReason: offer.declineReason,
        distanceMeters: offer.distanceMeters,
        pushSent: offer.pushSent ?? 0,
      })),
      payments: payments.map((payment) => ({
        orderId: payment.orderId,
        paymentId: payment.paymentId,
        status: payment.status,
        amountPaise: payment.amountPaise,
        method: payment.method,
        createdAt: payment.createdAt.toISOString(),
        capturedAt: payment.capturedAt?.toISOString() ?? null,
      })),
      refunds: await Promise.all(refunds.map((refund) => refundRow(refund, numbers))),
      notes: (booking.notes ?? []).map((note) => ({ text: note.text, byName: note.byName, at: note.at.toISOString() })),
      alerts: alertsFor.map((alert) => alertDto(alert, numbers)),
      refundablePaise,
      otp: booking.otp ? { attempts: booking.otp.attempts, locked: booking.otp.lockedAt !== null } : null,
    };
  }

  /** "Unlock start code" (runbook): after calling the customer, the professional may try again. */
  async function unlockOtp(bookingId: string, adminId: Types.ObjectId): Promise<void> {
    const result = await Booking.updateOne({ _id: bookingId, status: "arrived", "otp.lockedAt": { $ne: null } }, { $set: { "otp.attempts": 0, "otp.lockedAt": null } });
    if (result.matchedCount === 0) throw new AppError("BOOKING_STATE", { detail: "code not locked" });
    await Alert.updateMany({ bookingId, kind: "otp_locked", resolvedAt: null }, { $set: { resolvedAt: new Date(), resolvedBy: adminId } });
  }

  async function addNote(bookingId: string, admin: { _id: Types.ObjectId; name: string }, text: string): Promise<void> {
    const result = await Booking.updateOne({ _id: bookingId }, { $push: { notes: { text, byId: admin._id, byName: admin.name, at: new Date() } } });
    if (result.matchedCount === 0) throw new AppError("NOT_FOUND");
  }

  /** Professionals who could take a searching booking now (plan W14), nearest first. */
  async function eligibleFor(bookingId: string): Promise<AdminEligibleProDto[]> {
    const booking = await Booking.findById(bookingId, { address: 1, skills: 1 }).lean();
    if (!booking) throw new AppError("NOT_FOUND");
    const { settings } = await getSettings();
    const [lng, lat] = booking.address.location.coordinates;
    const rows = await findEligible({ location: { lat: lat ?? 0, lng: lng ?? 0 }, skills: booking.skills, preference: "any", settings, limit: 20 });
    const names = await namesOf(rows.map((row) => row.userId));
    return rows.map((row) => ({ id: String(row.userId), name: names.get(String(row.userId))?.name ?? "", distanceMeters: Math.round(row.distance), rating: row.rating, jobsToday: row.jobsToday }));
  }

  /** A manual refund (plan Phase 8), at most what is still refundable. */
  async function manualRefund(bookingId: string, amountPaise: number, reason: string): Promise<void> {
    const booking = await Booking.findById(bookingId, { _id: 1 }).lean();
    if (!booking) throw new AppError("NOT_FOUND");
    const available = await refundable(booking._id);
    if (amountPaise > available) throw new AppError("VALIDATION_FAILED", { fields: { amountPaise: "validation.refundTooMuch" }, detail: `max ${available}` });
    // A unique reason per manual refund keeps its idempotency key apart from the system's.
    const id = await requestRefund({ bookingId: booking._id, amountPaise, reason: `admin:${Date.now()}:${reason}`.slice(0, 300), initiatedBy: "admin" });
    if (!id) throw new AppError("BOOKING_STATE", { detail: "nothing captured to refund" });
  }

  // ---------- customers ----------

  async function listCustomers(query: Record<string, unknown>): Promise<Paged<AdminCustomerRow>> {
    const page = pageOf(query.page);
    const filter: Record<string, unknown> = { role: "customer" };
    if (query.status === "blocked") filter.status = "blocked";
    const q = typeof query.q === "string" ? query.q.trim() : "";
    if (q) {
      const digits = q.replace(/\D/g, "");
      const pattern = new RegExp(escapeRegex(digits.length >= 10 ? digits.slice(-10) : q), "i");
      filter.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
    }
    const userFilter = loose<UserFields>(filter);
    const [total, users] = await Promise.all([
      User.countDocuments(userFilter),
      User.find(userFilter, { name: 1, email: 1, phone: 1, status: 1, createdAt: 1 }).sort({ createdAt: -1 }).skip((page - 1) * ADMIN_PAGE_SIZE).limit(ADMIN_PAGE_SIZE).lean(),
    ]);
    const stats = await Booking.aggregate<{ _id: Types.ObjectId; count: number; last: Date }>([
      { $match: { customerId: { $in: users.map((user) => user._id) } } },
      { $group: { _id: "$customerId", count: { $sum: 1 }, last: { $max: "$createdAt" } } },
    ]);
    const statOf = new Map(stats.map((stat) => [String(stat._id), stat]));
    return {
      rows: users.map((user) => ({
        id: String(user._id),
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: user.status === "blocked" ? "blocked" : "active",
        createdAt: (user as { createdAt?: Date }).createdAt?.toISOString() ?? new Date(0).toISOString(),
        bookings: statOf.get(String(user._id))?.count ?? 0,
        lastBookingAt: statOf.get(String(user._id))?.last.toISOString() ?? null,
      })),
      total,
      page,
      pageSize: ADMIN_PAGE_SIZE,
    };
  }

  async function customerDetail(customerId: string): Promise<AdminCustomerDetailDto> {
    const user = await User.findOne({ _id: customerId, role: "customer" }).lean();
    if (!user) throw new AppError("NOT_FOUND");
    const bookings = await Booking.find({ customerId: user._id }).sort({ createdAt: -1 }).limit(50);
    const pros = await namesOf(bookings.map((booking) => booking.professionalId));
    const spentPaise = bookings.filter((booking) => booking.status === "completed").reduce((sum, booking) => sum + booking.pricing.totalPaise, 0);
    return {
      customer: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: user.status === "blocked" ? "blocked" : "active",
        createdAt: (user as { createdAt?: Date }).createdAt?.toISOString() ?? new Date(0).toISOString(),
        bookings: bookings.length,
        lastBookingAt: bookings[0]?.createdAt.toISOString() ?? null,
        locale: user.locale,
      },
      bookings: bookings.map((booking) => toSummaryDto(booking, booking.professionalId ? (pros.get(String(booking.professionalId))?.name ?? null) : null)),
      spentPaise,
    };
  }

  /** Block or unblock (plan Phase 8). Blocking ends their sessions at once. */
  async function setCustomerStatus(customerId: string, status: "active" | "blocked"): Promise<{ before: string; after: string }> {
    const user = await User.findOne({ _id: customerId, role: "customer" });
    if (!user) throw new AppError("NOT_FOUND");
    const before = user.status;
    user.status = status;
    await user.save();
    if (status === "blocked") await revokeUserSessions(String(user._id));
    return { before, after: status };
  }

  // ---------- money ----------

  async function listPayments(query: Record<string, unknown>): Promise<Paged<AdminPaymentRow>> {
    const page = pageOf(query.page);
    const filter = loose<PaymentFields>(typeof query.status === "string" && ["created", "captured", "failed", "refunded"].includes(query.status) ? { status: query.status } : {});
    const [total, payments] = await Promise.all([
      Payment.countDocuments(filter),
      Payment.find(filter).sort({ createdAt: -1 }).skip((page - 1) * ADMIN_PAGE_SIZE).limit(ADMIN_PAGE_SIZE).lean(),
    ]);
    const numbers = await bookingNumbers(payments.map((payment) => payment.bookingId));
    return {
      rows: payments.map((payment) => ({
        id: String(payment._id),
        bookingId: String(payment.bookingId),
        bookingNumber: numbers.get(String(payment.bookingId)) ?? "",
        provider: payment.provider,
        orderId: payment.orderId,
        paymentId: payment.paymentId,
        status: payment.status,
        amountPaise: payment.amountPaise,
        method: payment.method,
        createdAt: payment.createdAt.toISOString(),
        capturedAt: payment.capturedAt?.toISOString() ?? null,
      })),
      total,
      page,
      pageSize: ADMIN_PAGE_SIZE,
    };
  }

  async function listRefunds(query: Record<string, unknown>): Promise<Paged<AdminRefundRow>> {
    const page = pageOf(query.page);
    const filter = loose<RefundFields>(typeof query.status === "string" && ["queued", "pending", "processed", "failed"].includes(query.status) ? { status: query.status } : {});
    const [total, refunds] = await Promise.all([
      Refund.countDocuments(filter),
      Refund.find(filter).sort({ createdAt: -1 }).skip((page - 1) * ADMIN_PAGE_SIZE).limit(ADMIN_PAGE_SIZE).lean(),
    ]);
    const numbers = await bookingNumbers(refunds.map((refund) => refund.bookingId));
    return { rows: await Promise.all(refunds.map((refund) => refundRow(refund, numbers))), total, page, pageSize: ADMIN_PAGE_SIZE };
  }

  // ---------- reviews ----------

  async function listReviews(query: Record<string, unknown>): Promise<Paged<AdminReviewRow>> {
    const page = pageOf(query.page);
    const filter: Record<string, unknown> = { review: { $ne: null } };
    if (query.hidden === "1") filter["review.hidden"] = true;
    const rating = Number(query.rating);
    if (Number.isInteger(rating) && rating >= 1 && rating <= 5) filter["review.rating"] = rating;
    const reviewFilter = loose<BookingFields>(filter);
    const [total, bookings] = await Promise.all([
      Booking.countDocuments(reviewFilter),
      Booking.find(reviewFilter, { number: 1, review: 1, customerId: 1, professionalId: 1 }).sort({ "review.at": -1 }).skip((page - 1) * ADMIN_PAGE_SIZE).limit(ADMIN_PAGE_SIZE).lean(),
    ]);
    const people = await namesOf([...bookings.map((booking) => booking.customerId), ...bookings.map((booking) => booking.professionalId)]);
    return {
      rows: bookings.flatMap((booking) =>
        booking.review
          ? [
              {
                bookingId: String(booking._id),
                bookingNumber: booking.number,
                rating: booking.review.rating,
                comment: booking.review.comment,
                at: booking.review.at.toISOString(),
                hidden: booking.review.hidden,
                customerName: people.get(String(booking.customerId))?.name ?? "",
                professionalName: booking.professionalId ? (people.get(String(booking.professionalId))?.name ?? null) : null,
              },
            ]
          : [],
      ),
      total,
      page,
      pageSize: ADMIN_PAGE_SIZE,
    };
  }

  /** Hide or show a review; the professional's rating follows (plan Phase 8). */
  async function setReviewHidden(bookingId: string, hidden: boolean): Promise<{ before: boolean; after: boolean }> {
    const booking = await Booking.findOne({ _id: bookingId, review: { $ne: null } }, { review: 1, professionalId: 1 });
    if (!booking?.review) throw new AppError("NOT_FOUND");
    const before = booking.review.hidden;
    await Booking.updateOne({ _id: booking._id }, { $set: { "review.hidden": hidden } });
    if (booking.professionalId) await refreshRating(booking.professionalId);
    return { before, after: hidden };
  }

  async function refreshRating(professionalId: Types.ObjectId): Promise<void> {
    const [stats] = await Booking.aggregate<{ avg: number; count: number }>([
      { $match: { professionalId, "review.hidden": false, "review.rating": { $gte: 1 } } },
      { $group: { _id: null, avg: { $avg: "$review.rating" }, count: { $sum: 1 } } },
    ]);
    await Professional.updateOne({ userId: professionalId }, { $set: { "stats.rating": stats ? Math.round(stats.avg * 10) / 10 : null, "stats.ratingCount": stats?.count ?? 0 } });
  }

  // ---------- professionals: performance and payouts (plan A4, W15) ----------

  async function proPerformance(professionalId: string): Promise<AdminProPerformanceDto> {
    const userId = new Types.ObjectId(professionalId);
    const [profile, completed, offerStats, earnings, recent] = await Promise.all([
      Professional.findOne({ userId }, { stats: 1 }).lean(),
      Booking.countDocuments({ professionalId: userId, status: "completed" }),
      Offer.aggregate<{ _id: string; count: number }>([{ $match: { professionalId: userId } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
      Booking.aggregate<{ _id: string; total: number }>([
        { $match: { professionalId: userId, status: "completed", earnings: { $ne: null } } },
        { $group: { _id: "$earnings.payoutStatus", total: { $sum: "$earnings.netPaise" } } },
      ]),
      Booking.find({ professionalId: userId }, { number: 1, status: 1, completedAt: 1, earnings: 1 }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);
    const count = (status: string) => offerStats.find((row) => row._id === status)?.count ?? 0;
    const answered = count("accepted") + count("declined") + count("expired");
    return {
      completed,
      cancelledByPro: profile?.stats.cancellations ?? 0,
      offers: offerStats.reduce((sum, row) => sum + row.count, 0),
      accepted: count("accepted"),
      acceptRate: answered > 0 ? count("accepted") / answered : null,
      rating: profile?.stats.rating ?? null,
      ratingCount: profile?.stats.ratingCount ?? 0,
      pendingPayoutPaise: earnings.find((row) => row._id === "pending")?.total ?? 0,
      paidOutPaise: earnings.find((row) => row._id === "paid")?.total ?? 0,
      recentJobs: recent.map((booking) => ({
        id: String(booking._id),
        number: booking.number,
        status: booking.status,
        completedAt: booking.completedAt?.toISOString() ?? null,
        netPaise: booking.earnings?.netPaise ?? 0,
        payoutStatus: booking.earnings?.payoutStatus ?? null,
      })),
    };
  }

  /** "Mark paid" (plan A4): every completed job still pending is marked as paid out now. */
  async function markPayout(professionalId: string): Promise<{ jobs: number; paidPaise: number }> {
    const userId = new Types.ObjectId(professionalId);
    const pending = await Booking.find({ professionalId: userId, status: "completed", "earnings.payoutStatus": "pending" }, { earnings: 1 }).lean();
    if (pending.length === 0) return { jobs: 0, paidPaise: 0 };
    const now = new Date();
    await Booking.updateMany({ _id: { $in: pending.map((booking) => booking._id) }, "earnings.payoutStatus": "pending" }, { $set: { "earnings.payoutStatus": "paid", "earnings.paidAt": now } });
    return { jobs: pending.length, paidPaise: pending.reduce((sum, booking) => sum + (booking.earnings?.netPaise ?? 0), 0) };
  }

  // ---------- audit ----------

  async function listAudit(query: Record<string, unknown>): Promise<Paged<AdminAuditRow>> {
    const page = pageOf(query.page);
    const filter: Record<string, unknown> = {};
    if (typeof query.entityType === "string" && /^[a-z_]{2,40}$/.test(query.entityType)) filter["entity.type"] = query.entityType;
    if (typeof query.entityId === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(query.entityId)) filter["entity.id"] = query.entityId;
    if (typeof query.action === "string" && /^[a-z_.]{2,60}$/.test(query.action)) filter.action = new RegExp(`^${escapeRegex(query.action)}`);
    const auditFilter = loose<{ action: string }>(filter);
    const [total, rows] = await Promise.all([AuditLog.countDocuments(auditFilter), AuditLog.find(auditFilter).sort({ at: -1 }).skip((page - 1) * ADMIN_PAGE_SIZE).limit(ADMIN_PAGE_SIZE).lean()]);
    const actors = await namesOf(rows.map((row) => row.actorId));
    return {
      rows: rows.map((row) => ({
        id: String(row._id),
        at: row.at.toISOString(),
        actorName: row.actorId ? (actors.get(String(row.actorId))?.name ?? "") : "System",
        actorRole: row.actorRole,
        action: row.action,
        entity: row.entity,
        before: row.before,
        after: row.after,
      })),
      total,
      page,
      pageSize: ADMIN_PAGE_SIZE,
    };
  }

  return {
    dashboard,
    alerts,
    resolveAlert,
    live,
    listBookings,
    exportBookings,
    bookingDetail,
    addNote,
    eligibleFor,
    manualRefund,
    unlockOtp,
    listCustomers,
    customerDetail,
    setCustomerStatus,
    listPayments,
    listRefunds,
    listReviews,
    setReviewHidden,
    proPerformance,
    markPayout,
    listAudit,
  };
}

export type Admin = ReturnType<typeof createAdmin>;
