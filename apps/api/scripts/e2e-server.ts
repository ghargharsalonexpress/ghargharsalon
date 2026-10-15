/**
 * API for Playwright E2E runs: a fresh in-memory replica set, emails kept in memory and
 * readable through /__test__, plus seeded admin and professional accounts.
 */
import { randomBytes } from "node:crypto";
import { DEFAULT_SETTINGS, DEFAULT_SITE_CONFIG } from "@brand/shared";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import type { RequestHandler } from "express";
import { createApp } from "../src/app";
import { startJobs } from "../src/jobs";
import { loadConfig } from "../src/config";
import { connectDb, ensureIndexes } from "../src/db";
import { createLogger } from "../src/logger";
import { hashPassword } from "../src/modules/auth/password";
import { Category, Service } from "../src/modules/catalog/catalog.models";
import { MemoryTransport } from "../src/modules/email/transport";
import { MemorySmsTransport } from "../src/modules/sms/transport";
import type { Jobs } from "../src/modules/jobs/jobs.service";
import type { Matching } from "../src/modules/matching/matching.service";
import { emailHandler } from "../src/modules/notifications/notifications";
import { LocalGateway } from "../src/modules/payments/gateway";
import { attachRealtime } from "../src/modules/realtime/realtime";
import { createPushService, MemoryPushSender } from "../src/modules/professionals/push";
import { Professional } from "../src/modules/professionals/professional.model";
import { SettingsModel } from "../src/modules/settings/settings.service";
import { SiteModel } from "../src/modules/site/site.models";
import { User } from "../src/modules/users/user.model";
import { E2E_CATALOG } from "./e2e-catalog";

export const E2E_API_PORT = 4100;
export const E2E_WEB_ORIGIN = process.env.E2E_WEB_ORIGIN ?? "http://localhost:5175";

const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });

const config = loadConfig({
  NODE_ENV: "test",
  PORT: String(E2E_API_PORT),
  LOG_LEVEL: "warn",
  MONGODB_URI: replSet.getUri("brand-e2e"),
  SESSION_SECRET: randomBytes(32).toString("base64url"),
  CSRF_SECRET: randomBytes(32).toString("base64url"),
  WEB_ORIGINS: E2E_WEB_ORIGIN,
  WEB_URL: E2E_WEB_ORIGIN,
  EMAIL_TRANSPORT: "memory",
  PUSH_TRANSPORT: "memory",
  SMS_TRANSPORT: "memory",
  // Every browser in a run shares one IP and logs the same seeded people in many times.
  LOGIN_RATE_LIMITS: "0",
  TEST_ROUTES: "1",
  // Uploads from the admin specs stay out of the development media folder.
  MEDIA_DIR: join(tmpdir(), "brand-e2e-media"),
});

await connectDb(config.MONGODB_URI);
await ensureIndexes();

// Known accounts for the E2E specs (e2e/support.ts in apps/web): the admin uses Team login,
// the professional their mobile number and an SMS code (read from /__test__/sms/latest).
const [admin, pro] = await User.create([
  { role: "admin", name: "Asha Admin", email: "admin@e2e.test", phone: "9000000001", locale: "en", passwordHash: await hashPassword("admin-e2e-password-1") },
  { role: "professional", name: "Priya Verma", email: "pro@e2e.test", phone: "9000000002", locale: "hi" },
]);
// Priya is verified, so the pro panel specs can go online.
await Professional.create({
  userId: pro?._id,
  gender: "female",
  skills: ["salon_women", "makeup"],
  baseArea: "Sector 15, Faridabad",
  travelRadiusKm: 5,
  photo: null,
  verificationNote: "Seeded for E2E",
  verification: { at: new Date(), by: admin?._id, byName: "Asha Admin" },
});

// Open around the clock, so booking specs pass at any hour (the default is 08:00–21:00 IST). Searches
// and presence last longer than in production, so a slow machine can't end a booking mid-spec.
await SettingsModel.create({
  _id: "global",
  version: 1,
  values: {
    ...DEFAULT_SETTINGS,
    matching: { ...DEFAULT_SETTINGS.matching, acceptWindowSeconds: 120, searchTimeoutSeconds: 600, stalePresenceSeconds: 600 },
    operations: { ...DEFAULT_SETTINGS.operations, serviceHours: { open: "00:00", close: "23:59" } },
  },
  updatedBy: null,
});

// The website as shipped, but with no outside form: the Join page offers email instead, so no
// spec depends on Google Forms being reachable.
await SiteModel.create({ _id: "site", version: 1, values: { ...DEFAULT_SITE_CONFIG, proFormUrl: "" }, seededPages: [], updatedBy: null });

// A small fixed catalogue for the public and admin specs.
await Category.create(E2E_CATALOG.categories);
await Service.create(E2E_CATALOG.services.map((service) => ({ ...service, version: 1 })));

const email = new MemoryTransport();
const sms = new MemorySmsTransport();
const logger = createLogger(config);
const push = createPushService({ config, sender: new MemoryPushSender(), logger });
const gateway = new LocalGateway("e2e-payment-secret");
const app = createApp({ config, logger, email, sms, mongoClient: mongoose.connection.getClient(), push, gateway });
const server = createServer(app);
attachRealtime(server, { config, logger, sessionMiddleware: app.locals.sessionMiddleware as RequestHandler });
const matching = app.locals.matching as Matching;
const jobs = app.locals.jobs as Jobs;
const stopJobs = startJobs({ logger, push, gateway, handlers: { email: emailHandler({ config, email }) }, loops: [
    { name: "matching", everyMs: 1_000, run: () => matching.sweep() },
    { name: "jobs", everyMs: 10_000, run: () => jobs.sweep() },
  ],
});
server.listen(E2E_API_PORT, () => console.log(`E2E API on http://localhost:${E2E_API_PORT} for ${E2E_WEB_ORIGIN}`));

const stop = async () => {
  stopJobs();
  server.close();
  await mongoose.disconnect();
  await replSet.stop();
  process.exit(0);
};
process.on("SIGINT", () => void stop());
process.on("SIGTERM", () => void stop());
