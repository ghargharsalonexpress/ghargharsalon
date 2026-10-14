import {
  checkTokenSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  type SessionDto,
  signupSchema,
  type UserResponse,
} from "@brand/shared";
import { Router } from "express";
import type { Config } from "../../config";
import type { Csrf } from "../../http/csrf";
import { createAuthLimits } from "../../http/rateLimits";
import { endSession, startSession } from "../../http/session";
import { bodyOf, validateBody } from "../../http/validate";
import { auditActor } from "../audit/audit.model";
import { toUserDto } from "../users/user.model";
import type { AuthService } from "./auth.service";

/** /v1/session and /v1/auth/* (plan C12, workflow W2). */
export function authRouter({ config, csrf, auth }: { config: Config; csrf: Csrf; auth: AuthService }): Router {
  const router = Router();
  const limits = createAuthLimits();

  /** Bootstrap for the web app: who is signed in (or null) and the CSRF token for mutations. */
  router.get("/session", (req, res) => {
    const body: SessionDto = { user: req.user ? toUserDto(req.user) : null, csrfToken: csrf.issue(req, res) };
    res.set("Cache-Control", "no-store").json(body);
  });

  router.post("/auth/signup", limits.signup, validateBody(signupSchema), async (req, res) => {
    const user = await auth.signup(bodyOf(req, signupSchema));
    await startSession(req, { id: user.id as string, role: user.role });
    const body: UserResponse = { user: toUserDto(user) };
    res.status(201).json(body);
  });

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
