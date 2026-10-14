import type { GeoPoint, Preference, QuoteDto, QuoteReason, QuoteRequest, quoteRequestSchema, Settings, Skill, z } from "@brand/shared";
import { model, Schema, Types } from "mongoose";
import { AppError } from "../../errors";
import { Service } from "../catalog/catalog.models";
import { Professional } from "../professionals/professional.model";
import { User } from "../users/user.model";
import { etaRange, isOpen, nextOpening, pointInRing } from "./geo";

type QuoteInput = z.output<typeof quoteRequestSchema>;

/** A quote holds for 2 minutes; booking re-checks it (plan C6). */
export const QUOTE_TTL_MS = 2 * 60_000;

interface QuoteFields {
  userId: Types.ObjectId | null;
  location: GeoPoint;
  skills: Skill[];
  preference: Preference;
  etaMin: number;
  etaMax: number;
  expiresAt: Date;
}

const quoteSchema = new Schema<QuoteFields>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    location: { lat: Number, lng: Number },
    skills: [String],
    preference: String,
    etaMin: Number,
    etaMax: Number,
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
);
// Expired quotes disappear on their own (an hour later, for debugging a failed checkout).
quoteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });
export const Quote = model<QuoteFields>("Quote", quoteSchema, "quotes");

export interface EligibleProfessional {
  userId: Types.ObjectId;
  distance: number;
  gender: "female" | "male";
  rating: number | null;
  jobsToday: number;
  lastCompletedAt: Date | null;
}

/**
 * Free, verified, recently heard-from professionals near a point who have every skill the
 * booking needs and match the gender preference (plan C6). Nearest first.
 */
export async function findEligible({
  location,
  skills,
  preference,
  settings,
  exclude = [],
  limit = 20,
}: {
  location: GeoPoint;
  skills: Skill[];
  preference: Preference;
  settings: Settings;
  exclude?: ReadonlyArray<Types.ObjectId | string>;
  limit?: number;
}): Promise<EligibleProfessional[]> {
  const heardSince = new Date(Date.now() - settings.matching.stalePresenceSeconds * 1000);
  const rows = await Professional.aggregate<{
    userId: Types.ObjectId;
    distance: number;
    gender: "female" | "male";
    travelRadiusKm: number;
    stats: { rating: number | null; jobsToday: number; lastCompletedAt: Date | null };
  }>([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [location.lng, location.lat] },
        key: "presence.location",
        distanceField: "distance",
        maxDistance: settings.matching.radiusKm * 1000,
        spherical: true,
        query: {
          "presence.state": "available",
          "presence.lastHeartbeatAt": { $gte: heardSince },
          "presence.activeBookingId": null,
          verification: { $ne: null },
          // An empty $all matches nothing, so the filter only applies when skills are needed.
          ...(skills.length ? { skills: { $all: skills } } : {}),
          ...(preference === "any" ? {} : { gender: preference }),
          ...(exclude.length ? { userId: { $nin: exclude.map((id) => new Types.ObjectId(String(id))) } } : {}),
        },
      },
    },
    // Each professional's own travel limit also applies.
    { $match: { $expr: { $lte: ["$distance", { $multiply: ["$travelRadiusKm", 1000] }] } } },
    { $limit: limit * 2 },
    { $project: { userId: 1, distance: 1, gender: 1, travelRadiusKm: 1, stats: 1 } },
  ]);
  if (rows.length === 0) return [];
  const active = new Set((await User.find({ _id: { $in: rows.map((row) => row.userId) }, status: "active" }, { _id: 1 }).lean()).map((user) => String(user._id)));
  return rows
    .filter((row) => active.has(String(row.userId)))
    .slice(0, limit)
    .map((row) => ({ userId: row.userId, distance: row.distance, gender: row.gender, rating: row.stats.rating, jobsToday: row.stats.jobsToday, lastCompletedAt: row.stats.lastCompletedAt }));
}

/** The skills a cart needs: every category skill of every service in it. */
export async function skillsFor(lines: QuoteRequest["lines"]): Promise<Skill[]> {
  const services = await Service.find({ slug: { $in: lines.map((line) => line.serviceSlug) }, active: true }, { requiredSkills: 1, slug: 1 }).lean();
  if (services.length !== new Set(lines.map((line) => line.serviceSlug)).size) throw new AppError("CART_UNAVAILABLE");
  return [...new Set(services.flatMap((service) => service.requiredSkills))];
}

export function inActiveArea(location: GeoPoint, settings: Settings): boolean {
  const areas = settings.operations.activeAreas;
  // No areas configured means no limit (development); production settings always have one.
  return areas.length === 0 || areas.some((area) => pointInRing(location, area.polygon));
}

/** POST /v1/availability/quote (plan C6): can we serve this place, now, and how soon? */
export async function quote(userId: Types.ObjectId | null, input: QuoteInput, settings: Settings, now = new Date()): Promise<QuoteDto> {
  const closed = (reason: QuoteReason, opensAt: Date | null = null): QuoteDto => ({
    available: false,
    reason,
    etaMinutes: null,
    quoteId: null,
    expiresAt: null,
    opensAt: opensAt?.toISOString() ?? null,
  });

  if (!inActiveArea(input.location, settings)) return closed("outside_area");
  if (!isOpen(now, settings.operations.serviceHours)) return closed("outside_hours", nextOpening(now, settings.operations.serviceHours));

  const skills = await skillsFor(input.lines);
  const eligible = await findEligible({ location: input.location, skills, preference: input.preference, settings, limit: 1 });
  if (eligible.length === 0) {
    // Someone is free but lacks a skill: say so, it's a different message (plan C6).
    const anyFree = await findEligible({ location: input.location, skills: [], preference: input.preference, settings, limit: 1 });
    return closed(anyFree.length > 0 ? "skill_unavailable" : "none_free");
  }

  const eta = etaRange(eligible[0]!.distance);
  const expiresAt = new Date(now.getTime() + QUOTE_TTL_MS);
  const doc = await Quote.create({ userId, location: input.location, skills, preference: input.preference, etaMin: eta.min, etaMax: eta.max, expiresAt });
  return { available: true, reason: null, etaMinutes: eta, quoteId: String(doc._id), expiresAt: expiresAt.toISOString(), opensAt: null };
}
