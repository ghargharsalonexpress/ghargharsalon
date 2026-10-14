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

export const languageSchema = z.enum(LANGUAGES);

export const signupSchema = z.strictObject({
  name: nameSchema,
  phone: phoneSchema,
  email: emailSchema,
  password: passwordSchema,
  /** The language the person used while signing up becomes their profile language. */
  locale: languageSchema.optional(),
});

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

/** The profile form: name and phone are always sent together. */
export const profileSchema = z.strictObject({ name: nameSchema, phone: phoneSchema });

export const updateMeSchema = z
  .strictObject({
    name: nameSchema.optional(),
    phone: phoneSchema.optional(),
    locale: languageSchema.optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), V.invalid);

/** What a form holds (input) and what the API works with after parsing (data). */
export type SignupInput = z.input<typeof signupSchema>;
export type SignupData = z.output<typeof signupSchema>;
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

/** reset_password: "Forgot password" (30 min). set_password: new professional's welcome link (72 h). */
export type TokenType = "reset_password" | "set_password";

/** The signed-in person as the web sees them. Contact details of others are never part of this. */
export interface UserDto {
  id: string;
  role: Role;
  name: string;
  email: string;
  phone: string;
  locale: Language;
}

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
