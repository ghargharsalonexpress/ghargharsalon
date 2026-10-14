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

  /** Test-only helpers under /__test__ (read sent emails, create users). Refused in production. */
  TEST_ROUTES: flag.default(false),
  /** Checkout rate limits (plan C11); only load tests and stress tests switch them off. Refused off in production. */
  CHECKOUT_RATE_LIMITS: flag.default(true),

  /** Images: local folder in development (served at /media), S3 + CloudFront in production. */
  MEDIA_STORAGE: z.enum(["local", "s3"]).default("local"),
  MEDIA_DIR: z.string().min(1).default(".data/media"),
  MEDIA_BASE_URL: z.url().default("http://localhost:4000/media"),
  S3_MEDIA_BUCKET: z.string().min(3).optional(),

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
    if (values.MEDIA_STORAGE !== "s3" || !values.S3_MEDIA_BUCKET) problems.push("MEDIA_STORAGE must be 's3' with S3_MEDIA_BUCKET set");
    if (values.PUSH_TRANSPORT !== "webpush" || !values.VAPID_PUBLIC_KEY || !values.VAPID_PRIVATE_KEY) problems.push("PUSH_TRANSPORT must be 'webpush' with VAPID keys set");
    if (values.PAYMENT_PROVIDER !== "razorpay" || !values.RAZORPAY_KEY_ID || !values.RAZORPAY_KEY_SECRET || !values.RAZORPAY_WEBHOOK_SECRET) {
      problems.push("PAYMENT_PROVIDER must be 'razorpay' with the key id, key secret and webhook secret set");
    }
    if (problems.length > 0) throw new Error(`Unsafe production configuration: ${problems.join("; ")}`);
  }

  // Without keys a development server still runs: alerts are logged instead of sent.
  const pushTransport = values.PUSH_TRANSPORT === "webpush" && (!values.VAPID_PUBLIC_KEY || !values.VAPID_PRIVATE_KEY) ? "log" : values.PUSH_TRANSPORT;

  return { ...values, isProd, webOrigins, pushTransport };
}
