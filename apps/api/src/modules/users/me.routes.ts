import { updateMeSchema, type UserResponse } from "@brand/shared";
import { Router } from "express";
import { currentUser, requireAuth } from "../../http/auth";
import { bodyOf, validateBody } from "../../http/validate";
import { toUserDto } from "./user.model";

/** GET/PATCH /v1/me: the signed-in person's own profile (name, phone, language). */
export function meRouter(): Router {
  const router = Router();
  router.use(requireAuth);

  router.get("/", (req, res) => {
    const body: UserResponse = { user: toUserDto(currentUser(req)) };
    res.json(body);
  });

  router.patch("/", validateBody(updateMeSchema), async (req, res) => {
    const user = currentUser(req);
    const { name, phone, locale } = bodyOf(req, updateMeSchema);
    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (locale !== undefined) user.locale = locale;
    await user.save();
    const body: UserResponse = { user: toUserDto(user) };
    res.json(body);
  });

  return router;
}
