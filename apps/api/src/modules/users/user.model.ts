import { type Language, LANGUAGES, NAME_MAX_LENGTH, type Role, ROLES, type UserDto } from "@brand/shared";
import { type HydratedDocument, model, Schema } from "mongoose";

export const USER_STATUSES = ["active", "blocked", "suspended"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export interface UserFields {
  role: Role;
  name: string;
  /** Lower-case; unique. */
  email: string;
  /** Ten digits, no +91. */
  phone: string;
  /** Argon2id hash; null for a professional who hasn't set a password yet. Never selected by default. */
  passwordHash: string | null;
  locale: Language;
  /** blocked (customers) and suspended (professionals) cannot log in; their sessions are removed. */
  status: UserStatus;
  lastLoginAt: Date | null;
  passwordChangedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserFields>(
  {
    role: { type: String, enum: ROLES, required: true },
    name: { type: String, required: true, trim: true, maxlength: NAME_MAX_LENGTH },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, required: true, match: /^[6-9]\d{9}$/ },
    passwordHash: { type: String, default: null, select: false },
    locale: { type: String, enum: LANGUAGES, default: "en" },
    status: { type: String, enum: USER_STATUSES, default: "active" },
    lastLoginAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, status: 1 });

export type UserDoc = HydratedDocument<UserFields>;

export const User = model<UserFields>("User", userSchema, "users");

/** What the signed-in person receives about themselves. Never includes the hash or status internals. */
export function toUserDto(user: UserDoc): UserDto {
  return { id: user.id as string, role: user.role, name: user.name, email: user.email, phone: user.phone, locale: user.locale };
}

/** Mongo duplicate-key error (E11000), e.g. two sign-ups racing for the same email. */
export const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === 11000;
