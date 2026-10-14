import { clientErrorSchema } from "@brand/shared";
import { Router } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { model, Schema, type Types } from "mongoose";
import { AppError } from "../../errors";
import { bodyOf, validateBody } from "../../http/validate";
import type { Logger } from "../../logger";

interface ClientErrorFields {
  kind: "render" | "error" | "rejection";
  message: string;
  stack: string | null;
  url: string;
  release: string | null;
  userId: Types.ObjectId | null;
  userAgent: string;
  at: Date;
}

const schema = new Schema<ClientErrorFields>(
  {
    kind: { type: String, required: true },
    message: { type: String, required: true },
    stack: { type: String, default: null },
    url: { type: String, required: true },
    release: { type: String, default: null },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    userAgent: { type: String, default: "" },
    at: { type: Date, required: true },
  },
  { versionKey: false },
);
// Kept 30 days (plan C5).
schema.index({ at: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
export const ClientError = model<ClientErrorFields>("ClientError", schema, "client_errors");

/**
 * POST /v1/client-errors (plan C3, C13): crashes in browsers reach the team without a third-party
 * tracker (plan A15). Rate-limited per IP so a crash loop can't flood the logs.
 */
export function clientErrorsRouter({ logger }: { logger: Logger }): Router {
  const router = Router();
  const limit = rateLimit({
    windowMs: 60_000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => `client-errors:${ipKeyGenerator(req.ip ?? "unknown")}`,
    handler: (_req, _res, next) => next(new AppError("RATE_LIMITED", { retryAfterSeconds: 60 })),
  });

  router.post("/client-errors", limit, validateBody(clientErrorSchema), async (req, res) => {
    const input = bodyOf(req, clientErrorSchema);
    const userAgent = (req.get("user-agent") ?? "").slice(0, 300);
    logger.warn({ clientError: { kind: input.kind, message: input.message, url: input.url, release: input.release }, userId: req.user ? String(req.user._id) : null }, "client error");
    await ClientError.create({ ...input, stack: input.stack ?? null, release: input.release ?? null, userId: req.user?._id ?? null, userAgent, at: new Date() });
    res.status(204).end();
  });
  return router;
}
