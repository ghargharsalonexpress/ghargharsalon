import { ADDRESS_LABELS, BOOKING_STATUSES, type BookingStatus, type Localized, PREFERENCES, type Preference, type Skill } from "@brand/shared";
import { type HydratedDocument, model, Schema, type Types } from "mongoose";
import type { GeoJsonPoint } from "../professionals/professional.model";

export type Actor = "customer" | "professional" | "admin" | "system";

export interface BookingItem {
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

export interface BookingFields {
  number: string;
  customerId: Types.ObjectId;
  items: BookingItem[];
  skills: Skill[];
  pricing: {
    itemsPaise: number;
    platformFeePaise: number;
    taxablePaise: number;
    gstPaise: number;
    totalPaise: number;
    gstRateBps: number;
    pricesIncludeGst: boolean;
    commissionBps: number;
  };
  address: {
    label: (typeof ADDRESS_LABELS)[number];
    house: string;
    building: string;
    street: string;
    landmark: string;
    city: string;
    pincode: string;
    location: GeoJsonPoint;
  };
  preference: Preference;
  note: string;
  status: BookingStatus;
  statusHistory: Array<{ status: BookingStatus; at: Date; by: Actor }>;
  paymentExpiresAt: Date | null;
  /** Matching rounds (plan C6). */
  search: { round: number; startedAt: Date; deadlineAt: Date; offeredUserIds: Types.ObjectId[]; nextRoundAt: Date | null } | null;
  professionalId: Types.ObjectId | null;
  acceptedAt: Date | null;
  arrivedAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  eta: { min: number; max: number; at: Date; source: "estimate" | "routes" } | null;
  /** HMAC for checking, AES-GCM copy so the customer can see it again (plan C11). */
  otp: { hash: string; cipher: string; attempts: number; lockedAt: Date | null } | null;
  tracking: { point: GeoJsonPoint; heading: number | null; at: Date } | null;
  lateAlertAt: Date | null;
  /** Calls the professional logged before "Customer not reachable" (plan A8). */
  callAttempts: number;
  cancellation: { by: Actor; reason: string; feePaise: number; at: Date } | null;
  refundId: Types.ObjectId | null;
  earnings: { grossPaise: number; commissionPaise: number; netPaise: number; payoutStatus: "pending" | "paid"; paidAt: Date | null } | null;
  invoiceNumber: string | null;
  review: { rating: number; comment: string; at: Date; hidden: boolean } | null;
  /** Internal notes from the team (plan W14), never shown to the customer or professional. */
  notes: Array<{ text: string; byId: Types.ObjectId; byName: string; at: Date }>;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const pointSchema = new Schema<GeoJsonPoint>({ type: { type: String, enum: ["Point"], required: true }, coordinates: { type: [Number], required: true } }, { _id: false });
const localized = { en: { type: String, default: "" }, hi: { type: String, default: "" } };

const bookingSchema = new Schema<BookingFields>(
  {
    number: { type: String, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        _id: false,
        serviceSlug: String,
        tierId: String,
        name: localized,
        tierLabel: localized,
        tierCount: Number,
        unitPricePaise: Number,
        quantity: Number,
        linePaise: Number,
        durationMin: Number,
      },
    ],
    skills: [String],
    pricing: {
      itemsPaise: Number,
      platformFeePaise: Number,
      taxablePaise: Number,
      gstPaise: Number,
      totalPaise: Number,
      gstRateBps: Number,
      pricesIncludeGst: Boolean,
      commissionBps: Number,
    },
    address: {
      label: { type: String, enum: ADDRESS_LABELS },
      house: String,
      building: String,
      street: String,
      landmark: String,
      city: String,
      pincode: String,
      location: { type: pointSchema, required: true },
    },
    preference: { type: String, enum: PREFERENCES, required: true },
    note: { type: String, default: "" },
    status: { type: String, enum: BOOKING_STATUSES, required: true },
    statusHistory: [{ _id: false, status: { type: String, enum: BOOKING_STATUSES }, at: Date, by: String }],
    paymentExpiresAt: { type: Date, default: null },
    search: {
      type: new Schema(
        { round: Number, startedAt: Date, deadlineAt: Date, offeredUserIds: [{ type: Schema.Types.ObjectId, ref: "User" }], nextRoundAt: { type: Date, default: null } },
        { _id: false },
      ),
      default: null,
    },
    professionalId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    acceptedAt: { type: Date, default: null },
    arrivedAt: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    eta: { type: new Schema({ min: Number, max: Number, at: Date, source: String }, { _id: false }), default: null },
    otp: { type: new Schema({ hash: String, cipher: String, attempts: Number, lockedAt: { type: Date, default: null } }, { _id: false }), default: null },
    tracking: { type: new Schema({ point: pointSchema, heading: { type: Number, default: null }, at: Date }, { _id: false }), default: null },
    lateAlertAt: { type: Date, default: null },
    callAttempts: { type: Number, default: 0 },
    cancellation: { type: new Schema({ by: String, reason: String, feePaise: Number, at: Date }, { _id: false }), default: null },
    refundId: { type: Schema.Types.ObjectId, ref: "Refund", default: null },
    earnings: {
      type: new Schema({ grossPaise: Number, commissionPaise: Number, netPaise: Number, payoutStatus: String, paidAt: { type: Date, default: null } }, { _id: false }),
      default: null,
    },
    invoiceNumber: { type: String, default: null },
    review: { type: new Schema({ rating: Number, comment: String, at: Date, hidden: { type: Boolean, default: false } }, { _id: false }), default: null },
    notes: [{ _id: false, text: String, byId: { type: Schema.Types.ObjectId, ref: "User" }, byName: String, at: Date }],
    version: { type: Number, default: 1 },
  },
  { timestamps: true, minimize: false },
);

bookingSchema.index({ number: 1 }, { unique: true });
bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ professionalId: 1, createdAt: -1 });
// The sweeper's queries (plan C7): due searches, unpaid expiry.
bookingSchema.index({ status: 1, "search.deadlineAt": 1 });
bookingSchema.index({ status: 1, "search.nextRoundAt": 1 });
bookingSchema.index({ status: 1, paymentExpiresAt: 1 });
bookingSchema.index({ status: 1, createdAt: -1 });
// Admin lists (plan Phase 8): newest first, and reviews.
bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ "review.at": -1 }, { partialFilterExpression: { review: { $type: "object" } } });

export type BookingDoc = HydratedDocument<BookingFields>;
export const Booking = model<BookingFields>("Booking", bookingSchema, "bookings");
