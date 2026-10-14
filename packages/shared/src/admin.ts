import { z } from "zod";
import type { BookingDto, BookingStatus, BookingSummaryDto } from "./booking";
import type { OfferStatus } from "./offer";
import type { PresenceState } from "./professional";
import { V } from "./validation";

/**
 * Admin operations (plan Phase 8): the dashboard, the live board, bookings with their full
 * story, customers, money, reviews and the audit trail. The admin reads English (plan A3).
 */

/** A page of rows for admin tables (plan C12: offset pagination, at most 100). */
export interface Paged<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const ADMIN_PAGE_SIZE = 25;

// ---------- dashboard and alerts ----------

export const ALERT_KINDS = ["no_match", "refund_failed", "late", "otp_locked", "pro_cancelled", "slow_search"] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

export interface AdminAlertDto {
  id: string;
  kind: AlertKind;
  bookingId: string | null;
  bookingNumber: string | null;
  message: string;
  createdAt: string;
  resolvedAt: string | null;
}

export interface AdminDashboardDto {
  /** Since midnight IST. */
  today: {
    bookings: number;
    paid: number;
    completed: number;
    cancelled: number;
    noMatch: number;
    /** Paid and not refunded in full, in paise. */
    revenuePaise: number;
    /** Share of paid bookings that found nobody (0–1), null before the first paid booking. */
    noMatchRate: number | null;
    /** Median seconds from payment to the first accept, null when nothing was accepted yet. */
    medianAcceptSeconds: number | null;
  };
  now: {
    searching: number;
    /** Accepted, arrived or in progress. */
    live: number;
    onlineProfessionals: number;
    busyProfessionals: number;
  };
  alerts: AdminAlertDto[];
}

// ---------- live board ----------

export interface AdminLiveDto {
  professionals: Array<{
    id: string;
    name: string;
    state: PresenceState;
    location: { lat: number; lng: number } | null;
    locationAt: string | null;
    activeBooking: { id: string; number: string } | null;
  }>;
  bookings: Array<{
    id: string;
    number: string;
    status: BookingStatus;
    area: string;
    location: { lat: number; lng: number };
    professionalName: string | null;
    createdAt: string;
    /** Searching: when the search gives up. */
    deadlineAt: string | null;
  }>;
  at: string;
}

// ---------- bookings ----------

export const ADMIN_BOOKING_VIEWS = ["all", "active", "searching", "attention", "completed", "cancelled"] as const;
export type AdminBookingView = (typeof ADMIN_BOOKING_VIEWS)[number];

export interface AdminBookingRow {
  id: string;
  number: string;
  status: BookingStatus;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  professionalName: string | null;
  area: string;
  totalPaise: number;
  refundStatus: "queued" | "pending" | "processed" | "failed" | null;
  /** An open alert for this booking. */
  alert: AlertKind | null;
}

export interface AdminBookingDetailDto {
  booking: BookingDto;
  customer: { id: string; name: string; phone: string; email: string | null; status: string };
  history: Array<{ status: BookingStatus; at: string; by: string }>;
  offers: Array<{
    id: string;
    professionalId: string;
    professionalName: string;
    round: number;
    status: OfferStatus;
    sentAt: string;
    respondedAt: string | null;
    declineReason: string | null;
    distanceMeters: number;
    pushSent: number;
  }>;
  payments: Array<{ orderId: string; paymentId: string | null; status: string; amountPaise: number; method: string | null; createdAt: string; capturedAt: string | null }>;
  refunds: AdminRefundRow[];
  notes: Array<{ text: string; byName: string; at: string }>;
  alerts: AdminAlertDto[];
  /** Captured minus refunded: the most a manual refund can return. */
  refundablePaise: number;
  /** Five wrong start codes lock the start (plan A8); the team can unlock after calling the customer. */
  otp: { attempts: number; locked: boolean } | null;
}

export interface AdminEligibleProDto {
  id: string;
  name: string;
  distanceMeters: number;
  rating: number | null;
  jobsToday: number;
}

export const adminNoteSchema = z.strictObject({ text: z.string(V.required).trim().min(2, V.required).max(1000, V.invalid) });

export const adminRefundSchema = z.strictObject({
  amountPaise: z.number(V.required).int(V.invalid).min(100, V.invalid),
  reason: z.string(V.required).trim().min(3, V.required).max(300, V.invalid),
});
export type AdminRefundInput = z.input<typeof adminRefundSchema>;

export const adminCancelSchema = z.strictObject({
  reason: z.string(V.required).trim().min(3, V.required).max(300, V.invalid),
  /** Kept from the payment; the rest is refunded. */
  feePaise: z.number(V.required).int(V.invalid).min(0, V.invalid),
});
export type AdminCancelInput = z.input<typeof adminCancelSchema>;

// ---------- customers ----------

export interface AdminCustomerRow {
  id: string;
  name: string;
  /** Customers may sign up without one (mobile login, ADR-0020). */
  email: string | null;
  phone: string;
  status: "active" | "blocked";
  createdAt: string;
  bookings: number;
  lastBookingAt: string | null;
}

export interface AdminCustomerDetailDto {
  customer: AdminCustomerRow & { locale: string };
  bookings: BookingSummaryDto[];
  spentPaise: number;
}

export const customerStatusSchema = z.strictObject({
  status: z.enum(["active", "blocked"]),
  reason: z.string(V.required).trim().min(3, V.required).max(300, V.invalid),
});

// ---------- money ----------

export interface AdminPaymentRow {
  id: string;
  bookingId: string;
  bookingNumber: string;
  provider: string;
  orderId: string;
  paymentId: string | null;
  status: string;
  amountPaise: number;
  method: string | null;
  createdAt: string;
  capturedAt: string | null;
}

export interface AdminRefundRow {
  id: string;
  bookingId: string;
  bookingNumber: string;
  amountPaise: number;
  status: "queued" | "pending" | "processed" | "failed";
  reason: string;
  initiatedBy: string;
  createdAt: string;
  processedAt: string | null;
  lastError: string | null;
}

// ---------- reviews ----------

export interface AdminReviewRow {
  bookingId: string;
  bookingNumber: string;
  rating: number;
  comment: string;
  at: string;
  hidden: boolean;
  customerName: string;
  professionalName: string | null;
}

export const reviewVisibilitySchema = z.strictObject({ hidden: z.boolean() });

// ---------- payouts (plan A4: paid outside the platform, marked here) ----------

export interface AdminProPerformanceDto {
  completed: number;
  cancelledByPro: number;
  offers: number;
  accepted: number;
  /** accepted ÷ offers that got an answer or expired (0–1); null without offers. */
  acceptRate: number | null;
  rating: number | null;
  ratingCount: number;
  pendingPayoutPaise: number;
  paidOutPaise: number;
  recentJobs: Array<{ id: string; number: string; status: BookingStatus; completedAt: string | null; netPaise: number; payoutStatus: "pending" | "paid" | null }>;
}

// ---------- audit ----------

export interface AdminAuditRow {
  id: string;
  at: string;
  actorName: string;
  actorRole: string;
  action: string;
  entity: { type: string; id: string };
  before: unknown;
  after: unknown;
}
