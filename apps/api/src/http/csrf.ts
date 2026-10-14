import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { CookieOptions, Request, RequestHandler, Response } from "express";
import type { Config } from "../config";
import { AppError } from "../errors";

export const CSRF_COOKIE = "csrf";
export const CSRF_HEADER = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Signed double-submit token plus an Origin check (plan C11). Session cookies are
 * already SameSite=Lax; this is the second layer, and it also covers logged-out forms
 * such as login and sign-up.
 */
export function createCsrf(config: Config) {
  const sign = (nonce: string) => createHmac("sha256", config.CSRF_SECRET).update(nonce).digest("base64url");

  const isSigned = (token: string) => {
    const [nonce, signature, extra] = token.split(".");
    return Boolean(nonce && signature && extra === undefined && safeEqual(signature, sign(nonce)));
  };

  const cookieOptions: CookieOptions = {
    httpOnly: false,
    sameSite: "lax",
    secure: config.isProd,
    path: "/",
    ...(config.COOKIE_DOMAIN ? { domain: config.COOKIE_DOMAIN } : {}),
  };

  /** Reuses a valid token from the cookie or issues a new one; returned by GET /v1/session. */
  function issue(req: Request, res: Response): string {
    const existing: unknown = req.cookies?.[CSRF_COOKIE];
    if (typeof existing === "string" && isSigned(existing)) return existing;
    const nonce = randomBytes(32).toString("base64url");
    const token = `${nonce}.${sign(nonce)}`;
    res.cookie(CSRF_COOKIE, token, cookieOptions);
    return token;
  }

  const protect: RequestHandler = (req, _res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();

    const origin = req.get("origin");
    if (origin && !config.webOrigins.includes(origin)) throw new AppError("ORIGIN_NOT_ALLOWED", { detail: origin });

    const header = req.get(CSRF_HEADER);
    const cookie: unknown = req.cookies?.[CSRF_COOKIE];
    if (!header || typeof cookie !== "string" || !safeEqual(header, cookie) || !isSigned(cookie)) {
      throw new AppError("CSRF_FAILED");
    }
    next();
  };

  return { issue, protect };
}

export type Csrf = ReturnType<typeof createCsrf>;
