import { createHash } from "node:crypto";
import type { Request } from "express";
import { model, Schema, type Types } from "mongoose";
import { AppError } from "../../errors";

interface IdempotencyFields {
  key: string;
  userId: Types.ObjectId;
  route: string;
  requestHash: string;
  /** null while the first request is still running. */
  response: { status: number; body: unknown } | null;
  createdAt: Date;
}

const schema = new Schema<IdempotencyFields>(
  {
    key: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, required: true },
    route: { type: String, required: true },
    requestHash: { type: String, required: true },
    response: { type: Schema.Types.Mixed, default: null },
    createdAt: { type: Date, required: true },
  },
  { versionKey: false, minimize: false },
);
schema.index({ userId: 1, key: 1 }, { unique: true });
// Kept 24 hours (plan C5).
schema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });
export const IdempotencyKey = model<IdempotencyFields>("IdempotencyKey", schema, "idempotency_keys");

const KEY = /^[A-Za-z0-9_-]{16,80}$/;

/**
 * Runs a money-moving handler at most once per Idempotency-Key (plan C12): a repeat with the
 * same body replays the first answer; the same key with a different body is refused; a
 * repeat while the first is still running is refused too, so a double tap can't pay twice.
 */
export async function idempotent<T>(req: Request, userId: Types.ObjectId, run: () => Promise<{ status: number; body: T }>): Promise<{ status: number; body: T }> {
  const key = req.get("idempotency-key");
  if (!key || !KEY.test(key)) throw new AppError("VALIDATION_FAILED", { fields: { "Idempotency-Key": "validation.required" }, detail: "missing Idempotency-Key" });
  const route = `${req.method} ${req.baseUrl}${req.path}`;
  const requestHash = createHash("sha256").update(JSON.stringify(req.body ?? {})).digest("hex");

  try {
    await IdempotencyKey.create({ key, userId, route, requestHash, response: null, createdAt: new Date() });
  } catch (error) {
    if (!(typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === 11000)) throw error;
    const previous = await IdempotencyKey.findOne({ userId, key }).lean();
    if (!previous || previous.route !== route || previous.requestHash !== requestHash) throw new AppError("IDEMPOTENCY_CONFLICT");
    if (!previous.response) throw new AppError("IDEMPOTENCY_CONFLICT", { detail: "first request still running" });
    return previous.response as { status: number; body: T };
  }

  try {
    const result = await run();
    await IdempotencyKey.updateOne({ userId, key }, { $set: { response: result } });
    return result;
  } catch (error) {
    // A failure can be retried with the same key.
    await IdempotencyKey.deleteOne({ userId, key });
    throw error;
  }
}
