import { updateMeSchema, type UserResponse, V } from "@brand/shared";
import { Router } from "express";
import { AppError } from "../../errors";
import { currentUser, requireAuth } from "../../http/auth";
import { bodyOf, validateBody } from "../../http/validate";
import { isDuplicateKeyError, toUserDto, User } from "./user.model";

/**
 * GET/PATCH /v1/me: the signed-in person's own profile (name, email, language). The phone is
 * the login (ADR-0020), so it changes only through support.
 */
export function meRouter(): Router {
  const router = Router();
  router.use(requireAuth);

  router.get("/", (req, res) => {
    const body: UserResponse = { user: toUserDto(currentUser(req)) };
    res.json(body);
  });

  router.patch("/", validateBody(updateMeSchema), async (req, res) => {
    const user = currentUser(req);
    const { name, email, locale } = bodyOf(req, updateMeSchema);
    if (name !== undefined) user.name = name;
    if (locale !== undefined) user.locale = locale;
    if (email !== undefined && email !== user.email) {
      // Team accounts sign in with their email, so it can't be removed.
      if (email === null && user.role === "admin") throw new AppError("VALIDATION_FAILED", { fields: { email: V.required } });
      if (email && (await User.exists({ email, _id: { $ne: user._id } }))) throw new AppError("EMAIL_TAKEN", { fields: { email: V.emailTaken } });
      user.email = email;
    }
    try {
      await user.save();
    } catch (error) {
      if (isDuplicateKeyError(error)) throw new AppError("EMAIL_TAKEN", { fields: { email: V.emailTaken } });
      throw error;
    }
    const body: UserResponse = { user: toUserDto(user) };
    res.json(body);
  });

  return router;
}
