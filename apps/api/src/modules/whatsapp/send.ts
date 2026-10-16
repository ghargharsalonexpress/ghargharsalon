import type { ClientSession, Types } from "mongoose";
import { Booking } from "../bookings/booking.model";
import { enqueue } from "../system/outbox";
import { User } from "../users/user.model";
import { WHATSAPP_TEMPLATES, type WhatsappTemplate, type WhatsappTransport } from "./transport";

/** What the customer is told, by booking. The outbox looks the details up when it sends. */
export type WhatsappKind = "on_the_way" | "no_professional" | "completed";

/**
 * Queues a WhatsApp message in the same transaction as the thing that caused it, so a crash
 * cannot drop it and a Meta outage retries instead of losing it.
 */
export const queueWhatsapp = (kind: WhatsappKind, bookingId: Types.ObjectId, session?: ClientSession) =>
  enqueue("whatsapp", { kind, bookingId: String(bookingId) }, session);

const TEMPLATE: Record<WhatsappKind, WhatsappTemplate> = {
  on_the_way: WHATSAPP_TEMPLATES.onTheWay,
  no_professional: WHATSAPP_TEMPLATES.noProfessional,
  completed: WHATSAPP_TEMPLATES.completed,
};

const rupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;

/**
 * Outbox "whatsapp" handler. Reads the booking at send time, so a message that waited through a
 * retry still carries the truth rather than a stale snapshot.
 */
export function whatsappHandler({ whatsapp }: { whatsapp: WhatsappTransport }) {
  return async (payload: Record<string, unknown>) => {
    const kind = payload.kind as WhatsappKind;
    const booking = await Booking.findById(String(payload.bookingId)).lean();
    if (!booking) return;

    const customer = await User.findById(booking.customerId, { phone: 1, locale: 1 }).lean();
    // Every customer has a phone -- they signed in with it -- but never assume.
    if (!customer?.phone) return;

    const language = customer.locale === "hi" ? "hi" : "en";
    const id = String(booking._id);

    if (kind === "on_the_way") {
      const pro = booking.professionalId ? await User.findById(booking.professionalId, { name: 1 }).lean() : null;
      const first = pro?.name.split(" ")[0] ?? "Your professional";
      const eta = booking.eta ? `${booking.eta.min}-${booking.eta.max}` : "15";
      await whatsapp.send({ phone: customer.phone, template: TEMPLATE[kind], variables: [first, eta], buttonParam: `bookings/${id}`, language });
      return;
    }

    if (kind === "no_professional") {
      await whatsapp.send({ phone: customer.phone, template: TEMPLATE[kind], variables: [rupees(booking.pricing.totalPaise)], buttonParam: `bookings/${id}`, language });
      return;
    }

    await whatsapp.send({ phone: customer.phone, template: TEMPLATE[kind], variables: [booking.number], buttonParam: `bookings/${id}/invoice`, language });
  };
}
