import type { Request, RequestHandler } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { AppError } from "../errors";

interface LimitOptions {
  windowMs: number;
  limit: number;
  /** Extra key part, e.g. the email, so one attacker can't lock everyone at a shared IP out. */
  key?: (req: Request) => string;
  /** Count only failed requests (logins). */
  skipSuccessful?: boolean;
}

function limiter(name: string, { windowMs, limit, key, skipSuccessful = false }: LimitOptions): RequestHandler {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests: skipSuccessful,
    keyGenerator: (req) => `${name}:${ipKeyGenerator(req.ip ?? "unknown")}${key ? `:${key(req)}` : ""}`,
    handler: (req, _res, next) => {
      const resetTime = (req as Request & { rateLimit?: { resetTime?: Date } }).rateLimit?.resetTime;
      const retryAfterSeconds = resetTime ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000)) : Math.ceil(windowMs / 1000);
      next(new AppError("RATE_LIMITED", { retryAfterSeconds, detail: name }));
    },
  });
}

const emailKey = (req: Request): string => {
  const email: unknown = (req.body as { email?: unknown } | undefined)?.email;
  return typeof email === "string" ? email.trim().toLowerCase() : "";
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const passThrough: RequestHandler = (_req, _res, next) => next();

/**
 * Plan C11 limits. In-memory stores are correct for one API instance; the scale path
 * (C18) moves them to Redis. Created per app so tests start clean.
 *
 * Login codes (ADR-0020) also have per-number limits in the database (loginCode.ts). The
 * per-IP ones here stop one source from paying for SMS to many numbers ("SMS pumping").
 * `loginCodes: false` is for E2E runs only, where every browser shares one IP.
 */
export function createAuthLimits({ loginCodes = true }: { loginCodes?: boolean } = {}) {
  return {
    login: limiter("login", { windowMs: MINUTE, limit: 5, key: emailKey, skipSuccessful: true }),
    signup: loginCodes ? limiter("signup", { windowMs: HOUR, limit: 10 }) : passThrough,
    codeSend: loginCodes ? limiter("code-send", { windowMs: HOUR, limit: 20 }) : passThrough,
    codeVerify: loginCodes ? limiter("code-verify", { windowMs: 10 * MINUTE, limit: 30 }) : passThrough,
    forgotPerEmail: limiter("forgot", { windowMs: HOUR, limit: 3, key: emailKey }),
    forgotPerIp: limiter("forgot-ip", { windowMs: HOUR, limit: 20 }),
    tokenCheck: limiter("token-check", { windowMs: HOUR, limit: 30 }),
    reset: limiter("reset", { windowMs: HOUR, limit: 10 }),
  };
}

const userKey = (req: Request): string => String(req.user?._id ?? "");

/** Professional panel limits: generous for normal use, tight enough to stop a runaway loop. */
export function createProLimits() {
  return {
    // One heartbeat every 20 s; reconnect bursts are fine.
    heartbeat: limiter("heartbeat", { windowMs: MINUTE, limit: 12, key: userKey }),
    presence: limiter("presence", { windowMs: MINUTE, limit: 20, key: userKey }),
    pushTest: limiter("push-test", { windowMs: 10 * MINUTE, limit: 6, key: userKey }),
  };
}

/** Checkout limits (plan C11: quote 30/min). Off only for stress tests (config refuses that in production). */
export function createCheckoutLimits(enabled = true) {
  if (!enabled) return { quote: passThrough, createBooking: passThrough, verify: passThrough };
  return {
    quote: limiter("quote", { windowMs: MINUTE, limit: 30 }),
    createBooking: limiter("create-booking", { windowMs: MINUTE, limit: 10, key: userKey }),
    verify: limiter("verify-payment", { windowMs: MINUTE, limit: 20, key: userKey }),
  };
}
