import { z } from "zod";
import { V } from "./validation";

/**
 * The notification feed behind the bell (plan C10). One row per person per thing that happened,
 * with its own read state — distinct from an admin `Alert`, which is a team workflow with
 * open/resolved semantics and deliberately collapses duplicates.
 */
export const NOTIFICATION_KINDS = [
  // Customer
  "payment_received",
  "professional_on_the_way",
  "professional_arrived",
  "service_started",
  "booking_completed",
  "booking_cancelled",
  "refund_started",
  "refund_landed",
  "searching_again",
  "rating_reminder",
  // Professional
  "job_offer",
  "job_taken",
  "job_assigned",
  "job_cancelled",
  "verified",
  "payout_paid",
  "weekly_earnings",
  "review_received",
  // Admin
  "admin_alert",
  "contact_message",
  "area_request",
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export interface NotificationDto {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** Where tapping it goes, e.g. "/bookings/abc" or "/admin/bookings/abc". */
  url: string;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationPage {
  items: NotificationDto[];
  /** Pass as `before` to fetch the next page; null when there is no more. */
  nextBefore: string | null;
  unread: number;
}

/** `GET /v1/me/notifications` */
export const notificationPageSchema = z.strictObject({
  before: z.iso.datetime().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

/** `POST /v1/me/notifications/read` — one id, or every unread when omitted. */
export const notificationReadSchema = z.strictObject({
  id: z.string().regex(/^[0-9a-f]{24}$/, V.invalid).optional(),
});

export type NotificationPageQuery = z.output<typeof notificationPageSchema>;
export type NotificationReadInput = z.output<typeof notificationReadSchema>;
