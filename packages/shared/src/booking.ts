import { z } from "zod";
import type { ImageRef, Localized } from "./catalog";
import { cartLineSchema, type Totals } from "./pricing";
import { type GeoPoint, geoPointSchema, locationFixSchema } from "./professional";
import { V } from "./validation";

/** Plan A8: one booking moves through these states; the timeline records each step. */
export const BOOKING_STATUSES = [
  "awaiting_payment",
  "searching",
  "accepted",
  "arrived",
  "in_progress",
  "completed",
  "cancelled",
  "no_professional_found",
  "expired",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const ACTIVE_STATUSES: ReadonlyArray<BookingStatus> = ["awaiting_payment", "searching", "accepted", "arrived", "in_progress"];
/** Phones are visible to each other only in these states (plan A7, ADR-0016). */
export const REVEAL_STATUSES: ReadonlyArray<BookingStatus> = ["accepted", "arrived", "in_progress"];

export const PREFERENCES = ["any", "female", "male"] as const;
export type Preference = (typeof PREFERENCES)[number];

const objectId = z.string(V.invalid).regex(/^[a-f0-9]{24}$/, V.invalid);

// ---------- addresses (plan W3) ----------

export const ADDRESS_LABELS = ["home", "work", "other"] as const;
export type AddressLabel = (typeof ADDRESS_LABELS)[number];

export const pincodeSchema = z.string(V.required).trim().min(1, V.required).regex(/^[1-9]\d{5}$/, V.pincode);

export const addressInputSchema = z.strictObject({
  label: z.enum(ADDRESS_LABELS),
  /** Flat or house number. */
  house: z.string(V.required).trim().min(1, V.required).max(80, V.invalid),
  /** Building, society or tower. */
  building: z.string(V.invalid).trim().max(120, V.invalid),
  /** Street, sector or area. */
  street: z.string(V.required).trim().min(2, V.required).max(160, V.invalid),
  landmark: z.string(V.invalid).trim().max(120, V.invalid),
  city: z.string(V.required).trim().min(2, V.required).max(80, V.invalid),
  pincode: pincodeSchema,
  /** The confirmed pin; professionals navigate to this. */
  location: geoPointSchema,
  placeId: z.string().max(300).nullable(),
  isDefault: z.boolean(),
});
export type AddressInput = z.input<typeof addressInputSchema>;
export type AddressData = z.output<typeof addressInputSchema>;

export interface AddressDto extends AddressData {
  id: string;
}

// ---------- availability (plan C6) ----------

export const quoteRequestSchema = z.strictObject({
  location: geoPointSchema,
  lines: z.array(cartLineSchema).min(1, V.required).max(30),
  preference: z.enum(PREFERENCES),
});
export type QuoteRequest = z.input<typeof quoteRequestSchema>;

export const QUOTE_REASONS = ["outside_area", "outside_hours", "none_free", "skill_unavailable"] as const;
export type QuoteReason = (typeof QUOTE_REASONS)[number];

export interface QuoteDto {
  available: boolean;
  reason: QuoteReason | null;
  /** "Arrives in 12–18 min" (a range, never false precision, plan A6). */
  etaMinutes: { min: number; max: number } | null;
  quoteId: string | null;
  expiresAt: string | null;
  /** Outside hours: when we open next. */
  opensAt: string | null;
}

// ---------- bookings ----------

export const createBookingSchema = z.strictObject({
  quoteId: objectId,
  addressId: objectId,
  preference: z.enum(PREFERENCES),
  lines: z.array(cartLineSchema).min(1, V.required).max(30),
  /** For the professional, e.g. "Ring the bell twice". */
  note: z.string(V.invalid).trim().max(300, V.invalid).optional(),
});
export type CreateBookingInput = z.input<typeof createBookingSchema>;

export const paymentVerifySchema = z.strictObject({
  orderId: z.string(V.invalid).min(5).max(100),
  paymentId: z.string(V.invalid).min(5).max(100),
  signature: z.string(V.invalid).min(10).max(200),
});
export type PaymentVerifyInput = z.infer<typeof paymentVerifySchema>;

export interface BookingItemDto {
  serviceSlug: string;
  tierId: string;
  name: Localized;
  tierLabel: Localized;
  tierCount: number;
  unitPricePaise: number;
  quantity: number;
  linePaise: number;
  durationMin: number;
}

export interface BookingPricingDto extends Totals {
  gstRateBps: number;
  pricesIncludeGst: boolean;
}

export interface BookingAddressDto {
  label: AddressLabel;
  house: string;
  building: string;
  street: string;
  landmark: string;
  city: string;
  pincode: string;
  location: GeoPoint;
}

export interface BookingProfessionalDto {
  id: string;
  name: string;
  photo: ImageRef | null;
  gender: "female" | "male";
  rating: number | null;
  ratingCount: number;
  /** Only between accept and completion (plan A7). */
  phone: string | null;
}

export type PaymentProvider = "razorpay" | "fake";

export interface BookingPaymentDto {
  provider: PaymentProvider;
  orderId: string;
  /** Razorpay key id for Checkout; null for the fake provider. */
  keyId: string | null;
  amountPaise: number;
  status: "created" | "captured" | "failed";
}

export interface BookingRefundDto {
  amountPaise: number;
  status: "pending" | "processed" | "failed";
  reason: string;
  createdAt: string;
}

export interface BookingDto {
  id: string;
  number: string;
  status: BookingStatus;
  createdAt: string;
  /** Unpaid bookings expire (plan A8: 15 minutes). */
  paymentExpiresAt: string | null;
  items: BookingItemDto[];
  pricing: BookingPricingDto;
  address: BookingAddressDto;
  preference: Preference;
  note: string;
  timeline: Array<{ status: BookingStatus; at: string }>;
  search: { startedAt: string; deadlineAt: string } | null;
  professional: BookingProfessionalDto | null;
  eta: { minMinutes: number; maxMinutes: number; at: string } | null;
  /** The start code, shown to the customer only, from accept until the service starts. */
  otp: string | null;
  /** Last professional location the viewer may see (accepted/arrived). */
  tracking: { lat: number; lng: number; heading: number | null; at: string } | null;
  cancellation: { by: "customer" | "professional" | "admin" | "system"; reason: string; feePaise: number; at: string } | null;
  refund: BookingRefundDto | null;
  payment: BookingPaymentDto | null;
  review: { rating: number; comment: string } | null;
  invoiceNumber: string | null;
}

export interface BookingSummaryDto {
  id: string;
  number: string;
  status: BookingStatus;
  createdAt: string;
  totalPaise: number;
  /** "Fruit facial + 2 more" in the viewer's language is built on the web. */
  items: Array<{ name: Localized; quantity: number }>;
  professionalName: string | null;
}

/** Location updates from the assigned professional while accepted/arrived (plan C8). */
export const trackingUpdateSchema = z.strictObject({
  location: locationFixSchema,
  heading: z.number().min(0).max(360).nullable().optional(),
});
