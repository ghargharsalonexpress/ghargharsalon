import { z } from "zod";
import type { BookingStatus } from "./booking";
import type { Localized } from "./catalog";
import { V } from "./validation";

/** Plan A8: an offer to one professional, open for the accept window. */
export const OFFER_STATUSES = ["pending", "accepted", "declined", "expired", "revoked"] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const DECLINE_REASONS = ["too_far", "busy", "skills", "other"] as const;
export type DeclineReason = (typeof DECLINE_REASONS)[number];

/**
 * What a professional sees on a job alert (plan Phase 6 UX): where roughly, how far, what,
 * and what they earn. The exact address and the customer come only after accepting.
 */
export interface OfferDto {
  id: string;
  status: OfferStatus;
  sentAt: string;
  expiresAt: string;
  bookingId: string;
  bookingNumber: string;
  /** Area only, e.g. "Sector 15, Faridabad". */
  locality: string;
  distanceMeters: number;
  etaMinutes: { min: number; max: number };
  items: Array<{ name: Localized; tierLabel: Localized; tierCount: number; quantity: number }>;
  totalDurationMin: number;
  /** After commission: what lands in their earnings. */
  earningsPaise: number;
  /** True when someone on the team sent it directly. */
  direct: boolean;
}

export const declineOfferSchema = z.strictObject({ reason: z.enum(DECLINE_REASONS, V.invalid).optional() });

export const adminOfferSchema = z.strictObject({ professionalId: z.string(V.invalid).regex(/^[a-f0-9]{24}$/, V.invalid) });

// ---------- real-time events (plan C8; Socket.IO at /rt) ----------

export const RT_PATH = "/rt";

export const RT = {
  /** To a professional: a new job alert. */
  offerNew: "offer:new",
  /** To a professional: an alert ended (taken, expired, revoked). */
  offerClosed: "offer:closed",
  /** To everyone watching a booking: something changed; fetch it again. */
  bookingUpdated: "booking:updated",
  /** To a booking's watchers while the professional is on the way. */
  bookingLocation: "booking:location",
  /** To admins: something on the live board changed. */
  adminOps: "admin:ops",
  /** To one person, or to admins: a new row for the bell. */
  notificationNew: "notification:new",
} as const;

export interface BookingUpdatedEvent {
  bookingId: string;
  status: BookingStatus;
  version: number;
}

export interface OfferClosedEvent {
  offerId: string;
  bookingId: string;
  reason: "taken" | "expired" | "revoked" | "accepted" | "declined";
}

export interface BookingLocationEvent {
  bookingId: string;
  lat: number;
  lng: number;
  heading: number | null;
  at: string;
}
