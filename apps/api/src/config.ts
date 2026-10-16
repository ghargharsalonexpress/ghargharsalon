import { z } from "@brand/shared";

const flag = z
  .enum(["0", "1", "true", "false"])
  .transform((value) => value === "1" || value === "true");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

  MONGODB_URI: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  CSRF_SECRET: z.string().min(32),

  WEB_ORIGINS: z.string().default("http://localhost:5174"),
  WEB_URL: z.url().default("http://localhost:5174"),
  COOKIE_DOMAIN: z.string().min(1).optional(),
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),

  BRAND_NAME: z.string().min(1).default("Brand"),
  SUPPORT_EMAIL: z.string().min(3).default("support@brand.in"),
  SUPPORT_PHONE: z.string().min(3).default("+91 00000 00000"),

  EMAIL_TRANSPORT: z.enum(["log", "memory", "ses"]).default("log"),
  EMAIL_FROM: z.string().min(3).default("Brand <no-reply@brand.in>"),
  EMAIL_LOG_DIR: z.string().min(1).optional(),
  AWS_REGION: z.string().min(1).default("ap-south-1"),

  /**
   * Login codes by SMS (ADR-0020): 2factor (2Factor.in) live; log writes the code to the API's
   * log while developing; memory in tests.
   */
  SMS_TRANSPORT: z.enum(["log", "memory", "2factor"]).default("log"),

  /**
   * Booking updates on WhatsApp (plan C10). Utility templates only: cheaper than SMS, better
   * read, and no opt-in beyond the booking itself. "log" prints them instead of calling Meta.
   */
  WHATSAPP_TRANSPORT: z.enum(["log", "memory", "cloud"]).default("log"),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(5).optional(),
  WHATSAPP_TOKEN: z.string().min(20).optional(),
  TWOFACTOR_API_KEY: z.string().min(10).optional(),
  /** The DLT-approved OTP template's name in the 2Factor account. */
  TWOFACTOR_OTP_TEMPLATE: z.string().min(1).optional(),
  /**
   * Local demos only: the API also returns the code, so the login screen can show it. Honoured
   * only with SMS_TRANSPORT=log and a localhost WEB_URL; refused in production.
   */
  SMS_DEV_CODE: flag.default(false),
  /** Resend wait, per-number and per-IP limits on login codes. Off only for E2E runs (refused off in production). */
  LOGIN_RATE_LIMITS: flag.default(true),

  /** Test-only helpers under /__test__ (read sent emails, create users). Refused in production. */
  TEST_ROUTES: flag.default(false),
  /** Checkout rate limits (plan C11); only load tests and stress tests switch them off. Refused off in production. */
  CHECKOUT_RATE_LIMITS: flag.default(true),

  /** Images: local folder in development (served at /media), ImageKit in production. */
  MEDIA_STORAGE: z.enum(["local", "imagekit"]).default("local"),
  MEDIA_DIR: z.string().min(1).default(".data/media"),
  /** Where the browser reads images from: the API's /media locally, the ImageKit endpoint live. */
  MEDIA_BASE_URL: z.url().default("http://localhost:4000/media"),
  /** The only ImageKit secret the server needs; uploads are server-side, so no public key here. */
  IMAGEKIT_PRIVATE_KEY: z.string().min(10).optional(),

  /**
   * Routes API key for road distances in matching. Server-side, so it is restricted by API
   * rather than by referrer: it is NOT the browser key. Empty: matching uses straight-line.
   */
  GOOGLE_MAPS_SERVER_KEY: z.string().min(10).optional(),

  /** Job alerts (plan C10): webpush with VAPID keys; log when developing without keys; memory in tests. */
  PUSH_TRANSPORT: z.enum(["webpush", "log", "memory"]).default("webpush"),
  VAPID_PUBLIC_KEY: z.string().min(40).optional(),
  VAPID_PRIVATE_KEY: z.string().min(20).optional(),
  VAPID_SUBJECT: z.string().regex(/^(mailto:|https:)/).default("mailto:support@brand.in"),

  /** The invoicing business (plan C9). Placeholders until the client and their CA confirm (A1). */
  SELLER_NAME: z.string().min(2).default("[Company legal name]"),
  SELLER_ADDRESS: z.string().min(2).default("[Registered office address]"),
  SELLER_GSTIN: z.string().min(2).default("[GSTIN]"),

  /** Payments (plan C9): Razorpay in staging/production; a local gateway with a test payment sheet otherwise. */
  PAYMENT_PROVIDER: z.enum(["razorpay", "fake"]).default("fake"),
  RAZORPAY_KEY_ID: z.string().min(8).optional(),
  RAZORPAY_KEY_SECRET: z.string().min(8).optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(8).optional(),

  /**
   * Professionals' withdrawals (ADR-0022): razorpayx sends them through RazorpayX Payouts;
   * manual puts them in the team's queue to pay by hand (until RazorpayX is set up); fake
   * pays at once (development and tests). Unset: manual in production, fake elsewhere.
   */
  PAYOUT_PROVIDER: z.enum(["razorpayx", "manual", "fake"]).optional(),
  /** The RazorpayX account the money leaves from (the "account_number" in RazorpayX). */
  RAZORPAYX_ACCOUNT_NUMBER: z.string().min(6).optional(),
  /** Usually the same API keys as payments; set these only if RazorpayX has its own. */
  RAZORPAYX_KEY_ID: z.string().min(8).optional(),
  RAZORPAYX_KEY_SECRET: z.string().min(8).optional(),
  RAZORPAYX_WEBHOOK_SECRET: z.string().min(8).optional(),
});

export type Config = ReturnType<typeof loadConfig>;

/** Validates the environment once at start-up; a bad deploy fails loudly instead of half-working. */
export function loadConfig(env: Record<string, string | undefined>) {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(parsed.error)}`);
  }

  const values = parsed.data;
  const isProd = values.NODE_ENV === "production";
  const webOrigins = values.WEB_ORIGINS.split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);

  if (isProd) {
    const problems: string[] = [];
    if (values.EMAIL_TRANSPORT !== "ses") problems.push("EMAIL_TRANSPORT must be 'ses'");
    if (values.TEST_ROUTES) problems.push("TEST_ROUTES must be off");
    if (!values.CHECKOUT_RATE_LIMITS) problems.push("CHECKOUT_RATE_LIMITS must be on");
    if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(values.SELLER_GSTIN)) problems.push("SELLER_GSTIN must be a valid GSTIN");
    if (!values.COOKIE_DOMAIN) problems.push("COOKIE_DOMAIN is required (for example .brand.in)");
    if (webOrigins.some((origin) => !origin.startsWith("https://"))) problems.push("WEB_ORIGINS must all be https");
    if (values.MEDIA_STORAGE !== "imagekit" || !values.IMAGEKIT_PRIVATE_KEY) problems.push("MEDIA_STORAGE must be 'imagekit' with IMAGEKIT_PRIVATE_KEY set");
    if (values.PUSH_TRANSPORT !== "webpush" || !values.VAPID_PUBLIC_KEY || !values.VAPID_PRIVATE_KEY) problems.push("PUSH_TRANSPORT must be 'webpush' with VAPID keys set");
    if (values.PAYMENT_PROVIDER !== "razorpay" || !values.RAZORPAY_KEY_ID || !values.RAZORPAY_KEY_SECRET || !values.RAZORPAY_WEBHOOK_SECRET) {
      problems.push("PAYMENT_PROVIDER must be 'razorpay' with the key id, key secret and webhook secret set");
    }
    if (values.SMS_TRANSPORT !== "2factor" || !values.TWOFACTOR_API_KEY) problems.push("SMS_TRANSPORT must be '2factor' with TWOFACTOR_API_KEY set");
    if (values.SMS_DEV_CODE) problems.push("SMS_DEV_CODE must be off");
    if (!values.LOGIN_RATE_LIMITS) problems.push("LOGIN_RATE_LIMITS must be on");
    if (values.PAYOUT_PROVIDER === "fake") problems.push("PAYOUT_PROVIDER must be 'razorpayx' or 'manual'");
    if (problems.length > 0) throw new Error(`Unsafe production configuration: ${problems.join("; ")}`);
  }
  if (values.SMS_TRANSPORT === "2factor" && !values.TWOFACTOR_API_KEY) {
    throw new Error("Invalid environment configuration: SMS_TRANSPORT=2factor needs TWOFACTOR_API_KEY");
  }

  const payoutProvider = values.PAYOUT_PROVIDER ?? (isProd ? "manual" : "fake");
  if (payoutProvider === "razorpayx") {
    const keyId = values.RAZORPAYX_KEY_ID ?? values.RAZORPAY_KEY_ID;
    const keySecret = values.RAZORPAYX_KEY_SECRET ?? values.RAZORPAY_KEY_SECRET;
    if (!values.RAZORPAYX_ACCOUNT_NUMBER || !keyId || !keySecret || !values.RAZORPAYX_WEBHOOK_SECRET) {
      throw new Error("Invalid environment configuration: PAYOUT_PROVIDER=razorpayx needs RAZORPAYX_ACCOUNT_NUMBER, RAZORPAYX_WEBHOOK_SECRET and API keys (RAZORPAYX_KEY_ID/SECRET or RAZORPAY_KEY_ID/SECRET)");
    }
  }

  // Without keys a development server still runs: alerts are logged instead of sent.
  const pushTransport = values.PUSH_TRANSPORT === "webpush" && (!values.VAPID_PUBLIC_KEY || !values.VAPID_PRIVATE_KEY) ? "log" : values.PUSH_TRANSPORT;

  // Showing the login code on screen is for this PC's demos only: never with a real SMS sender
  // or a public address, whatever NODE_ENV says.
  const localWeb = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(values.WEB_URL.replace(/\/$/, ""));
  const smsDevCode = values.SMS_DEV_CODE && values.SMS_TRANSPORT === "log" && localWeb && !isProd;

  return { ...values, isProd, webOrigins, pushTransport, smsDevCode, payoutProvider };
}
