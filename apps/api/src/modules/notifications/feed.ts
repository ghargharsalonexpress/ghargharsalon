import { type NotificationDto, type NotificationKind, type NotificationPage, RT } from "@brand/shared";
import type { ClientSession, Types } from "mongoose";
import { realtime } from "../realtime/realtime";
import { Notification } from "./feed.model";

/** Who a notification is for: one person, or the whole admin team. */
export type FeedTarget = { userId: Types.ObjectId | string } | { role: "admin" };

export interface NotifyInput {
  kind: NotificationKind;
  title: string;
  body: string;
  /** Where tapping it goes. Keep it a real in-app route, or the bell leads nowhere. */
  url: string;
  bookingId?: Types.ObjectId | string | null;
}

const toDto = (row: { _id: unknown; kind: NotificationKind; title: string; body: string; url: string; createdAt: Date; readAt: Date | null }): NotificationDto => ({
  id: String(row._id),
  kind: row.kind,
  title: row.title,
  body: row.body,
  url: row.url,
  createdAt: row.createdAt.toISOString(),
  readAt: row.readAt ? row.readAt.toISOString() : null,
});

/**
 * Writes one feed row and tells any open window about it (plan C10).
 *
 * Never throws: a notification is the least important thing happening in whatever transaction
 * called it, and losing one must not roll back a booking or a payment.
 */
export async function notify(target: FeedTarget, input: NotifyInput, session?: ClientSession): Promise<void> {
  const isAdmin = "role" in target;
  try {
    const [row] = await Notification.create(
      [
        {
          userId: isAdmin ? null : target.userId,
          role: isAdmin ? "admin" : null,
          kind: input.kind,
          title: input.title,
          body: input.body,
          url: input.url,
          bookingId: input.bookingId ?? null,
          createdAt: new Date(),
          readAt: null,
        },
      ],
      { session },
    );
    if (!row) return;
    const dto = toDto(row);
    if (isAdmin) realtime.toAdmins(RT.notificationNew, dto);
    else realtime.toUser(target.userId, RT.notificationNew, dto);
  } catch {
    // Deliberately swallowed: see the note above.
  }
}

/** One page of someone's feed, newest first, with the unread count for the badge. */
export async function feedPage(who: { userId: Types.ObjectId | string; isAdmin: boolean }, { before, limit = 20 }: { before?: Date; limit?: number }): Promise<NotificationPage> {
  const mine = who.isAdmin ? { $or: [{ userId: who.userId }, { role: "admin" as const }] } : { userId: who.userId };
  const query = before ? { ...mine, createdAt: { $lt: before } } : mine;

  const [rows, unread] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).limit(limit + 1).lean(),
    Notification.countDocuments({ ...mine, readAt: null }),
  ]);

  const page = rows.slice(0, limit);
  return {
    items: page.map(toDto),
    nextBefore: rows.length > limit ? (page.at(-1)?.createdAt.toISOString() ?? null) : null,
    unread,
  };
}

export async function unreadCount(who: { userId: Types.ObjectId | string; isAdmin: boolean }): Promise<number> {
  const mine = who.isAdmin ? { $or: [{ userId: who.userId }, { role: "admin" as const }] } : { userId: who.userId };
  return Notification.countDocuments({ ...mine, readAt: null });
}

/** Marks one notification read, or every unread one when no id is given. */
export async function markRead(who: { userId: Types.ObjectId | string; isAdmin: boolean }, id?: string): Promise<number> {
  const mine = who.isAdmin ? { $or: [{ userId: who.userId }, { role: "admin" as const }] } : { userId: who.userId };
  const query = id ? { ...mine, _id: id, readAt: null } : { ...mine, readAt: null };
  const result = await Notification.updateMany(query, { $set: { readAt: new Date() } });
  return result.modifiedCount;
}
