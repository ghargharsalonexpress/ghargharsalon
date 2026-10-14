import {
  checkTokenSchema,
  completeSignupSchema,
  forgotPasswordSchema,
  LOGIN_CODE_TIMING,
  loginSchema,
  resetPasswordSchema,
  sendCodeSchema,
  type SessionDto,
  type UserResponse,
  verifyCodeSchema,
  type VerifyCodeResponse,
} from "@brand/shared";
import { Router } from "express";
import type { Config } from "../../config";
import { AppError } from "../../errors";
import type { Csrf } from "../../http/csrf";
import { createAuthLimits } from "../../http/rateLimits";
import { endSession, startPendingSignup, startSession } from "../../http/session";
import { bodyOf, validateBody } from "../../http/validate";
import { auditActor } from "../audit/audit.model";
import { toUserDto } from "../users/user.model";
import type { AuthService } from "./auth.service";

/** /v1/session and /v1/auth/* (plan C12; ADR-0020 for the mobile login). */
export function authRouter({ config, csrf, auth }: { config: Config; csrf: Csrf; auth: AuthService }): Router {
  const router = Router();
  const limits = createAuthLimits({ loginCodes: config.LOGIN_RATE_LIMITS });

  /** Bootstrap for the web app: who is signed in (or null) and the CSRF token for mutations. */
  router.get("/session", (req, res) => {
    const body: SessionDto = { user: req.user ? toUserDto(req.user) : null, csrfToken: csrf.issue(req, res) };
    res.set("Cache-Control", "no-store").json(body);
  });

  // ---------- customers and professionals: mobile number + SMS code ----------

  router.post("/auth/otp/send", limits.codeSend, validateBody(sendCodeSchema), async (req, res) => {
    res.status(202).json(await auth.sendLoginCode(bodyOf(req, sendCodeSchema).phone));
  });

  router.post("/auth/otp/verify", limits.codeVerify, validateBody(verifyCodeSchema), async (req, res) => {
    const { phone, code } = bodyOf(req, verifyCodeSchema);
    const user = await auth.verifyLoginCode(phone, code);
    if (user) {
      await startSession(req, { id: user.id as string, role: user.role });
      const body: VerifyCodeResponse = { status: "signed-in", user: toUserDto(user) };
      res.json(body);
      return;
    }
    await startPendingSignup(req, phone, LOGIN_CODE_TIMING.signupSeconds * 1000);
    const body: VerifyCodeResponse = { status: "new" };
    res.json(body);
  });

  router.post("/auth/otp/complete", limits.signup, validateBody(completeSignupSchema), async (req, res) => {
    const pending = req.session.pendingPhone;
    if (!pending || pending.until < Date.now()) throw new AppError("LOGIN_CODE_EXPIRED", { detail: "name step without a fresh code" });
    const user = await auth.completeSignup(pending.phone, bodyOf(req, completeSignupSchema), auditActor(req));
    await startSession(req, { id: user.id as string, role: user.role });
    const body: UserResponse = { user: toUserDto(user) };
    res.status(201).json(body);
  });

  // ---------- Team login (admins): email + password ----------

  router.post("/auth/login", limits.login, validateBody(loginSchema), async (req, res) => {
    const user = await auth.login(bodyOf(req, loginSchema));
    await startSession(req, { id: user.id as string, role: user.role });
    const body: UserResponse = { user: toUserDto(user) };
    res.json(body);
  });

  router.post("/auth/logout", async (req, res) => {
    await endSession(req, res, config);
    res.status(204).end();
  });

  router.post("/auth/password/forgot", limits.forgotPerIp, limits.forgotPerEmail, validateBody(forgotPasswordSchema), async (req, res) => {
    await auth.forgotPassword(bodyOf(req, forgotPasswordSchema));
    res.status(202).json({});
  });

  router.post("/auth/password/check", limits.tokenCheck, validateBody(checkTokenSchema), async (req, res) => {
    res.json(await auth.checkToken(bodyOf(req, checkTokenSchema).token));
  });

  router.post("/auth/password/reset", limits.reset, validateBody(resetPasswordSchema), async (req, res) => {
    const user = await auth.resetPassword(bodyOf(req, resetPasswordSchema), auditActor(req));
    await startSession(req, { id: user.id as string, role: user.role });
    const body: UserResponse = { user: toUserDto(user) };
    res.json(body);
  });

  return router;
}
