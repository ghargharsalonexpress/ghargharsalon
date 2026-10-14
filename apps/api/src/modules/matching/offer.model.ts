import { DECLINE_REASONS, OFFER_STATUSES, type OfferStatus } from "@brand/shared";
import { type HydratedDocument, model, Schema, type Types } from "mongoose";

export interface OfferFields {
  bookingId: Types.ObjectId;
  professionalId: Types.ObjectId;
  /** 0 for an offer an admin sent directly. */
  round: number;
  status: OfferStatus;
  sentAt: Date;
  expiresAt: Date;
  respondedAt: Date | null;
  declineReason: (typeof DECLINE_REASONS)[number] | null;
  distanceMeters: number;
  etaMin: number;
  etaMax: number;
  earningsPaise: number;
  pushSent: number;
}

const offerSchema = new Schema<OfferFields>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
    professionalId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    round: { type: Number, required: true },
    status: { type: String, enum: OFFER_STATUSES, default: "pending" },
    sentAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    respondedAt: { type: Date, default: null },
    declineReason: { type: String, enum: [...DECLINE_REASONS, null], default: null },
    distanceMeters: Number,
    etaMin: Number,
    etaMax: Number,
    earningsPaise: Number,
    pushSent: { type: Number, default: 0 },
  },
  { versionKey: false },
);
// One offer per professional per booking (plan C5).
offerSchema.index({ bookingId: 1, professionalId: 1 }, { unique: true });
offerSchema.index({ status: 1, expiresAt: 1 });
offerSchema.index({ professionalId: 1, status: 1 });
offerSchema.index({ professionalId: 1, sentAt: -1 });

export type OfferDoc = HydratedDocument<OfferFields>;
export const Offer = model<OfferFields>("Offer", offerSchema, "offers");
