import type { Role } from "@brand/shared";
import type { RequestHandler } from "express";
import type { Types } from "mongoose";
import { AppError } from "../errors";
import { User, type UserDoc } from "../modules/users/user.model";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** The signed-in, active user; undefined for guests. */
      user?: UserDoc;
    }
  }
}

/**
 * Loads the session's user on every request. A user who was blocked, suspended or deleted
 * since logging in loses the session immediately (plan C11: instant revocation).
 */
export const loadUser: RequestHandler = async (req, _res, next) => {
  const userId = req.session?.userId;
  if (!userId) return next();

  const user = await User.findById(userId);
  if (user && user.status === "active" && user.role === req.session.role) {
    req.user = user;
    return next();
  }
  await new Promise<void>((resolve) => req.session.destroy(() => resolve()));
  next();
};

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user) throw new AppError("AUTH_REQUIRED");
  next();
};

/** Authorisation lives on the server; the web only hides what a role can't use (plan A7). */
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) throw new AppError("AUTH_REQUIRED");
    if (!roles.includes(req.user.role)) throw new AppError("FORBIDDEN", { detail: `role ${req.user.role}` });
    next();
  };

/** For per-record checks in services: owners and admins pass, everyone else gets FORBIDDEN. */
export function assertOwnerOrAdmin(user: UserDoc, ownerId: Types.ObjectId | string): void {
  if (user.role === "admin") return;
  if (String(ownerId) !== String(user._id)) throw new AppError("FORBIDDEN", { detail: "not the owner" });
}

/** The signed-in user in a handler that sits behind requireAuth/requireRole. */
export function currentUser(req: { user?: UserDoc }): UserDoc {
  if (!req.user) throw new AppError("AUTH_REQUIRED");
  return req.user;
}
