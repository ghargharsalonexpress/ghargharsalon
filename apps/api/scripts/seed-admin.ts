/**
 * Creates the first admin (plan Phase 2), or resets their password with --reset-password.
 * Reads ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME and ADMIN_PHONE from the environment (.env).
 */
import { emailSchema, nameSchema, passwordSchema, phoneSchema, z } from "@brand/shared";
import { loadConfig } from "../src/config";
import { connectDb, disconnectDb, ensureIndexes } from "../src/db";
import { recordAudit } from "../src/modules/audit/audit.model";
import { hashPassword, passwordProblem } from "../src/modules/auth/password";
import { User } from "../src/modules/users/user.model";

const input = z
  .object({
    ADMIN_EMAIL: emailSchema,
    ADMIN_PASSWORD: passwordSchema.min(12, "Admin passwords need at least 12 characters"),
    ADMIN_NAME: nameSchema.default("Admin"),
    ADMIN_PHONE: phoneSchema.default("9000000000"),
  })
  .safeParse(process.env);

if (!input.success) {
  console.error(`Missing or invalid admin details:\n${z.prettifyError(input.error)}`);
  process.exit(1);
}

const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password, ADMIN_NAME: name, ADMIN_PHONE: phone } = input.data;
const resetPassword = process.argv.includes("--reset-password");

const problem = passwordProblem(password, { email, name, phone });
if (problem) {
  console.error("That password is too easy to guess. Choose a longer, unique one.");
  process.exit(1);
}

const config = loadConfig(process.env);
await connectDb(config.MONGODB_URI);
await ensureIndexes();

const existing = await User.findOne({ email });
if (existing && existing.role !== "admin") {
  console.error(`${email} already belongs to a ${existing.role}; use another email.`);
} else if (existing && !resetPassword) {
  console.log(`Admin ${email} already exists. Run with --reset-password to change the password.`);
} else if (existing) {
  existing.passwordHash = await hashPassword(password);
  existing.passwordChangedAt = new Date();
  existing.status = "active";
  await existing.save();
  await recordAudit({ action: "user.password_reset", entity: { type: "user", id: existing.id as string } });
  console.log(`Password reset for admin ${email}.`);
} else {
  const admin = await User.create({ role: "admin", name, email, phone, locale: "en", passwordHash: await hashPassword(password), passwordChangedAt: new Date() });
  await recordAudit({ action: "user.create_admin", entity: { type: "user", id: admin.id as string }, after: { email, name } });
  console.log(`Admin ${email} created.`);
}

await disconnectDb();
