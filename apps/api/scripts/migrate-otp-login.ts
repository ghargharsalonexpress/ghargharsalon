/**
 * One-off step before the mobile-number login (ADR-0020) goes live on a database:
 *   npm run migrate:otp-login
 * 1. Lists phone numbers that belong to more than one account. Each number must belong to one
 *    account, so these must be fixed first (change or remove the extra account in the admin
 *    or the database); the script then stops without changing anything.
 * 2. Otherwise updates the user indexes: removes the old email index (unique for everyone,
 *    "no email" included), and makes email unique only when present and phone unique.
 * Safe to run again. The API only ever adds indexes on start-up (so an older API on the same
 * database keeps working); it logs a reminder while the old index or duplicates remain.
 */
import { loadConfig } from "../src/config";
import { connectDb, disconnectDb, dropLegacyEmailIndex, ensureIndexes } from "../src/db";
import { duplicatePhones, User } from "../src/modules/users/user.model";

const config = loadConfig(process.env);
await connectDb(config.MONGODB_URI);

const duplicates = await duplicatePhones();
if (duplicates.length > 0) {
  console.error(`${duplicates.length} phone number(s) belong to more than one account. Fix these, then run again:`);
  for (const { phone, ids } of duplicates) {
    const users = await User.find({ _id: { $in: ids } }, { role: 1, name: 1, email: 1, createdAt: 1 }).lean();
    console.error(`  ${phone}: ${users.map((user) => `${user.role} "${user.name}" ${user.email ?? "(no email)"} [${String(user._id)}]`).join("; ")}`);
  }
  process.exitCode = 1;
} else {
  if (await dropLegacyEmailIndex()) console.log('Removed the old "email_1" index.');
  await ensureIndexes();
  const indexes = await User.collection.indexes();
  const byRole = await User.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$role", count: { $sum: 1 } } }]);
  console.log("No duplicate phone numbers. User indexes:");
  for (const index of indexes) console.log(`  ${index.name}${index.unique ? " (unique)" : ""}${index.partialFilterExpression ? " (only when set)" : ""}`);
  console.log(`Accounts: ${byRole.map((row) => `${row._id} ${row.count}`).join(", ")}`);
  console.log("Customers and professionals now log in with their mobile number; admins keep Team login.");
}

await disconnectDb();
