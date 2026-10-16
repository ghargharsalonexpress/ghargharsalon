import { notificationPageSchema, notificationReadSchema } from "@brand/shared";
import { Router } from "express";
import { AppError } from "../../errors";
import { currentUser, requireAuth } from "../../http/auth";
import { bodyOf, fieldErrors, validateBody } from "../../http/validate";
import { feedPage, markRead, unreadCount } from "./feed";

/** /v1/me/notifications (plan C10): the feed behind the bell, for whoever is signed in. */
export function notificationsRouter(): Router {
  const router = Router();
  router.use(requireAuth);

  const who = (req: Parameters<typeof currentUser>[0]) => {
    const user = currentUser(req);
    // An admin sees their own rows and the team's.
    return { userId: user._id, isAdmin: user.role === "admin" };
  };

  router.get("/", async (req, res) => {
    const parsed = notificationPageSchema.safeParse(req.query);
    if (!parsed.success) throw new AppError("VALIDATION_FAILED", { fields: fieldErrors(parsed.error) });
    const { before, limit } = parsed.data;
    res.json(await feedPage(who(req), { before: before ? new Date(before) : undefined, limit }));
  });

  router.get("/unread-count", async (req, res) => {
    res.json({ unread: await unreadCount(who(req)) });
  });

  router.post("/read", validateBody(notificationReadSchema), async (req, res) => {
    const { id } = bodyOf(req, notificationReadSchema);
    const read = await markRead(who(req), id);
    res.json({ read, unread: await unreadCount(who(req)) });
  });

  return router;
}
