import { z } from "zod";
import { emailSchema, languageSchema, nameSchema, phoneSchema } from "./auth";
import { type ImageRef, imageSchema, SKILLS, type Skill } from "./catalog";
import type { Language } from "./language";
import { V } from "./validation";

export const PRO_GENDERS = ["female", "male"] as const;
export type ProGender = (typeof PRO_GENDERS)[number];

/**
 * Presence (plan A8): Online plus heartbeats makes a professional available; a job makes
 * them busy; silence turns them stale (left out of matching), then offline.
 */
export const PRESENCE_STATES = ["offline", "available", "busy", "stale"] as const;
export type PresenceState = (typeof PRESENCE_STATES)[number];

export const PRESENCE_TIMING = {
  /** How often the panel reports while online and visible. */
  heartbeatSeconds: 20,
  /** Stale after settings.matching.stalePresenceSeconds (60 by default); offline after this. */
  offlineAfterSeconds: 300,
} as const;

export const geoPointSchema = z.strictObject({
  lat: z.number(V.invalid).min(-90, V.invalid).max(90, V.invalid),
  lng: z.number(V.invalid).min(-180, V.invalid).max(180, V.invalid),
});
export type GeoPoint = z.infer<typeof geoPointSchema>;

/** A browser location fix; accuracy in metres. Fixes worse than 100 m are ignored for tracking (plan C8). */
export const locationFixSchema = z.strictObject({
  lat: z.number(V.invalid).min(-90, V.invalid).max(90, V.invalid),
  lng: z.number(V.invalid).min(-180, V.invalid).max(180, V.invalid),
  accuracy: z.number(V.invalid).min(0, V.invalid).max(100_000, V.invalid),
});
export type LocationFix = z.infer<typeof locationFixSchema>;

/** What an admin enters from the professional's application (plan Phase 4, W11). */
export const professionalInputSchema = z.strictObject({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  gender: z.enum(PRO_GENDERS, V.required),
  skills: z.array(z.enum(SKILLS)).min(1, V.required).max(SKILLS.length),
  /** Where they usually start from, e.g. "Sector 15, Faridabad". */
  baseArea: z.string(V.required).trim().min(2, V.required).max(120, V.invalid),
  travelRadiusKm: z.number(V.invalid).int(V.invalid).min(1, V.invalid).max(25, V.invalid),
  /** Identity and work checked offline from the application documents (assumption A11). */
  verified: z.boolean(),
  verificationNote: z.string(V.invalid).trim().max(500, V.invalid),
  photo: imageSchema.nullable(),
  locale: languageSchema,
});
export type ProfessionalInput = z.input<typeof professionalInputSchema>;
export type ProfessionalData = z.output<typeof professionalInputSchema>;

export const professionalUpdateSchema = z.strictObject({ version: z.number().int().min(1), professional: professionalInputSchema });

export const professionalStatusSchema = z.strictObject({
  status: z.enum(["active", "suspended"]),
  reason: z.string(V.invalid).trim().max(300, V.invalid),
});

export interface PresenceDto {
  state: PresenceState;
  /** When the current state began. */
  since: string | null;
  lastHeartbeatAt: string | null;
  locationAt: string | null;
  /** The job they're on (accepted, arrived or in progress), so the panel can share location for it. */
  activeBookingId: string | null;
}

export interface ProfessionalDto {
  id: string;
  name: string;
  email: string;
  phone: string;
  locale: Language;
  gender: ProGender;
  skills: Skill[];
  baseArea: string;
  travelRadiusKm: number;
  verificationNote: string;
  photo: ImageRef | null;
  /** Account status: suspended professionals can't log in or get jobs. */
  status: "active" | "suspended";
  verifiedAt: string | null;
  verifiedBy: string | null;
  /** False until they open the set-password email. */
  passwordSet: boolean;
  presence: PresenceDto;
  /** Phones and browsers that can receive alerts. */
  devices: number;
  lastAlertAt: string | null;
  version: number;
  createdAt: string;
}

export type AdminProfessionalRow = Pick<ProfessionalDto, "id" | "name" | "phone" | "email" | "gender" | "skills" | "baseArea" | "status" | "verifiedAt" | "passwordSet" | "presence" | "devices">;

/** What the professional's own panel shows and needs. */
export interface ProSelfDto {
  name: string;
  phone: string;
  email: string;
  locale: Language;
  gender: ProGender;
  skills: Skill[];
  baseArea: string;
  travelRadiusKm: number;
  photo: ImageRef | null;
  verified: boolean;
  presence: PresenceDto;
  devices: number;
  /** The server's VAPID key for push subscriptions; null when alerts aren't set up on this server. */
  vapidPublicKey: string | null;
  heartbeatSeconds: number;
}

export const presenceChangeSchema = z.strictObject({
  online: z.boolean(),
  location: locationFixSchema.optional(),
});

export const heartbeatSchema = z.strictObject({
  location: locationFixSchema.optional(),
});

/** PushSubscription.toJSON() from the browser. */
export const pushSubscriptionSchema = z.strictObject({
  endpoint: z
    .url(V.invalid)
    .max(2_000, V.invalid)
    .refine((value) => value.startsWith("https://"), V.invalid),
  expirationTime: z.number().nullable().optional(),
  keys: z.strictObject({
    p256dh: z.string().min(16).max(200),
    auth: z.string().min(8).max(100),
  }),
});
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

export const pushUnsubscribeSchema = z.strictObject({ endpoint: z.url(V.invalid).max(2_000, V.invalid) });

/** Notification payload the service worker understands (apps/web/public/sw.js). */
export interface PushPayload {
  /** "test" | "offer" | "offer-revoked" | "presence-offline" | … */
  kind: string;
  title: string;
  body: string;
  /** Opened when the notification is tapped. */
  url: string;
  /** Same tag replaces an older notification (e.g. a revoked offer). */
  tag?: string;
  /** Unix ms; the worker drops alerts that arrive after this. */
  expiresAt?: number;
  requireInteraction?: boolean;
  /** Notification buttons (Chrome shows up to 2), each opening its own address in actionUrls. */
  actions?: Array<{ action: string; title: string }>;
  actionUrls?: Record<string, string>;
}
