import type { Role } from "@brand/shared";
import type { Request } from "express";
import { model, Schema, type Types } from "mongoose";

interface AuditFields {
  actorId: Types.ObjectId | null;
  actorRole: Role | "system";
  /** dotted verb, e.g. "settings.update", "user.password_reset". */
  action: string;
  entity: { type: string; id: string };
  before: unknown;
  after: unknown;
  ip: string | null;
  requestId: string | null;
  at: Date;
}

const auditSchema = new Schema<AuditFields>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    actorRole: { type: String, required: true },
    action: { type: String, required: true },
    entity: { type: { type: String, required: true }, id: { type: String, required: true } },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    ip: { type: String, default: null },
    requestId: { type: String, default: null },
    at: { type: Date, required: true },
  },
  { versionKey: false, minimize: false },
);

auditSchema.index({ "entity.type": 1, "entity.id": 1, at: -1 });
auditSchema.index({ actorId: 1, at: -1 });
// Kept for two years (plan C5).
auditSchema.index({ at: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 });

export const AuditLog = model<AuditFields>("AuditLog", auditSchema, "audit_logs");

export interface AuditEntry {
  action: string;
  entity: { type: string; id: string };
  before?: unknown;
  after?: unknown;
}

/** Who did it and from where, taken from the request (or "system" for scripts and jobs). */
export function auditActor(req?: Pick<Request, "user" | "ip" | "id">) {
  return {
    actorId: req?.user?._id ?? null,
    actorRole: req?.user?.role ?? ("system" as const),
    ip: req?.ip ?? null,
    requestId: req?.id ? String(req.id) : null,
  };
}

/** Sensitive actions are recorded with before/after values (plan C11). */
export async function recordAudit(entry: AuditEntry, actor: ReturnType<typeof auditActor> = auditActor()): Promise<void> {
  await AuditLog.create({ ...actor, ...entry, before: entry.before ?? null, after: entry.after ?? null, at: new Date() });
}
