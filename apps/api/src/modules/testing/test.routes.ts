import { emailSchema, nameSchema, passwordSchema, phoneSchema, ROLES, z } from "@brand/shared";
import { Router } from "express";
import { AppError } from "../../errors";
import { bodyOf, validateBody } from "../../http/validate";
import type { AuthService } from "../auth/auth.service";
import { hashPassword } from "../auth/password";
import type { MemoryTransport } from "../email/transport";
import { Professional } from "../professionals/professional.model";
import type { MemoryPushSender } from "../professionals/push";
import { User } from "../users/user.model";

const createUserSchema = z.strictObject({
  role: z.enum(ROLES),
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema.optional(),
  locale: z.enum(["en", "hi"]).optional(),
  /** Professionals: verified, and online at this point (as if the panel just sent a heartbeat). */
  verified: z.boolean().optional(),
  online: z.strictObject({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).optional(),
});

/**
 * E2E helpers, mounted only when TEST_ROUTES=1 (refused in production by config.ts).
 * They let browser tests read the emails a flow sent and create users directly.
 */
export function testRouter({ email, auth, push }: { email: MemoryTransport; auth: AuthService; push?: MemoryPushSender }): Router {
  const router = Router();

  // Alerts the E2E browser's fake push subscription would have received.
  router.get("/pushes", (req, res) => {
    const endpoint = typeof req.query.endpoint === "string" ? req.query.endpoint : "";
    res.json(push ? push.to(endpoint) : []);
  });

  router.get("/emails/latest", (req, res) => {
    const to = typeof req.query.to === "string" ? req.query.to : "";
    const message = email.latestTo(to);
    if (!message) throw new AppError("NOT_FOUND");
    const links = [...message.html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]?.replace(/&amp;/g, "&"));
    res.json({ subject: message.subject, text: message.text, tag: message.tag, links: [...new Set(links)].filter((link) => !link?.startsWith("mailto:")) });
  });

  router.post("/users", validateBody(createUserSchema), async (req, res) => {
    const input = bodyOf(req, createUserSchema);
    const user = await User.create({
      role: input.role,
      name: input.name,
      email: input.email,
      phone: input.phone,
      locale: input.locale ?? (input.role === "professional" ? "hi" : "en"),
      passwordHash: input.password ? await hashPassword(input.password) : null,
    });
    // Professionals always come with a profile (the admin creates both); unverified by default.
    if (input.role === "professional") {
      const now = new Date();
      await Professional.create({
        userId: user._id,
        gender: "female",
        skills: ["salon_women"],
        baseArea: "Sector 15, Faridabad",
        travelRadiusKm: 5,
        photo: null,
        verificationNote: "",
        verification: input.verified ? { at: now, by: user._id, byName: "E2E" } : null,
        ...(input.online
          ? {
              presence: {
                state: "available",
                since: now,
                lastHeartbeatAt: now,
                location: { type: "Point", coordinates: [input.online.lng, input.online.lat] },
                locationAt: now,
                accuracyM: 20,
                activeBookingId: null,
              },
            }
          : {}),
      });
    }
    const setPasswordUrl = input.password ? null : await auth.sendSetPasswordLink(user);
    res.status(201).json({ id: user.id as string, setPasswordUrl });
  });

  return router;
}
