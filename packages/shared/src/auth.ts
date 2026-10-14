import { z } from "zod";
import { type Language, LANGUAGES } from "./language";
import { isIndianMobile } from "./phone";
import type { Role } from "./roles";
import { V } from "./validation";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const NAME_MAX_LENGTH = 80;

export const emailSchema = z
  .string(V.required)
  .trim()
  .toLowerCase()
  .min(1, V.required)
  .max(254, V.email)
  .pipe(z.email(V.email));

/** Length only; the API also rejects common and personal passwords (plan C11). */
export const passwordSchema = z.string(V.required).min(PASSWORD_MIN_LENGTH, V.passwordShort).max(PASSWORD_MAX_LENGTH, V.passwordLong);

export const nameSchema = z.string(V.required).trim().min(1, V.required).min(2, V.nameShort).max(NAME_MAX_LENGTH, V.nameLong);

/** Ten digits without +91 or spaces; the PhoneField produces exactly this. */
export const phoneSchema = z.string(V.required).trim().min(1, V.required).refine(isIndianMobile, V.phone);

/**
 * An email the person may leave out: empty means none (null). null is accepted as input too,
 * because the web parses a form with this schema and sends the result to the API, which parses
 * it again.
 */
export const optionalEmailSchema = z
  .union([z.null(), z.string(V.invalid).trim().toLowerCase().max(254, V.email).pipe(z.union([z.literal(""), z.email(V.email)]))])
  .transform((value) => (value === "" ? null : value))
  .optional();

export const languageSchema = z.enum(LANGUAGES);

/**
 * Customers and professionals log in with their mobile number and a code sent by SMS
 * (ADR-0020); new numbers become customers after a name step. Admins keep email + password.
 */
export const LOGIN_CODE_LENGTH = 6;
export const LOGIN_CODE_TIMING = {
  /** A code works this long. */
  expiresSeconds: 5 * 60,
  /** A new code can be asked for after this. */
  resendSeconds: 30,
  /** After a code for a new number, the name step must be finished within this. */
  signupSeconds: 15 * 60,
} as const;

export const loginCodeSchema = z
  .string(V.required)
  .trim()
  .min(1, V.required)
  .regex(new RegExp(`^\\d{${LOGIN_CODE_LENGTH}}$`), V.loginCode);

export const sendCodeSchema = z.strictObject({ phone: phoneSchema });

export const verifyCodeSchema = z.strictObject({ phone: phoneSchema, code: loginCodeSchema });

/** The name step for a new number. The phone comes from the verified code, never from the body. */
export const completeSignupSchema = z.strictObject({
  name: nameSchema,
  email: optionalEmailSchema,
  /** The language the person used while signing up becomes their profile language. */
  locale: languageSchema.optional(),
});

/** Team (admin) login. */
export const loginSchema = z.strictObject({
  email: emailSchema,
  password: z.string(V.required).min(1, V.required).max(PASSWORD_MAX_LENGTH, V.passwordLong),
});

export const forgotPasswordSchema = z.strictObject({ email: emailSchema });

/** 32 random bytes, base64url: 43 characters. */
export const tokenSchema = z
  .string(V.invalid)
  .min(32, V.invalid)
  .max(128, V.invalid)
  .regex(/^[A-Za-z0-9_-]+$/, V.invalid);

export const checkTokenSchema = z.strictObject({ token: tokenSchema });

export const resetPasswordSchema = z.strictObject({ token: tokenSchema, password: passwordSchema });

/**
 * The profile form: name and email are sent together. The phone is the login, so it can't be
 * changed here (a new number would need its own code).
 */
export const profileSchema = z.strictObject({ name: nameSchema, email: optionalEmailSchema });

export const updateMeSchema = z
  .strictObject({
    name: nameSchema.optional(),
    /** null or "" removes the email. */
    email: optionalEmailSchema,
    locale: languageSchema.optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), V.invalid);

/** What a form holds (input) and what the API works with after parsing (data). */
export type SendCodeInput = z.input<typeof sendCodeSchema>;
export type VerifyCodeInput = z.input<typeof verifyCodeSchema>;
export type CompleteSignupInput = z.input<typeof completeSignupSchema>;
export type CompleteSignupData = z.output<typeof completeSignupSchema>;
export type LoginInput = z.input<typeof loginSchema>;
export type LoginData = z.output<typeof loginSchema>;
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;
export type ForgotPasswordData = z.output<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;
export type ResetPasswordData = z.output<typeof resetPasswordSchema>;
export type ProfileInput = z.input<typeof profileSchema>;
export type ProfileData = z.output<typeof profileSchema>;
export type UpdateMeInput = z.input<typeof updateMeSchema>;
export type UpdateMeData = z.output<typeof updateMeSchema>;

/** reset_password: a team member's "Forgot password" link (30 min). */
export type TokenType = "reset_password";

/** The signed-in person as the web sees them. Contact details of others are never part of this. */
export interface UserDto {
  id: string;
  role: Role;
  name: string;
  /** Optional for customers and professionals; admins always have one. */
  email: string | null;
  phone: string;
  locale: Language;
}

/** POST /v1/auth/otp/send: the same answer whether or not the number has an account. */
export interface SendCodeResponse {
  resendAfterSeconds: number;
  expiresInSeconds: number;
  /** Only on a local demo server (SMS_DEV_CODE=1 with the log transport); never in production. */
  devCode?: string;
}

/** POST /v1/auth/otp/verify: signed in, or a new number that needs the name step. */
export type VerifyCodeResponse = { status: "signed-in"; user: UserDto } | { status: "new" };

/** GET /v1/session: always 200, `user` is null for guests. */
export interface SessionDto {
  user: UserDto | null;
  csrfToken: string;
}

export interface UserResponse {
  user: UserDto;
}

export interface TokenCheckResponse {
  type: TokenType;
}
