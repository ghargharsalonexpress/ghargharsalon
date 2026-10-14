import { CONTACT_STATUSES, type ContactMessageDto, contactSchema, contactStatusSchema, type ContactStatus } from "@brand/shared";
import { Router } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { model, Schema } from "mongoose";
import type { Config } from "../../config";
import { AppError } from "../../errors";
import { requireRole } from "../../http/auth";
import { bodyOf, validateBody } from "../../http/validate";
import type { Logger } from "../../logger";
import { auditActor, recordAudit } from "../audit/audit.model";
import { contactAckEmail, contactAdminEmail } from "../email/templates";
import type { EmailTransport } from "../email/transport";

interface ContactFields {
  name: string;
  email: string;
  phone: string;
  message: string;
  status: ContactStatus;
  ip: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const contactMessageSchema = new Schema<ContactFields>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: "" },
    message: { type: String, required: true },
    status: { type: String, enum: CONTACT_STATUSES, default: "new" },
    ip: { type: String, default: null },
  },
  { timestamps: true },
);
contactMessageSchema.index({ status: 1, createdAt: -1 });

export const ContactMessage = model<ContactFields>("ContactMessage", contactMessageSchema, "contact_messages");

const toDto = (doc: ContactFields & { _id: unknown }): ContactMessageDto => ({
  id: String(doc._id),
  name: doc.name,
  email: doc.email,
  phone: doc.phone,
  message: doc.message,
  status: doc.status,
  createdAt: doc.createdAt.toISOString(),
});

/** POST /v1/contact (W17) and /v1/admin/messages. */
export function contactRouter({ config, email, logger }: { config: Config; email: EmailTransport; logger: Logger }): Router {
  const router = Router();
  const context = { brandName: config.BRAND_NAME, supportEmail: config.SUPPORT_EMAIL, supportPhone: config.SUPPORT_PHONE };

  // 5 messages per hour per IP (plan C11) plus the honeypot below.
  const limit = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => `contact:${ipKeyGenerator(req.ip ?? "unknown")}`,
    handler: (_req, _res, next) => next(new AppError("RATE_LIMITED", { retryAfterSeconds: 3600 })),
  });

  router.post("/contact", limit, validateBody(contactSchema), async (req, res) => {
    const input = bodyOf(req, contactSchema);
    // Bots fill hidden fields; they get the same answer but nothing is stored or sent.
    if (input.website) {
      res.status(202).json({});
      return;
    }
    const doc = await ContactMessage.create({ name: input.name, email: input.email, phone: input.phone, message: input.message, ip: req.ip ?? null });
    try {
      await email.send(contactAdminEmail({ to: config.SUPPORT_EMAIL, name: input.name, email: input.email, phone: input.phone, message: input.message, id: doc.id as string }, context));
      await email.send(contactAckEmail({ to: input.email, name: input.name, lang: input.locale ?? "en" }, context));
    } catch (error) {
      logger.error({ err: error, messageId: doc.id }, "contact emails failed");
    }
    res.status(202).json({});
  });

  router.get("/admin/messages", requireRole("admin"), async (req, res) => {
    const status = CONTACT_STATUSES.find((value) => value === req.query.status);
    const docs = await ContactMessage.find(status ? { status } : {})
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json(docs.map(toDto));
  });

  router.patch("/admin/messages/:id", requireRole("admin"), validateBody(contactStatusSchema), async (req, res) => {
    if (!/^[a-f0-9]{24}$/.test(String(req.params.id))) throw new AppError("NOT_FOUND");
    const { status } = bodyOf(req, contactStatusSchema);
    const doc = await ContactMessage.findByIdAndUpdate(req.params.id, { $set: { status } }, { returnDocument: "after" }).lean();
    if (!doc) throw new AppError("NOT_FOUND");
    await recordAudit({ action: "message.status", entity: { type: "contact_message", id: String(doc._id) }, after: { status } }, auditActor(req));
    res.json(toDto(doc));
  });

  return router;
}
