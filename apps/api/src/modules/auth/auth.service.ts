import type { CompleteSignupData, ForgotPasswordData, LoginData, ResetPasswordData, SendCodeResponse, TokenCheckResponse } from "@brand/shared";
import { LOGIN_CODE_TIMING, V } from "@brand/shared";
import type { Config } from "../../config";
import { AppError } from "../../errors";
import { revokeUserSessions } from "../../http/session";
import type { Logger } from "../../logger";
import { type auditActor, recordAudit } from "../audit/audit.model";
import { passwordResetEmail } from "../email/templates";
import type { EmailTransport } from "../email/transport";
import type { SmsTransport } from "../sms/transport";
import { duplicateKeyField, User, type UserDoc } from "../users/user.model";
import { createLoginCodes } from "./loginCode";
import { burnPasswordCheck, hashPassword, passwordProblem, verifyPassword } from "./password";
import { consumeToken, inspectToken, issueToken } from "./token.model";

interface AuthDeps {
  config: Config;
  email: EmailTransport;
  sms: SmsTransport;
  logger: Logger;
}

type Actor = ReturnType<typeof auditActor>;

/**
 * Business rules for accounts. Customers and professionals log in with their mobile number
 * and an SMS code; new numbers become customers after a name step (ADR-0020). Admins keep
 * email + password ("Team login"). HTTP concerns stay in auth.routes.ts.
 */
export function createAuthService({ config, email, sms, logger }: AuthDeps) {
  const emailContext = { brandName: config.BRAND_NAME, supportEmail: config.SUPPORT_EMAIL, supportPhone: config.SUPPORT_PHONE };
  const codes = createLoginCodes({ sessionSecret: config.SESSION_SECRET, rateLimits: config.LOGIN_RATE_LIMITS });

  function rejectWeakPassword(password: string, context: { email?: string | null; name?: string; phone?: string }) {
    const problem = passwordProblem(password, { name: context.name, phone: context.phone, email: context.email ?? undefined });
    if (problem) throw new AppError("VALIDATION_FAILED", { fields: { password: problem } });
  }

  function rejectInactive(user: UserDoc): void {
    if (user.status === "blocked") throw new AppError("ACCOUNT_BLOCKED");
    if (user.status === "suspended") throw new AppError("ACCOUNT_SUSPENDED");
  }

  // ---------- mobile number + SMS code (customers and professionals) ----------

  /** The same answer whether or not the number has an account, so nobody can probe numbers. */
  async function sendLoginCode(phone: string): Promise<SendCodeResponse> {
    const { code } = await codes.issue(phone);
    try {
      await sms.sendLoginCode(phone, code);
    } catch (error) {
      logger.error({ err: error, phone: `${phone.slice(0, 2)}******${phone.slice(-2)}` }, "login code SMS failed");
      throw new AppError("SMS_SEND_FAILED");
    }
    return {
      resendAfterSeconds: LOGIN_CODE_TIMING.resendSeconds,
      expiresInSeconds: LOGIN_CODE_TIMING.expiresSeconds,
      ...(config.smsDevCode ? { devCode: code } : {}),
    };
  }

  /**
   * A right code signs in the number's customer or professional; a new number gets null and
   * goes on to the name step. Only someone holding the phone learns about the account: an
   * admin's number is sent to Team login, and blocked or suspended accounts are told so.
   */
  async function verifyLoginCode(phone: string, code: string): Promise<UserDoc | null> {
    await codes.verify(phone, code);
    const user = await User.findOne({ phone });
    if (!user) return null;
    if (user.role === "admin") throw new AppError("TEAM_LOGIN_REQUIRED");
    rejectInactive(user);

    const now = new Date();
    user.lastLoginAt = now;
    user.phoneVerifiedAt = now;
    await user.save();
    return user;
  }

  /** The name step: a verified new number becomes a customer (never any other role). */
  async function completeSignup(phone: string, input: CompleteSignupData, actor: Actor): Promise<UserDoc> {
    if (await User.exists({ phone })) throw new AppError("PHONE_TAKEN", { fields: { phone: V.phoneTaken } });
    if (input.email && (await User.exists({ email: input.email }))) throw new AppError("EMAIL_TAKEN", { fields: { email: V.emailTaken } });

    const now = new Date();
    let user: UserDoc;
    try {
      user = await User.create({
        role: "customer",
        name: input.name,
        email: input.email ?? null,
        phone,
        locale: input.locale ?? "en",
        phoneVerifiedAt: now,
        lastLoginAt: now,
      });
    } catch (error) {
      // Two sign-ups racing: the unique indexes decide.
      const field = duplicateKeyField(error);
      if (field === "email") throw new AppError("EMAIL_TAKEN", { fields: { email: V.emailTaken } });
      if (field === "phone") throw new AppError("PHONE_TAKEN", { fields: { phone: V.phoneTaken } });
      throw error;
    }
    await recordAudit({ action: "user.signup", entity: { type: "user", id: user.id as string }, after: { role: "customer", email: Boolean(input.email) } }, { ...actor, actorId: user._id, actorRole: user.role });
    return user;
  }

  // ---------- Team login (admins): email + password ----------

  /**
   * Wrong email, wrong password and non-admin accounts look identical. Blocked or suspended
   * accounts are only told so after the correct password, so the message can't probe accounts.
   */
  async function login(input: LoginData): Promise<UserDoc> {
    const found = await User.findOne({ email: input.email }).select("+passwordHash");
    const user = found?.role === "admin" ? found : null;
    const ok = user?.passwordHash ? await verifyPassword(user.passwordHash, input.password) : await burnPasswordCheck(input.password);
    if (!user || !ok) throw new AppError("INVALID_CREDENTIALS");
    rejectInactive(user);

    user.lastLoginAt = new Date();
    await user.save();
    return user;
  }

  /** Always succeeds from the caller's point of view, so it never reveals whether an account exists. */
  async function forgotPassword(input: ForgotPasswordData): Promise<void> {
    const user = await User.findOne({ email: input.email, role: "admin", status: "active" });
    if (!user?.email) return;
    const { token } = await issueToken(user._id, "reset_password");
    const url = `${config.WEB_URL}/reset-password?token=${token}`;
    try {
      await email.send(passwordResetEmail({ to: user.email, name: user.name, lang: user.locale, url }, emailContext));
    } catch (error) {
      logger.error({ err: error, userId: user.id }, "password reset email failed");
    }
  }

  async function tokenUser(userId: unknown): Promise<UserDoc> {
    const user = await User.findById(userId);
    if (!user || user.status !== "active" || user.role !== "admin") throw new AppError("TOKEN_INVALID");
    return user;
  }

  /** Lets the reset page say "this link has expired" before anyone types a password. */
  async function checkToken(token: string): Promise<TokenCheckResponse> {
    const doc = await inspectToken(token);
    await tokenUser(doc.userId);
    return { type: "reset_password" };
  }

  /**
   * The password is checked before the link is used up, so a weak choice doesn't burn it.
   * Afterwards every other session ends: whoever had the old password is signed out.
   */
  async function resetPassword(input: ResetPasswordData, actor: Actor): Promise<UserDoc> {
    const pending = await inspectToken(input.token);
    const user = await tokenUser(pending.userId);
    rejectWeakPassword(input.password, user);

    await consumeToken(input.token);
    user.passwordHash = await hashPassword(input.password);
    user.passwordChangedAt = new Date();
    user.lastLoginAt = new Date();
    await user.save();
    await revokeUserSessions(user.id as string);

    await recordAudit({ action: "user.password_reset", entity: { type: "user", id: user.id as string } }, { ...actor, actorId: user._id, actorRole: user.role });
    return user;
  }

  return { sendLoginCode, verifyLoginCode, completeSignup, login, forgotPassword, checkToken, resetPassword };
}

export type AuthService = ReturnType<typeof createAuthService>;
