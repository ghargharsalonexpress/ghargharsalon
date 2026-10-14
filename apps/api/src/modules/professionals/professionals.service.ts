import {
  type AdminProfessionalRow,
  type LocationFix,
  PRESENCE_TIMING,
  type PresenceDto,
  type ProfessionalData,
  type ProfessionalDto,
  type ProSelfDto,
  V,
} from "@brand/shared";
import mongoose, { type Types } from "mongoose";
import { AppError } from "../../errors";
import { revokeUserSessions } from "../../http/session";
import type { Logger } from "../../logger";
import { type auditActor, recordAudit } from "../audit/audit.model";
import { getSettings } from "../settings/settings.service";
import { duplicateKeyField, User, type UserDoc } from "../users/user.model";
import { offlineAlert, testAlert, verifiedAlert } from "./messages";
import { Professional, type ProfessionalDoc, type ProfessionalFields, toPoint } from "./professional.model";
import { PushSubscription, type PushResult, type PushService } from "./push";

type Actor = ReturnType<typeof auditActor>;
type ProfileLike = Pick<ProfessionalFields, "presence">;

/** Available but silent past the stale limit reads as stale, even before the sweeper runs. */
export function presenceView(profile: ProfileLike, now: number, staleAfterSeconds: number): PresenceDto {
  const { presence } = profile;
  const silent = presence.lastHeartbeatAt ? now - presence.lastHeartbeatAt.getTime() > staleAfterSeconds * 1000 : true;
  return {
    state: presence.state === "available" && silent ? "stale" : presence.state,
    since: presence.since?.toISOString() ?? null,
    lastHeartbeatAt: presence.lastHeartbeatAt?.toISOString() ?? null,
    locationAt: presence.locationAt?.toISOString() ?? null,
    activeBookingId: presence.activeBookingId ? String(presence.activeBookingId) : null,
  };
}

const staleSeconds = async () => (await getSettings()).settings.matching.stalePresenceSeconds;

/** The mobile number is the login (ADR-0020), so both it and an email can only belong to one account. */
function takenError(error: unknown): unknown {
  const field = duplicateKeyField(error);
  if (field === "phone") return new AppError("PHONE_TAKEN", { fields: { phone: V.phoneTaken } });
  if (field === "email") return new AppError("EMAIL_TAKEN", { fields: { email: V.emailTaken } });
  return error;
}

/** Admin and professional operations on professional accounts (plan Phase 4, W11, W12, W15). */
export function createProfessionalService({ push, logger }: { push: PushService; logger: Logger }) {
  async function loadPair(userId: string): Promise<{ user: UserDoc; profile: ProfessionalDoc }> {
    const [user, profile] = await Promise.all([User.findOne({ _id: userId, role: "professional" }), Professional.findOne({ userId })]);
    if (!user || !profile) throw new AppError("NOT_FOUND");
    return { user, profile };
  }

  async function toDto(user: UserDoc, profile: ProfessionalDoc, stale: number): Promise<ProfessionalDto> {
    const devices = await PushSubscription.find({ userId: user._id }, { lastSuccessAt: 1 }).lean();
    const lastAlert = devices.map((device) => device.lastSuccessAt?.getTime() ?? 0).reduce((max, value) => Math.max(max, value), 0);
    return {
      id: String(user._id),
      name: user.name,
      email: user.email,
      phone: user.phone,
      locale: user.locale,
      gender: profile.gender,
      skills: profile.skills,
      baseArea: profile.baseArea,
      travelRadiusKm: profile.travelRadiusKm,
      verificationNote: profile.verificationNote,
      photo: profile.photo,
      status: user.status === "suspended" ? "suspended" : "active",
      verifiedAt: profile.verification?.at.toISOString() ?? null,
      verifiedBy: profile.verification?.byName ?? null,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      presence: presenceView(profile, Date.now(), stale),
      devices: devices.length,
      lastAlertAt: lastAlert ? new Date(lastAlert).toISOString() : null,
      version: profile.version,
      createdAt: profile.createdAt.toISOString(),
    };
  }

  async function list(): Promise<AdminProfessionalRow[]> {
    const [profiles, stale] = await Promise.all([Professional.find().sort({ createdAt: -1 }).lean(), staleSeconds()]);
    const userIds = profiles.map((profile) => profile.userId);
    const [users, devices] = await Promise.all([
      User.find({ _id: { $in: userIds } }).lean(),
      PushSubscription.aggregate<{ _id: Types.ObjectId; count: number }>([{ $match: { userId: { $in: userIds } } }, { $group: { _id: "$userId", count: { $sum: 1 } } }]),
    ]);
    const byId = new Map(users.map((user) => [String(user._id), user]));
    const deviceCount = new Map(devices.map((row) => [String(row._id), row.count]));
    const now = Date.now();
    return profiles.flatMap((profile) => {
      const user = byId.get(String(profile.userId));
      if (!user) return [];
      return [
        {
          id: String(user._id),
          name: user.name,
          phone: user.phone,
          email: user.email,
          gender: profile.gender,
          skills: profile.skills,
          baseArea: profile.baseArea,
          status: user.status === "suspended" ? "suspended" : "active",
          verifiedAt: profile.verification?.at.toISOString() ?? null,
          lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
          presence: presenceView(profile, now, stale),
          devices: deviceCount.get(String(user._id)) ?? 0,
        } satisfies AdminProfessionalRow,
      ];
    });
  }

  async function get(userId: string): Promise<ProfessionalDto> {
    const { user, profile } = await loadPair(userId);
    return toDto(user, profile, await staleSeconds());
  }

  const profileFields = (input: ProfessionalData) => ({
    gender: input.gender,
    skills: input.skills,
    baseArea: input.baseArea,
    travelRadiusKm: input.travelRadiusKm,
    photo: input.photo,
    verificationNote: input.verificationNote,
  });

  /**
   * Creates the account and the profile together (W11). Nothing is sent: the professional logs
   * in with this mobile number and an SMS code (ADR-0020).
   */
  async function create(input: ProfessionalData, admin: UserDoc, actor: Actor): Promise<ProfessionalDto> {
    const created: { user?: UserDoc; profile?: ProfessionalDoc } = {};
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const [user] = await User.create([{ role: "professional", name: input.name, email: input.email ?? null, phone: input.phone, locale: input.locale, passwordHash: null }], { session });
        if (!user) throw new Error("user not created");
        const [profile] = await Professional.create(
          [{ userId: user._id, ...profileFields(input), verification: input.verified ? { at: new Date(), by: admin._id, byName: admin.name } : null }],
          { session },
        );
        if (!profile) throw new Error("profile not created");
        created.user = user;
        created.profile = profile;
      });
    } catch (error) {
      throw takenError(error);
    } finally {
      await session.endSession();
    }
    const { user, profile } = created;
    if (!user || !profile) throw new Error("professional not created");
    await recordAudit({ action: "professional.create", entity: { type: "professional", id: String(user._id) }, after: { ...input, photo: Boolean(input.photo) } }, actor);
    return toDto(user, profile, await staleSeconds());
  }

  async function update(userId: string, version: number, input: ProfessionalData, admin: UserDoc, actor: Actor): Promise<ProfessionalDto> {
    const before = await loadPair(userId);
    const wasVerified = Boolean(before.profile.verification);
    const verification = input.verified ? (before.profile.verification ?? { at: new Date(), by: admin._id, byName: admin.name }) : null;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const updated = await Professional.updateOne(
          { userId, version },
          {
            $set: {
              ...profileFields(input),
              verification,
              // An unverified professional can't stay online.
              ...(!input.verified && before.profile.presence.state !== "busy" ? { "presence.state": "offline", "presence.since": new Date() } : {}),
            },
            $inc: { version: 1 },
          },
          { session },
        );
        if (updated.modifiedCount === 0) throw new AppError("VERSION_CONFLICT", { detail: `professional ${userId} expected v${version}, now v${before.profile.version}` });
        await User.updateOne({ _id: userId }, { $set: { name: input.name, email: input.email ?? null, phone: input.phone, locale: input.locale } }, { session });
      });
    } catch (error) {
      throw takenError(error);
    } finally {
      await session.endSession();
    }
    const after = await loadPair(userId);
    await recordAudit(
      {
        action: "professional.update",
        entity: { type: "professional", id: userId },
        before: { name: before.user.name, email: before.user.email, phone: before.user.phone, skills: before.profile.skills, verified: wasVerified, travelRadiusKm: before.profile.travelRadiusKm },
        after: { name: input.name, email: input.email, phone: input.phone, skills: input.skills, verified: input.verified, travelRadiusKm: input.travelRadiusKm },
      },
      actor,
    );
    if (!wasVerified && input.verified) await push.sendToUser(userId, verifiedAlert(after.user.locale), { ttlSeconds: 24 * 60 * 60, urgency: "normal" }).catch(() => undefined);
    return toDto(after.user, after.profile, await staleSeconds());
  }

  /** Suspending signs them out everywhere and takes them offline; not while on a job (W15). */
  async function setStatus(userId: string, status: "active" | "suspended", reason: string, actor: Actor): Promise<ProfessionalDto> {
    const { user, profile } = await loadPair(userId);
    if (status === "suspended") {
      if (profile.presence.activeBookingId) throw new AppError("PRO_BUSY", { detail: "suspend during an active job" });
      await User.updateOne({ _id: userId }, { $set: { status: "suspended" } });
      await Professional.updateOne({ userId }, { $set: { "presence.state": "offline", "presence.since": new Date() } });
      await revokeUserSessions(userId);
    } else {
      await User.updateOne({ _id: userId }, { $set: { status: "active" } });
    }
    await recordAudit({ action: status === "suspended" ? "professional.suspend" : "professional.reactivate", entity: { type: "professional", id: userId }, before: { status: user.status }, after: { status, reason } }, actor);
    return get(userId);
  }

  async function sendTest(userId: string): Promise<PushResult> {
    const user = await User.findById(userId);
    if (!user) throw new AppError("NOT_FOUND");
    return push.sendToUser(userId, testAlert(user.locale), { ttlSeconds: 60, urgency: "high" });
  }

  // ---------- the professional's own panel ----------

  async function profileOf(user: UserDoc): Promise<ProfessionalDoc> {
    const profile = await Professional.findOne({ userId: user._id });
    if (!profile) throw new AppError("NOT_FOUND", { detail: "professional profile missing" });
    return profile;
  }

  async function self(user: UserDoc): Promise<ProSelfDto> {
    const [profile, devices, stale] = await Promise.all([profileOf(user), PushSubscription.countDocuments({ userId: user._id }), staleSeconds()]);
    return {
      name: user.name,
      phone: user.phone,
      email: user.email,
      locale: user.locale,
      gender: profile.gender,
      skills: profile.skills,
      baseArea: profile.baseArea,
      travelRadiusKm: profile.travelRadiusKm,
      photo: profile.photo,
      verified: Boolean(profile.verification),
      presence: presenceView(profile, Date.now(), stale),
      devices,
      vapidPublicKey: push.publicKey,
      heartbeatSeconds: PRESENCE_TIMING.heartbeatSeconds,
    };
  }

  const locationSet = (location: LocationFix, now: Date) => ({
    "presence.location": toPoint(location.lat, location.lng),
    "presence.locationAt": now,
    "presence.accuracyM": Math.round(location.accuracy),
  });

  /** The Online toggle (W12). Going online needs a verified profile and a location fix. */
  async function changePresence(user: UserDoc, online: boolean, location: LocationFix | undefined): Promise<PresenceDto> {
    const profile = await profileOf(user);
    const now = new Date();
    if (online) {
      if (!profile.verification) throw new AppError("PRO_NOT_VERIFIED");
      if (!location) throw new AppError("VALIDATION_FAILED", { fields: { location: V.required } });
      const state = profile.presence.activeBookingId ? "busy" : "available";
      await Professional.updateOne(
        { _id: profile._id },
        { $set: { "presence.state": state, "presence.since": profile.presence.state === state ? profile.presence.since : now, "presence.lastHeartbeatAt": now, ...locationSet(location, now) } },
      );
    } else {
      if (profile.presence.activeBookingId) throw new AppError("PRO_BUSY");
      await Professional.updateOne({ _id: profile._id }, { $set: { "presence.state": "offline", "presence.since": now } });
    }
    logger.info({ userId: String(user._id), online }, "presence changed");
    return presenceView(await profileOf(user), Date.now(), await staleSeconds());
  }

  /** Every ~20 s while online and visible. A stale professional comes back; an offline one stays offline. */
  async function heartbeat(user: UserDoc, location: LocationFix | undefined): Promise<PresenceDto> {
    const profile = await profileOf(user);
    const now = new Date();
    const state = profile.presence.state;
    if (state !== "offline") {
      const next = state === "busy" ? "busy" : "available";
      await Professional.updateOne(
        { _id: profile._id, "presence.state": state },
        { $set: { "presence.state": next, ...(next !== state ? { "presence.since": now } : {}), "presence.lastHeartbeatAt": now, ...(location ? locationSet(location, now) : {}) } },
      );
    }
    return presenceView(await profileOf(user), Date.now(), await staleSeconds());
  }

  return { list, get, create, update, setStatus, sendTest, self, changePresence, heartbeat };
}

export type ProfessionalService = ReturnType<typeof createProfessionalService>;

/**
 * Presence sweeper (plan A8, C7): available but silent → stale (left out of matching);
 * stale for 5 minutes → offline, with a notification so the professional knows why.
 */
export async function sweepPresence({ now, push }: { now: Date; push: PushService }): Promise<{ stale: number; offline: number }> {
  const stale = await staleSeconds();
  const staleResult = await Professional.updateMany(
    { "presence.state": "available", "presence.lastHeartbeatAt": { $lt: new Date(now.getTime() - stale * 1000) } },
    { $set: { "presence.state": "stale", "presence.since": now } },
  );
  const expired = await Professional.find({ "presence.state": "stale", "presence.lastHeartbeatAt": { $lt: new Date(now.getTime() - PRESENCE_TIMING.offlineAfterSeconds * 1000) } }, { userId: 1 }).lean();
  let offline = 0;
  for (const profile of expired) {
    const result = await Professional.updateOne({ _id: profile._id, "presence.state": "stale" }, { $set: { "presence.state": "offline", "presence.since": now } });
    if (result.modifiedCount === 0) continue;
    offline++;
    const user = await User.findById(profile.userId, { locale: 1 }).lean();
    await push.sendToUser(profile.userId, offlineAlert(user?.locale ?? "hi"), { ttlSeconds: 15 * 60, urgency: "normal" }).catch(() => undefined);
  }
  return { stale: staleResult.modifiedCount, offline };
}
