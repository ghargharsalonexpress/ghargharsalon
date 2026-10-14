import type { ForgotPasswordData, LoginData, ResetPasswordData, SignupData, TokenCheckResponse } from "@brand/shared";
import { V } from "@brand/shared";
import type { Config } from "../../config";
import { AppError } from "../../errors";
import { revokeUserSessions } from "../../http/session";
import type { Logger } from "../../logger";
import { type auditActor, recordAudit } from "../audit/audit.model";
import { passwordResetEmail, setPasswordEmail } from "../email/templates";
import type { EmailTransport } from "../email/transport";
import { isDuplicateKeyError, User, type UserDoc } from "../users/user.model";
import { burnPasswordCheck, hashPassword, passwordProblem, verifyPassword } from "./password";
import { consumeToken, inspectToken, issueToken } from "./token.model";

interface AuthDeps {
  config: Config;
  email: EmailTransport;
  logger: Logger;
}


/** Business rules for accounts (plan W2/W11). HTTP concerns stay in auth.routes.ts. */
export function createAuthService({ config, email, logger }: AuthDeps) {
  const emailContext = { brandName: config.BRAND_NAME, supportEmail: config.SUPPORT_EMAIL, supportPhone: config.SUPPORT_PHONE };

  function rejectWeakPassword(password: string, context: { email?: string; name?: string; phone?: string }) {
    const problem = passwordProblem(password, context);
    if (problem) throw new AppError("VALIDATION_FAILED", { fields: { password: problem } });
  }

  async function signup(input: SignupData): Promise<UserDoc> {
    rejectWeakPassword(input.password, input);
    if (await User.exists({ email: input.email })) throw new AppError("EMAIL_TAKEN", { fields: { email: V.emailTaken } });

    try {
      return await User.create({
        role: "customer",
        name: input.name,
        email: input.email,
        phone: input.phone,
        locale: input.locale ?? "en",
        passwordHash: await hashPassword(input.password),
        passwordChangedAt: new Date(),
        lastLoginAt: new Date(),
      });
    } catch (error) {
      // Two sign-ups racing for the same email: the unique index decides.
      if (isDuplicateKeyError(error)) throw new AppError("EMAIL_TAKEN", { fields: { email: V.emailTaken } });
      throw error;
    }
  }

  /**
   * Wrong email and wrong password look identical. Blocked or suspended accounts are only
   * told so after the correct password, so the message can't be used to probe accounts.
   */
  async function login(input: LoginData): Promise<UserDoc> {
    const user = await User.findOne({ email: input.email }).select("+passwordHash");
    const ok = user?.passwordHash ? await verifyPassword(user.passwordHash, input.password) : await burnPasswordCheck(input.password);
    if (!user || !ok) throw new AppError("INVALID_CREDENTIALS");
    if (user.status === "blocked") throw new AppError("ACCOUNT_BLOCKED");
    if (user.status === "suspended") throw new AppError("ACCOUNT_SUSPENDED");

    user.lastLoginAt = new Date();
    await user.save();
    return user;
  }

  /** Always succeeds from the caller's point of view, so it never reveals whether an account exists. */
  async function forgotPassword(input: ForgotPasswordData): Promise<void> {
    const user = await User.findOne({ email: input.email, status: "active" });
    if (!user) return;
    const { token } = await issueToken(user._id, "reset_password");
    const url = `${config.WEB_URL}/reset-password?token=${token}`;
    try {
      await email.send(passwordResetEmail({ to: user.email, name: user.name, lang: user.locale, url }, emailContext));
    } catch (error) {
      logger.error({ err: error, userId: user.id }, "password reset email failed");
    }
  }

  /** Lets the reset page say "this link has expired" before anyone types a password. */
  async function checkToken(token: string): Promise<TokenCheckResponse> {
    const doc = await inspectToken(token);
    const user = await User.findById(doc.userId);
    if (!user || user.status !== "active") throw new AppError("TOKEN_INVALID");
    return { type: doc.type };
  }

  /**
   * The password is checked before the link is used up, so a weak choice doesn't burn it.
   * Afterwards every other session ends: whoever had the old password is signed out.
   */
  async function resetPassword(input: ResetPasswordData, actor: ReturnType<typeof auditActor>): Promise<UserDoc> {
    const pending = await inspectToken(input.token);
    const user = await User.findById(pending.userId);
    if (!user || user.status !== "active") throw new AppError("TOKEN_INVALID");
    rejectWeakPassword(input.password, user);

    const used = await consumeToken(input.token);
    user.passwordHash = await hashPassword(input.password);
    user.passwordChangedAt = new Date();
    user.lastLoginAt = new Date();
    await user.save();
    await revokeUserSessions(user.id as string);

    const action = used.type === "set_password" ? "user.password_set" : "user.password_reset";
    await recordAudit({ action, entity: { type: "user", id: user.id as string } }, { ...actor, actorId: user._id, actorRole: user.role });
    return user;
  }

  /** Sends a new professional their welcome link (used by admin onboarding in Phase 4). */
  async function sendSetPasswordLink(user: UserDoc): Promise<string> {
    const { token } = await issueToken(user._id, "set_password");
    const url = `${config.WEB_URL}/reset-password?token=${token}&mode=set`;
    await email.send(setPasswordEmail({ to: user.email, name: user.name, lang: user.locale, url }, emailContext));
    return url;
  }

  return { signup, login, forgotPassword, checkToken, resetPassword, sendSetPasswordLink };
}

export type AuthService = ReturnType<typeof createAuthService>;
