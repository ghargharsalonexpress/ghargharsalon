import { DEFAULT_SETTINGS, type Settings, type SettingsResponse } from "@brand/shared";
import { model, Schema, type Types } from "mongoose";
import { AppError } from "../../errors";
import { type auditActor, recordAudit } from "../audit/audit.model";

const SETTINGS_ID = "global";

interface SettingsFields {
  _id: string;
  version: number;
  values: Settings;
  updatedBy: Types.ObjectId | null;
  updatedAt: Date;
}

const settingsSchema = new Schema<SettingsFields>(
  {
    _id: { type: String, required: true },
    version: { type: Number, required: true, min: 1 },
    values: { type: Schema.Types.Mixed, required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: { createdAt: false, updatedAt: true }, minimize: false, versionKey: false },
);

export const SettingsModel = model<SettingsFields>("Settings", settingsSchema, "settings");

interface SettingsHistoryFields {
  version: number;
  values: Settings;
  changedBy: Types.ObjectId | null;
  changedAt: Date;
}

const historySchema = new Schema<SettingsHistoryFields>(
  {
    version: { type: Number, required: true },
    values: { type: Schema.Types.Mixed, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    changedAt: { type: Date, required: true },
  },
  { minimize: false, versionKey: false },
);
historySchema.index({ version: -1 });

export const SettingsHistory = model<SettingsHistoryFields>("SettingsHistory", historySchema, "settings_history");

/** Fills fields added after the settings were first saved with their defaults (arrays are taken whole). */
function withDefaults<T>(defaults: T, stored: unknown): T {
  if (Array.isArray(defaults) || typeof defaults !== "object" || defaults === null) return (stored === undefined ? defaults : stored) as T;
  const source = (typeof stored === "object" && stored !== null ? stored : {}) as Record<string, unknown>;
  return Object.fromEntries(Object.entries(defaults as Record<string, unknown>).map(([key, value]) => [key, withDefaults(value, source[key])])) as T;
}

const toResponse = (doc: { version: number; values: Settings; updatedAt: Date }): SettingsResponse => ({
  version: doc.version,
  settings: withDefaults(DEFAULT_SETTINGS, doc.values),
  updatedAt: doc.updatedAt.toISOString(),
});

/** The single settings document; created with the plan's defaults on first read. */
export async function getSettings(): Promise<SettingsResponse> {
  const doc = await SettingsModel.findOneAndUpdate(
    { _id: SETTINGS_ID },
    { $setOnInsert: { version: 1, values: DEFAULT_SETTINGS, updatedBy: null } },
    { upsert: true, returnDocument: "after" },
  ).lean();
  if (!doc) throw new AppError("INTERNAL", { detail: "settings upsert returned nothing" });
  return toResponse(doc);
}

/**
 * Optimistic concurrency (plan A8): the update only applies if nobody saved in between.
 * New values apply to new bookings only; every version is kept and audited.
 */
export async function updateSettings(
  expectedVersion: number,
  values: Settings,
  actor: ReturnType<typeof auditActor>,
): Promise<SettingsResponse> {
  const before = await getSettings();
  const doc = await SettingsModel.findOneAndUpdate(
    { _id: SETTINGS_ID, version: expectedVersion },
    { $set: { values, updatedBy: actor.actorId }, $inc: { version: 1 } },
    { returnDocument: "after" },
  ).lean();
  if (!doc) throw new AppError("VERSION_CONFLICT", { detail: `expected ${expectedVersion}, current ${before.version}` });

  await SettingsHistory.create({ version: doc.version, values, changedBy: actor.actorId, changedAt: new Date() });
  await recordAudit({ action: "settings.update", entity: { type: "settings", id: SETTINGS_ID }, before: before.settings, after: values }, actor);
  return toResponse(doc);
}
