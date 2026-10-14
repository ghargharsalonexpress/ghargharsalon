import { type ImageRef, PRESENCE_STATES, type PresenceState, PRO_GENDERS, type ProGender, type Skill, SKILLS } from "@brand/shared";
import { type HydratedDocument, model, Schema, type Types } from "mongoose";

/** GeoJSON point: coordinates are [longitude, latitude] (MongoDB 2dsphere). */
export interface GeoJsonPoint {
  type: "Point";
  coordinates: [number, number];
}

export interface PresenceFields {
  state: PresenceState;
  since: Date | null;
  lastHeartbeatAt: Date | null;
  location: GeoJsonPoint | null;
  locationAt: Date | null;
  accuracyM: number | null;
  /** Set while on a job (Phase 6 claims it atomically on accept). */
  activeBookingId: Types.ObjectId | null;
}

export interface ProfessionalFields {
  userId: Types.ObjectId;
  gender: ProGender;
  skills: Skill[];
  baseArea: string;
  travelRadiusKm: number;
  photo: ImageRef | null;
  verificationNote: string;
  verification: { at: Date; by: Types.ObjectId; byName: string } | null;
  presence: PresenceFields;
  stats: { rating: number | null; ratingCount: number; jobsToday: number; jobsTodayDate: string | null; lastCompletedAt: Date | null; offers: number; accepted: number; cancellations: number };
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const pointSchema = new Schema<GeoJsonPoint>(
  {
    type: { type: String, enum: ["Point"], required: true },
    coordinates: { type: [Number], required: true },
  },
  { _id: false },
);

const professionalSchema = new Schema<ProfessionalFields>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    gender: { type: String, enum: PRO_GENDERS, required: true },
    skills: { type: [String], enum: SKILLS, required: true },
    baseArea: { type: String, required: true, trim: true },
    travelRadiusKm: { type: Number, required: true, min: 1, max: 25 },
    photo: { type: Schema.Types.Mixed, default: null },
    verificationNote: { type: String, default: "" },
    verification: {
      type: new Schema({ at: { type: Date, required: true }, by: { type: Schema.Types.ObjectId, ref: "User", required: true }, byName: { type: String, required: true } }, { _id: false }),
      default: null,
    },
    presence: {
      state: { type: String, enum: PRESENCE_STATES, default: "offline" },
      since: { type: Date, default: null },
      lastHeartbeatAt: { type: Date, default: null },
      location: { type: pointSchema, default: null },
      locationAt: { type: Date, default: null },
      accuracyM: { type: Number, default: null },
      activeBookingId: { type: Schema.Types.ObjectId, ref: "Booking", default: null },
    },
    stats: {
      rating: { type: Number, default: null },
      ratingCount: { type: Number, default: 0 },
      jobsToday: { type: Number, default: 0 },
      jobsTodayDate: { type: String, default: null },
      lastCompletedAt: { type: Date, default: null },
      offers: { type: Number, default: 0 },
      accepted: { type: Number, default: 0 },
      /** Jobs they gave up after accepting (plan C6: repeat cancellations are flagged). */
      cancellations: { type: Number, default: 0 },
    },
    version: { type: Number, default: 1 },
  },
  { timestamps: true, minimize: false },
);

professionalSchema.index({ userId: 1 }, { unique: true });
// Nearest free professionals (plan C6: $geoNear on presence.location).
professionalSchema.index({ "presence.location": "2dsphere" });
professionalSchema.index({ "presence.state": 1, gender: 1 });
// The presence sweeper's queries.
professionalSchema.index({ "presence.state": 1, "presence.lastHeartbeatAt": 1 });

export type ProfessionalDoc = HydratedDocument<ProfessionalFields>;
export const Professional = model<ProfessionalFields>("Professional", professionalSchema, "professional_profiles");

export const toPoint = (lat: number, lng: number): GeoJsonPoint => ({ type: "Point", coordinates: [lng, lat] });
