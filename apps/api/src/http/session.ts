import type { Role } from "@brand/shared";
import MongoStore from "connect-mongo";
import type { Request, Response } from "express";
import session from "express-session";
import mongoose from "mongoose";
import type { Config } from "../config";

declare module "express-session" {
  interface SessionData {
    userId: string;
    role: Role;
  }
}

export const SESSION_COOKIE = "sid";
const DAY_MS = 24 * 60 * 60 * 1000;

/** Rolling lifetimes (plan C11): 30 days for customers and professionals, 12 hours idle for admins. */
export const SESSION_MAX_AGE_MS: Record<Role, number> = {
  customer: 30 * DAY_MS,
  professional: 30 * DAY_MS,
  admin: 12 * 60 * 60 * 1000,
};

type MongoClient = ReturnType<typeof mongoose.connection.getClient>;

/**
 * Server-side sessions in MongoDB (ADR-0005). Stored unstringified so every session of
 * a user can be found and revoked, e.g. after a password reset or a suspension.
 */
export function createSessionMiddleware(config: Config, client: MongoClient) {
  return session({
    name: SESSION_COOKIE,
    secret: config.SESSION_SECRET,
    store: MongoStore.create({ client, collectionName: "sessions", stringify: false, autoRemove: "native", ttl: 30 * 24 * 60 * 60 }),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    proxy: config.TRUST_PROXY > 0,
    cookie: {
      httpOnly: true,
      secure: config.isProd,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_MS.customer,
      ...(config.COOKIE_DOMAIN ? { domain: config.COOKIE_DOMAIN } : {}),
    },
  });
}

const promisify =
  (method: "regenerate" | "save" | "destroy") =>
  (req: Request): Promise<void> =>
    new Promise((resolve, reject) => req.session[method]((error?: unknown) => (error ? reject(error) : resolve())));

const regenerate = promisify("regenerate");
const save = promisify("save");
const destroy = promisify("destroy");

/** New session id on every login (prevents fixation), with the role's lifetime. */
export async function startSession(req: Request, user: { id: string; role: Role }): Promise<void> {
  await regenerate(req);
  req.session.userId = user.id;
  req.session.role = user.role;
  req.session.cookie.maxAge = SESSION_MAX_AGE_MS[user.role];
  await save(req);
}

export async function endSession(req: Request, res: Response, config: Config): Promise<void> {
  if (req.session) await destroy(req);
  res.clearCookie(SESSION_COOKIE, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProd,
    ...(config.COOKIE_DOMAIN ? { domain: config.COOKIE_DOMAIN } : {}),
  });
}

interface StoredSession {
  _id: string;
  session: { userId?: string };
}

/** Signs a person out everywhere, optionally keeping the current session. */
export async function revokeUserSessions(userId: string, keepSessionId?: string): Promise<number> {
  const sessions = mongoose.connection.collection<StoredSession>("sessions");
  const result = await sessions.deleteMany({ "session.userId": userId, ...(keepSessionId ? { _id: { $ne: keepSessionId } } : {}) });
  return result.deletedCount;
}
