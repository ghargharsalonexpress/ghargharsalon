/**
 * Demo accounts for trying the product locally (never run against production):
 *   npm run seed:demo
 * Creates a verified professional and a customer if they don't exist, and writes their
 * logins to .data/demo-accounts.txt (the .data folder is local-only).
 */
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../src/config";
import { connectDb, disconnectDb, ensureIndexes } from "../src/db";
import { hashPassword } from "../src/modules/auth/password";
import { Professional } from "../src/modules/professionals/professional.model";
import { User } from "../src/modules/users/user.model";

const config = loadConfig(process.env);
if (config.isProd) throw new Error("seed:demo is for development databases only");

const here = fileURLToPath(new URL(".", import.meta.url));
const words = ["amber", "harbour", "lantern", "meadow", "orchid", "pepper", "river", "saffron", "willow", "cobalt"];
const passphrase = () => {
  const bytes = randomBytes(4);
  return `${words[bytes[0]! % words.length]}-${words[bytes[1]! % words.length]}-${words[bytes[2]! % words.length]}-${(bytes[3]! % 90) + 10}`;
};

await connectDb(config.MONGODB_URI);
await ensureIndexes();

const lines: string[] = ["Demo logins for local development (http://localhost:5174/login)", ""];

async function ensureUser(role: "professional" | "customer", email: string, name: string, phone: string, locale: "en" | "hi") {
  const existing = await User.findOne({ email });
  if (existing) {
    lines.push(`${role}: ${email} (already existed; password unchanged)`);
    return existing;
  }
  const password = passphrase();
  const user = await User.create({ role, email, name, phone, locale, passwordHash: await hashPassword(password) });
  lines.push(`${role}: ${email} / ${password}`);
  return user;
}

const admin = await User.findOne({ role: "admin" });
const pro = await ensureUser("professional", "pro.demo@brand.in", "Priya Sharma", "9811100001", "hi");
if (!(await Professional.exists({ userId: pro._id }))) {
  await Professional.create({
    userId: pro._id,
    gender: "female",
    skills: ["salon_women", "makeup", "spa_women"],
    baseArea: "Sector 15, Faridabad",
    travelRadiusKm: 5,
    photo: null,
    verificationNote: "Demo account",
    verification: admin ? { at: new Date(), by: admin._id, byName: admin.name } : null,
  });
}
await ensureUser("customer", "customer.demo@brand.in", "Neha Kapoor", "9811100002", "en");

const dataDir = resolve(here, "../.data");
mkdirSync(dataDir, { recursive: true });
writeFileSync(resolve(dataDir, "demo-accounts.txt"), `${lines.join("\n")}\n`);
console.log(`${lines.join("\n")}\n\nSaved to apps/api/.data/demo-accounts.txt`);
await disconnectDb();
