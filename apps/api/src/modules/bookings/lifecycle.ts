import { EventEmitter } from "node:events";
import type { BookingStatus } from "@brand/shared";
import type { ClientSession, Types, UpdateQuery } from "mongoose";
import { type Actor, Booking, type BookingDoc, type BookingFields } from "./booking.model";

/**
 * In-process domain events (plan C4). Matching listens for "searching", the real-time layer
 * for "changed"; side effects that must survive a crash go through the outbox instead.
 */
interface BookingEvents {
  /** Any change a viewer should see (status, ETA, professional, tracking). */
  changed: [booking: BookingDoc];
  /** Paid (or re-opened after a professional cancelled): matching should run. */
  searching: [booking: BookingDoc];
}

export const bookingEvents = new EventEmitter<BookingEvents>();
bookingEvents.setMaxListeners(50);

/**
 * The only way a booking changes status (plan A8): one conditional update that applies only
 * if the booking is still in an expected state, so two actors can never both win.
 */
export async function transition(
  id: Types.ObjectId | string,
  from: BookingStatus | ReadonlyArray<BookingStatus>,
  to: BookingStatus,
  by: Actor,
  set: UpdateQuery<BookingFields>["$set"] = {},
  session?: ClientSession,
): Promise<BookingDoc | null> {
  const now = new Date();
  const booking = await Booking.findOneAndUpdate(
    { _id: id, status: { $in: typeof from === "string" ? [from] : from } },
    { $set: { ...set, status: to }, $push: { statusHistory: { status: to, at: now, by } }, $inc: { version: 1 } },
    { returnDocument: "after", session },
  );
  if (booking && !session) announce(booking, to === "searching");
  return booking;
}

/**
 * Tells listeners about a change. Call it after the transaction commits when one was used;
 * `startedSearching` only when the booking has just entered "searching".
 */
export function announce(booking: BookingDoc, startedSearching = false): void {
  bookingEvents.emit("changed", booking);
  if (startedSearching) bookingEvents.emit("searching", booking);
}
