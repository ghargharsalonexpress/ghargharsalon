import { NOTIFICATION_KINDS, type NotificationKind } from "@brand/shared";
import { model, Schema, type Types } from "mongoose";

/**
 * One row per person per thing that happened — the feed behind the bell (plan C10).
 *
 * Either `userId` (one person) or `role` (the whole team, used for admins, so an alert does not
 * fan out into a row per admin). An admin's read state is therefore shared with the team, which
 * matches how they already work an alert queue together.
 */
export interface NotificationFields {
  userId: Types.ObjectId | null;
  role: "admin" | null;
  kind: NotificationKind;
  title: string;
  body: string;
  url: string;
  bookingId: Types.ObjectId | null;
  createdAt: Date;
  readAt: Date | null;
}

const notificationSchema = new Schema<NotificationFields>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    role: { type: String, enum: ["admin"], default: null },
    kind: { type: String, enum: NOTIFICATION_KINDS, required: true },
    title: { type: String, required: true },
    // Some notifications are a title and nothing else, and "" fails Mongoose's `required`.
    body: { type: String, default: "" },
    url: { type: String, required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", default: null },
    createdAt: { type: Date, required: true },
    readAt: { type: Date, default: null },
  },
  { versionKey: false },
);

// The feed, newest first, for one person or for the team.
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ role: 1, createdAt: -1 });
// Read ones are history; 90 days is enough to answer "what happened last month".
notificationSchema.index({ readAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60, partialFilterExpression: { readAt: { $type: "date" } } });

export const Notification = model<NotificationFields>("Notification", notificationSchema, "notifications");
