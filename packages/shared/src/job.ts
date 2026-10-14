import { z } from "zod";
import type { BookingAddressDto, BookingItemDto, BookingStatus } from "./booking";
import { locationFixSchema } from "./professional";
import { V } from "./validation";

/** What the assigned professional sees for a job (plan Phase 7). The address and phone only after accept. */
export interface ProJobDto {
  id: string;
  number: string;
  status: BookingStatus;
  customer: { firstName: string; phone: string | null };
  address: BookingAddressDto;
  items: BookingItemDto[];
  note: string;
  eta: { minMinutes: number; maxMinutes: number; at: string } | null;
  acceptedAt: string | null;
  arrivedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  /** Sum of the services' durations. */
  expectedDurationMin: number;
  earningsPaise: number;
  otpAttemptsLeft: number;
  otpLocked: boolean;
  /** When "Customer not reachable" becomes available (arrival + the wait in settings). */
  noShowAvailableAt: string | null;
  callAttempts: number;
  cancellation: { by: string; reason: string } | null;
}

export interface ProJobSummaryDto {
  id: string;
  number: string;
  status: BookingStatus;
  locality: string;
  acceptedAt: string | null;
  completedAt: string | null;
  earningsPaise: number;
}

export interface ProEarningsDto {
  todayPaise: number;
  weekPaise: number;
  pendingPayoutPaise: number;
  jobs: Array<{ id: string; number: string; completedAt: string; grossPaise: number; commissionPaise: number; netPaise: number; payoutStatus: "pending" | "paid" }>;
}

export const arrivedSchema = z.strictObject({
  location: locationFixSchema.optional(),
  /** "I'm at the address" when the phone says they're more than 200 m away (plan A8). */
  confirmFar: z.boolean().optional(),
});

export const startJobSchema = z.strictObject({ otp: z.string(V.required).regex(/^\d{4}$/, V.otp) });

export const completeJobSchema = z.strictObject({
  /** Completing before half the expected time asks for confirmation first (plan A8). */
  confirmEarly: z.boolean().optional(),
});

export const PRO_CANCEL_REASONS = ["emergency", "vehicle", "unsafe", "wrong_address", "other"] as const;
export const proCancelSchema = z.strictObject({ reason: z.enum(PRO_CANCEL_REASONS, V.required), note: z.string(V.invalid).trim().max(300, V.invalid).optional() });

export const jobLocationSchema = z.strictObject({
  location: locationFixSchema,
  heading: z.number().min(0).max(360).nullable().optional(),
});

export const CUSTOMER_CANCEL_REASONS = ["changed_plans", "too_late", "booked_by_mistake", "other"] as const;
export const customerCancelSchema = z.strictObject({ reason: z.enum(CUSTOMER_CANCEL_REASONS, V.required) });

export interface CancelPreviewDto {
  allowed: boolean;
  feePaise: number;
  refundPaise: number;
  /** Why the fee is what it is: free while searching, free because the professional is late, or the fee after accept. */
  basis: "unpaid" | "searching" | "professional_late" | "after_accept" | "not_allowed";
}

export const reviewSchema = z.strictObject({
  rating: z.number(V.required).int(V.invalid).min(1, V.required).max(5, V.invalid),
  comment: z.string(V.invalid).trim().max(500, V.invalid),
});

/** A tax invoice (plan C9): printable HTML on the web; numbers are per financial year. */
export interface InvoiceDto {
  number: string;
  issuedAt: string;
  bookingNumber: string;
  seller: { name: string; address: string; gstin: string; phone: string; email: string };
  buyer: { name: string; address: string; phone: string };
  lines: Array<{ description: string; sac: string; quantity: number; taxablePaise: number; gstPaise: number; totalPaise: number }>;
  taxablePaise: number;
  gstRateBps: number;
  gstPaise: number;
  totalPaise: number;
  paymentId: string | null;
}
