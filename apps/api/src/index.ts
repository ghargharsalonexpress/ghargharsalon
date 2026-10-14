import { createServer } from "node:http";
import type { RequestHandler } from "express";
import mongoose from "mongoose";
import { createApp } from "./app";
import { loadConfig } from "./config";
import { connectDb, disconnectDb, ensureIndexes } from "./db";
import { createLogger } from "./logger";
import { createEmailTransport } from "./modules/email/transport";
import { startJobs } from "./jobs";
import type { Jobs } from "./modules/jobs/jobs.service";
import type { Matching } from "./modules/matching/matching.service";
import { emailHandler } from "./modules/notifications/notifications";
import { createGateway } from "./modules/payments/gateway";
import { attachRealtime } from "./modules/realtime/realtime";
import { createPushSender, createPushService } from "./modules/professionals/push";

const config = loadConfig(process.env);
const logger = createLogger(config);

await connectDb(config.MONGODB_URI);
await ensureIndexes((message) => logger.warn(message));

const push = createPushService({ config, sender: createPushSender(config, logger), logger });
const gateway = createGateway(config);
const email = createEmailTransport(config, logger);
const app = createApp({ config, logger, email, mongoClient: mongoose.connection.getClient(), push, gateway });
const server = createServer(app);
attachRealtime(server, { config, logger, sessionMiddleware: app.locals.sessionMiddleware as RequestHandler });
server.listen(config.PORT, () => logger.info({ port: config.PORT, env: config.NODE_ENV, push: config.pushTransport, payments: gateway.provider }, "API listening"));
const matching = app.locals.matching as Matching;
const jobs = app.locals.jobs as Jobs;

// Background work (plan C7): one instance runs it; every step is idempotent, so restarts are safe.
const stopJobs = startJobs({
  logger,
  push,
  gateway,
  handlers: { email: emailHandler({ config, email }) },
  loops: [
    { name: "matching", everyMs: 2_000, run: () => matching.sweep() },
    { name: "jobs", everyMs: 30_000, run: () => jobs.sweep() },
  ],
});

let stopping = false;
async function shutdown(signal: string): Promise<void> {
  if (stopping) return;
  stopping = true;
  logger.info({ signal }, "shutting down");
  stopJobs();
  server.close();
  await disconnectDb();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => logger.error({ err: reason }, "unhandled rejection"));
