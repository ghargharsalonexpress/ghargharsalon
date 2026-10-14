import { ALERT_KINDS, type AlertKind, RT } from "@brand/shared";
import { type ClientSession, model, Schema, type Types } from "mongoose";
import type { Config } from "../../config";
import { Booking } from "../bookings/booking.model";
import { bookingEvents } from "../bookings/lifecycle";
import type { EmailContext } from "../email/templates";
import type { EmailTransport } from "../email/transport";
import { Refund } from "../payments/payment.model";
import { realtime } from "../realtime/realtime";
import { enqueue } from "../system/outbox";
import { User } from "../users/user.model";
import { adminAlertEmail, bookingCancelledEmail, bookingCompletedEmail, bookingConfirmedEmail, noProfessionalEmail } from "./bookingEmails";

// ---------- admin alerts (plan C10: "in-app alert centre plus email") ----------

export { ALERT_KINDS, type AlertKind };

interface AlertFields {
  kind: AlertKind;
  bookingId: Types.ObjectId | null;
  message: string;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedBy: Types.ObjectId | null;
}

const alertSchema = new Schema<AlertFields>(
  {
    kind: { type: String, enum: ALERT_KINDS, required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", default: null },
    message: { type: String, required: true },
    createdAt: { type: Date, required: true },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { versionKey: false },
);
alertSchema.index({ resolvedAt: 1, createdAt: -1 });
// One open alert per booking and kind.
alertSchema.index({ bookingId: 1, kind: 1 }, { unique: true, partialFilterExpression: { resolvedAt: null, bookingId: { $type: "objectId" } } });
export const Alert = model<AlertFields>("Alert", alertSchema, "alerts");

export async function raiseAlert(kind: AlertKind, bookingId: Types.ObjectId | null, message: string, session?: ClientSession): Promise<void> {
  try {
    await Alert.create([{ kind, bookingId, message, createdAt: new Date(), resolvedAt: null, resolvedBy: null }], { session });
  } catch (error) {
    // Already open for this booking: one alert is enough.
    if (typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === 11000) return;
    throw error;
  }
  await enqueue("email", { kind: "admin_alert", alert: kind, bookingId: bookingId ? String(bookingId) : null, message }, session);
  realtime.toAdmins(RT.adminOps, { type: "alert", kind });
}

// ---------- customer emails ----------

/** Alerts about a passing condition, and the statuses that end it. */
const PASSING: Array<{ kind: AlertKind; whileStatus: string }> = [
  { kind: "slow_search", whileStatus: "searching" },
  { kind: "pro_cancelled", whileStatus: "searching" },
  { kind: "late", whileStatus: "accepted" },
  { kind: "otp_locked", whileStatus: "arrived" },
];
let resolvingAlerts = false;

/**
 * Alerts that only matter while their condition lasts resolve themselves once the booking moves
 * on (accepted after a slow search, arrived after running late). "No professional" and "Refund
 * failed" stay open until someone on the team resolves them.
 */
export function resolvePassingAlerts(): void {
  if (resolvingAlerts) return;
  resolvingAlerts = true;
  bookingEvents.on("changed", (booking) => {
    const kinds = PASSING.filter((item) => booking.status !== item.whileStatus).map((item) => item.kind);
    if (kinds.length === 0) return;
    Alert.updateMany({ bookingId: booking._id, kind: { $in: kinds }, resolvedAt: null }, { $set: { resolvedAt: new Date(), resolvedBy: null } }).catch(() => undefined);
  });
}

export type BookingEmailKind = "booking_confirmed" | "no_professional" | "booking_cancelled" | "booking_completed";

export const queueBookingEmail = (kind: BookingEmailKind, bookingId: Types.ObjectId, session?: ClientSession) => enqueue("email", { kind, bookingId: String(bookingId) }, session);

/** Outbox "email" handler: renders and sends, in the recipient's language. */
export function emailHandler({ config, email }: { config: Config; email: EmailTransport }) {
  const context: EmailContext = { brandName: config.BRAND_NAME, supportEmail: config.SUPPORT_EMAIL, supportPhone: config.SUPPORT_PHONE };
  const web = config.WEB_URL.replace(/\/$/, "");

  return async (payload: Record<string, unknown>) => {
    const kind = payload.kind as BookingEmailKind | "admin_alert";
    if (kind === "admin_alert") {
      const bookingId = typeof payload.bookingId === "string" ? payload.bookingId : null;
      const title = { no_match: "No professional found", refund_failed: "Refund failed", late: "Professional running late", otp_locked: "Start code locked", pro_cancelled: "Professional cancelled a job", slow_search: "Search running long" }[payload.alert as AlertKind] ?? "Alert";
      await email.send(adminAlertEmail({ to: config.SUPPORT_EMAIL, title, detail: String(payload.message ?? ""), url: bookingId ? `${web}/admin/bookings/${bookingId}` : `${web}/admin` }, context));
      return;
    }

    const booking = await Booking.findById(payload.bookingId).lean();
    if (!booking) return;
    const customer = await User.findById(booking.customerId, { name: 1, email: 1, locale: 1 }).lean();
    if (!customer) return;
    const base = { to: customer.email, name: customer.name, lang: customer.locale, number: booking.number, url: `${web}/bookings/${String(booking._id)}` };

    switch (kind) {
      case "booking_confirmed": {
        const pro = booking.professionalId ? await User.findById(booking.professionalId, { name: 1 }).lean() : null;
        await email.send(bookingConfirmedEmail({ ...base, professional: pro?.name ?? "", etaMin: booking.eta?.min ?? 10, etaMax: booking.eta?.max ?? 15 }, context));
        break;
      }
      case "no_professional": {
        const refund = booking.refundId ? await Refund.findById(booking.refundId).lean() : null;
        await email.send(noProfessionalEmail({ ...base, refundPaise: refund?.amountPaise ?? booking.pricing.totalPaise }, context));
        break;
      }
      case "booking_cancelled": {
        const refund = booking.refundId ? await Refund.findById(booking.refundId).lean() : null;
        await email.send(bookingCancelledEmail({ ...base, feePaise: booking.cancellation?.feePaise ?? 0, refundPaise: refund?.amountPaise ?? 0, byCustomer: booking.cancellation?.by === "customer" }, context));
        break;
      }
      case "booking_completed": {
        const pro = booking.professionalId ? await User.findById(booking.professionalId, { name: 1 }).lean() : null;
        await email.send(bookingCompletedEmail({ ...base, totalPaise: booking.pricing.totalPaise, professional: pro?.name ?? "", invoiceUrl: `${base.url}/invoice`, url: `${base.url}?rate=1` }, context));
        break;
      }
    }
  };
}
