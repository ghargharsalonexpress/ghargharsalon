import { type Language, LANGUAGES, NAME_MAX_LENGTH, type Role, ROLES, type UserDto } from "@brand/shared";
import { type HydratedDocument, model, Schema } from "mongoose";

export const USER_STATUSES = ["active", "blocked", "suspended"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export interface UserFields {
  role: Role;
  name: string;
  /** Lower-case; unique when present. Required for admins; optional for customers and professionals. */
  email: string | null;
  /** Ten digits, no +91. Unique: customers and professionals log in with it (ADR-0020). */
  phone: string;
  /** Argon2id hash: admins only (Team login). Never selected by default. */
  passwordHash: string | null;
  locale: Language;
  /** blocked (customers) and suspended (professionals) cannot log in; their sessions are removed. */
  status: UserStatus;
  lastLoginAt: Date | null;
  /** When an SMS code to this number was last checked. */
  phoneVerifiedAt: Date | null;
  passwordChangedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserFields>(
  {
    role: { type: String, enum: ROLES, required: true },
    name: { type: String, required: true, trim: true, maxlength: NAME_MAX_LENGTH },
    email: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
      maxlength: 254,
      required: function (this: UserFields) {
        return this.role === "admin";
      },
    },
    phone: { type: String, required: true, match: /^[6-9]\d{9}$/ },
    passwordHash: { type: String, default: null, select: false },
    locale: { type: String, enum: LANGUAGES, default: "en" },
    status: { type: String, enum: USER_STATUSES, default: "active" },
    lastLoginAt: { type: Date, default: null },
    phoneVerifiedAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Many people have no email, so only real addresses are unique. Its own name, so it never clashes
// with the old "email_1" (unique for everyone) that scripts/migrate-otp-login.ts removes.
userSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: "string" } }, name: "email_unique_when_set" });
userSchema.index({ role: 1, status: 1 });
// Last: if old data holds a duplicate number, the other indexes are already in place (see db.ts).
userSchema.index({ phone: 1 }, { unique: true });

export type UserDoc = HydratedDocument<UserFields>;

export const User = model<UserFields>("User", userSchema, "users");

/** What the signed-in person receives about themselves. Never includes the hash or status internals. */
export function toUserDto(user: UserDoc): UserDto {
  return { id: user.id as string, role: user.role, name: user.name, email: user.email, phone: user.phone, locale: user.locale };
}

/** Mongo duplicate-key error (E11000), e.g. two sign-ups racing for the same email. */
export const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === 11000;

/** Which unique field a duplicate-key error is about ("phone", "email"), when Mongo says. */
export function duplicateKeyField(error: unknown): string | null {
  if (!isDuplicateKeyError(error)) return null;
  const pattern = (error as { keyPattern?: Record<string, unknown> }).keyPattern;
  return pattern ? (Object.keys(pattern)[0] ?? null) : null;
}

/** Phone numbers used by more than one account (old data); the unique phone index needs none. */
export async function duplicatePhones(): Promise<Array<{ phone: string; ids: string[] }>> {
  const rows = await User.aggregate<{ _id: string; ids: unknown[]; count: number }>([
    { $group: { _id: "$phone", ids: { $push: "$_id" }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);
  return rows.map((row) => ({ phone: row._id, ids: row.ids.map(String) }));
}
