import { randomUUID } from "node:crypto";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import type mongoose from "mongoose";
import { pinoHttp } from "pino-http";
import type { Config } from "./config";
import { errorHandler, notFound } from "./errors";
import { loadUser } from "./http/auth";
import { createCsrf } from "./http/csrf";
import { createSessionMiddleware } from "./http/session";
import type { Logger } from "./logger";
import { authRouter } from "./modules/auth/auth.routes";
import { createAuthService } from "./modules/auth/auth.service";
import { adminCatalogRouter, catalogRouter } from "./modules/catalog/catalog.routes";
import { contactRouter } from "./modules/contact/contact.module";
import { createMediaStorage, localMediaDir } from "./modules/media/storage";
import { type EmailTransport, MemoryTransport } from "./modules/email/transport";
import { createSmsTransport, MemorySmsTransport, type SmsTransport } from "./modules/sms/transport";
import { healthRouter } from "./modules/health/health.routes";
import { addressesRouter } from "./modules/addresses/addresses";
import { notificationsRouter } from "./modules/notifications/feed.routes";
import { bookingsRouter, webhooksRouter } from "./modules/bookings/bookings.routes";
import { configureOtp } from "./modules/bookings/otp";
import { adminRouter } from "./modules/admin/admin.routes";
import { resolvePassingAlerts } from "./modules/notifications/notifications";
import { clientErrorsRouter } from "./modules/system/clientErrors";
import { createAdmin } from "./modules/admin/admin.service";
import { adminJobsRouter, customerJobsRouter, proJobsRouter } from "./modules/jobs/jobs.routes";
import { createJobs, type Jobs } from "./modules/jobs/jobs.service";
import { adminOffersRouter, proOffersRouter } from "./modules/matching/matching.routes";
import { createMatching, type Matching } from "./modules/matching/matching.service";
import { createGateway, type PaymentGateway } from "./modules/payments/gateway";
import { adminProfessionalsRouter, proRouter } from "./modules/professionals/professionals.routes";
import { createProfessionalService } from "./modules/professionals/professionals.service";
import { createPushSender, createPushService, MemoryPushSender, type PushService } from "./modules/professionals/push";
import { publicInfoRouter, settingsRouter } from "./modules/settings/settings.routes";
import { adminSiteRouter, publicSiteRouter } from "./modules/site/site.routes";
import { testRouter } from "./modules/testing/test.routes";
import { meRouter } from "./modules/users/me.routes";
import { createPayoutGateway, type PayoutGateway } from "./modules/wallet/payoutGateway";
import { configureSeal } from "./modules/wallet/seal";
import { adminWalletRouter, payoutWebhookRouter, proWalletRouter } from "./modules/wallet/wallet.routes";
import { createWallet, type Wallet } from "./modules/wallet/wallet.service";
import { adminLevelsRouter } from "./modules/levels/levels.routes";
import { createLevels, type Levels } from "./modules/levels/levels";

export interface AppDeps {
  config: Config;
  logger: Logger;
  email: EmailTransport;
  /** SMS login codes; built from config when not given (tests pass a MemorySmsTransport). */
  sms?: SmsTransport;
  mongoClient: ReturnType<typeof mongoose.connection.getClient>;
  /** Web Push; built from config when not given (index.ts shares it with the presence sweeper). */
  push?: PushService;
  /** Razorpay or the local gateway; built from config when not given (tests pass their own). */
  gateway?: PaymentGateway;
  /** Withdrawals: RazorpayX, the local gateway, or null for payouts by hand; from config when not given. */
  payoutGateway?: PayoutGateway | null;
}

const REQUEST_ID = /^[\w-]{8,64}$/;

/** Builds the Express app. index.ts runs it; tests drive it in memory with supertest. */
export function createApp({ config, logger, email, sms: givenSms, mongoClient, push: givenPush, gateway: givenGateway, payoutGateway: givenPayoutGateway }: AppDeps): Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", config.TRUST_PROXY);

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const incoming = req.headers["x-request-id"];
        const id = typeof incoming === "string" && REQUEST_ID.test(incoming) ? incoming : randomUUID();
        res.setHeader("X-Request-Id", id);
        return id;
      },
      autoLogging: { ignore: (req) => req.url?.startsWith("/health") ?? false },
      customLogLevel: (_req, res, error) => (error || res.statusCode >= 500 ? "error" : "info"),
    }),
  );

  // A JSON API: no scripts, no framing, HSTS in production (plan C11).
  app.use(
    helmet({
      contentSecurityPolicy: { useDefaults: false, directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: "same-site" },
      strictTransportSecurity: config.isProd ? { maxAge: 31_536_000, includeSubDomains: true } : false,
    }),
  );

  // Only the web app's origins, with cookies (plan C11).
  app.use(
    cors({
      origin: config.webOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "X-CSRF-Token", "X-Request-Id", "Idempotency-Key"],
      exposedHeaders: ["X-Request-Id", "Retry-After"],
      maxAge: 600,
    }),
  );

  app.use("/health", healthRouter());

  // Development images; production serves them from ImageKit (MEDIA_BASE_URL).
  const media = createMediaStorage(config);
  if (config.MEDIA_STORAGE === "local") {
    app.use("/media", express.static(localMediaDir(config), { immutable: true, maxAge: "365d", index: false, fallthrough: false }));
  }

  configureOtp(config.SESSION_SECRET);
  configureSeal(config.SESSION_SECRET);
  const gateway = givenGateway ?? createGateway(config);
  const sms = givenSms ?? createSmsTransport(config, logger);
  const auth = createAuthService({ config, email, sms, logger });
  const push = givenPush ?? createPushService({ config, sender: createPushSender(config, logger), logger });
  const payoutGateway = givenPayoutGateway === undefined ? createPayoutGateway(config) : givenPayoutGateway;
  const wallet: Wallet = createWallet({ config, gateway: payoutGateway, push, logger, codes: { send: (phone) => auth.sendLoginCode(phone), confirm: (phone, code) => auth.confirmCode(phone, code) } });
  // Signed by Razorpay over the raw bytes: before the JSON parser, sessions and CSRF.
  app.use("/v1/webhooks", webhooksRouter({ gateway, logger }));
  app.use("/v1/webhooks", payoutWebhookRouter({ wallet, gateway: payoutGateway, logger }));

  // Website pages carry long texts (policies) in two languages: a larger limit for the editor only.
  app.use("/v1/admin/site", express.json({ limit: "1mb" }));
  app.use(express.json({ limit: "100kb" }));
  const professionals = createProfessionalService({ push, logger, supportPhone: config.SUPPORT_PHONE });
  const matching: Matching = createMatching({ push, logger, mapsKey: config.GOOGLE_MAPS_SERVER_KEY ?? "" });
  resolvePassingAlerts();
  const jobs: Jobs = createJobs({ push, logger, config });
  const levels: Levels = createLevels({ push, logger });

  // Test helpers sit before sessions and CSRF: they're called by test runners, not browsers.
  if (config.TEST_ROUTES) {
    if (!(email instanceof MemoryTransport)) throw new Error("TEST_ROUTES needs EMAIL_TRANSPORT=memory");
    if (!(sms instanceof MemorySmsTransport)) throw new Error("TEST_ROUTES needs SMS_TRANSPORT=memory");
    app.use("/__test__", testRouter({ email, sms, push: push.sender instanceof MemoryPushSender ? push.sender : undefined }));
  }

  app.use(cookieParser());
  const sessionMiddleware = createSessionMiddleware(config, mongoClient);
  app.use(sessionMiddleware);
  const csrf = createCsrf(config);
  app.use(csrf.protect);
  app.use(loadUser);

  app.use("/v1", authRouter({ config, csrf, auth }));
  app.use("/v1/me/addresses", addressesRouter());
  app.use("/v1/me/notifications", notificationsRouter());
  app.use("/v1/me", meRouter());
  app.use("/v1", catalogRouter());
  app.use("/v1", contactRouter({ config, email, logger }));
  app.use("/v1", publicInfoRouter());
  app.use("/v1", publicSiteRouter({ config }));
  app.use("/v1", clientErrorsRouter({ logger }));
  app.use("/v1", bookingsRouter({ gateway, logger, rateLimits: config.CHECKOUT_RATE_LIMITS }));
  app.use("/v1", customerJobsRouter({ jobs, gateway }));
  app.use("/v1/admin/settings", settingsRouter());
  app.use("/v1/admin/site", adminSiteRouter());
  app.use("/v1/admin", adminCatalogRouter({ media }));
  app.use("/v1/admin", adminWalletRouter({ wallet }));
  app.use("/v1/admin", adminLevelsRouter({ levels }));
  app.use("/v1/admin/professionals", adminProfessionalsRouter({ service: professionals }));
  app.use("/v1/admin/bookings", adminOffersRouter({ matching }));
  app.use("/v1/admin/bookings", adminJobsRouter({ jobs, gateway }));
  app.use("/v1/admin", adminRouter({ admin: createAdmin({ gateway }), jobs, gateway }));
  app.use("/v1/pro/offers", proOffersRouter({ matching, gateway }));
  app.use("/v1/pro/jobs", proJobsRouter({ jobs }));
  app.use("/v1/pro/wallet", proWalletRouter({ wallet }));
  app.use("/v1/pro", proRouter({ service: professionals, push }));

  app.use(notFound);
  app.use(errorHandler);
  // index.ts attaches Socket.IO with the same session cookie and runs the matching sweeper.
  app.locals.sessionMiddleware = sessionMiddleware;
  app.locals.matching = matching;
  app.locals.jobs = jobs;
  app.locals.wallet = wallet;
  app.locals.levels = levels;
  return app;
}
