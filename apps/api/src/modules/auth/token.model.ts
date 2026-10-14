import { createHash, randomBytes } from "node:crypto";
import type { TokenType } from "@brand/shared";
import { type HydratedDocument, model, Schema, type Types } from "mongoose";
import { AppError } from "../../errors";

interface AuthTokenFields {
  userId: Types.ObjectId;
  type: TokenType;
  /** SHA-256 of the token; the token itself only ever exists in the email link. */
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
}

const authTokenSchema = new Schema<AuthTokenFields>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["reset_password", "set_password"], required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

authTokenSchema.index({ tokenHash: 1 }, { unique: true });
authTokenSchema.index({ userId: 1, type: 1 });
// Documents disappear a day after they expire (plan C5).
authTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

export const AuthToken = model<AuthTokenFields>("AuthToken", authTokenSchema, "auth_tokens");
export type AuthTokenDoc = HydratedDocument<AuthTokenFields>;

/** Reset links last 30 minutes; a new professional's set-password link lasts 72 hours (plan C11). */
export const TOKEN_TTL_MS: Record<TokenType, number> = {
  reset_password: 30 * 60 * 1000,
  set_password: 72 * 60 * 60 * 1000,
};

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** 32 random bytes. Only the newest link of a type works: earlier unused ones are deleted. */
export async function issueToken(userId: Types.ObjectId, type: TokenType): Promise<{ token: string; expiresAt: Date }> {
  await AuthToken.deleteMany({ userId, type, usedAt: null });
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS[type]);
  await AuthToken.create({ userId, type, tokenHash: sha256(token), expiresAt, usedAt: null });
  return { token, expiresAt };
}

/** Explains why a token can't be used: unknown, already used or expired. */
export async function inspectToken(token: string): Promise<AuthTokenDoc> {
  const doc = await AuthToken.findOne({ tokenHash: sha256(token) });
  if (!doc) throw new AppError("TOKEN_INVALID");
  if (doc.usedAt) throw new AppError("TOKEN_USED");
  if (doc.expiresAt.getTime() <= Date.now()) throw new AppError("TOKEN_EXPIRED");
  return doc;
}

/** Atomically marks the token used, so two simultaneous submits can't both succeed. */
export async function consumeToken(token: string): Promise<AuthTokenDoc> {
  const doc = await AuthToken.findOneAndUpdate(
    { tokenHash: sha256(token), usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (doc) return doc;
  await inspectToken(token);
  throw new AppError("TOKEN_INVALID");
}
