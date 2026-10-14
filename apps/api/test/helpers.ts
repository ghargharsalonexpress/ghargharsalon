import { randomUUID } from "node:crypto";
import type { Express } from "express";
import mongoose from "mongoose";
import request from "supertest";
import type TestAgent from "supertest/lib/agent";
import { inject } from "vitest";
import { createApp } from "../src/app";
import { type Config, loadConfig } from "../src/config";
import { connectDb, ensureIndexes } from "../src/db";
import { createLogger } from "../src/logger";
import { hashPassword } from "../src/modules/auth/password";
import { MemoryTransport } from "../src/modules/email/transport";
import { MemorySmsTransport } from "../src/modules/sms/transport";
import { LocalGateway } from "../src/modules/payments/gateway";
import { createPushService, MemoryPushSender, type PushService } from "../src/modules/professionals/push";
import { User, type UserFields } from "../src/modules/users/user.model";

export const WEB_ORIGIN = "http://localhost:5174";

export interface TestContext {
  app: Express;
  email: MemoryTransport;
  /** SMS login codes "sent": `sms.latestTo(phone)`. */
  sms: MemorySmsTransport;
  /** Alerts "sent" to browsers; mark an endpoint in `pushes.gone` to simulate an expired one. */
  pushes: MemoryPushSender;
  push: PushService;
  /** The local payment gateway: pay(), signWebhook(), refunds. */
  gateway: LocalGateway;
  config: Config;
  close: () => Promise<void>;
}

/** A fresh app on its own database inside the shared in-memory replica set. */
export async function startTestApp(overrides: Record<string, string> = {}): Promise<TestContext> {
  const uri = new URL(inject("mongoUri"));
  uri.pathname = `/test_${randomUUID().slice(0, 8)}`;

  const config = loadConfig({
    NODE_ENV: "test",
    LOG_LEVEL: process.env.TEST_LOG_LEVEL ?? "silent",
    MONGODB_URI: uri.toString(),
    SESSION_SECRET: "test-session-secret-0123456789-abcdefghij",
    CSRF_SECRET: "test-csrf-secret-0123456789-abcdefghijklmn",
    WEB_ORIGINS: WEB_ORIGIN,
    WEB_URL: WEB_ORIGIN,
    EMAIL_TRANSPORT: "memory",
    PUSH_TRANSPORT: "memory",
    SMS_TRANSPORT: "memory",
    // Tests log the same people in many times from one IP; the limit tests switch this back on.
    LOGIN_RATE_LIMITS: "0",
    ...overrides,
  });

  await connectDb(config.MONGODB_URI);
  await ensureIndexes();
  const email = new MemoryTransport();
  const sms = new MemorySmsTransport();
  const logger = createLogger(config);
  const pushes = new MemoryPushSender();
  const push = createPushService({ config, sender: pushes, logger });
  const gateway = new LocalGateway("test-payment-secret");
  const app = createApp({ config, logger, email, sms, mongoClient: mongoose.connection.getClient(), push, gateway });
  smsOf.set(app, sms);

  return {
    app,
    email,
    sms,
    pushes,
    push,
    gateway,
    config,
    close: async () => {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    },
  };
}

/** A browser-like client: keeps cookies, sends the Origin header and the CSRF token. */
export class Client {
  readonly agent: TestAgent;
  csrfToken = "";

  constructor(app: Express) {
    this.agent = request.agent(app);
  }

  async session() {
    const res = await this.agent.get("/v1/session").set("Origin", WEB_ORIGIN);
    this.csrfToken = res.body.csrfToken as string;
    return res;
  }

  get(path: string) {
    return this.agent.get(path).set("Origin", WEB_ORIGIN);
  }

  async send(method: "post" | "put" | "patch" | "delete", path: string, body?: object) {
    if (!this.csrfToken) await this.session();
    return this.agent[method](path).set("Origin", WEB_ORIGIN).set("X-CSRF-Token", this.csrfToken).send(body);
  }

  post(path: string, body?: object) {
    return this.send("post", path, body);
  }
}

export const STRONG_PASSWORD = "lantern-orchid-91-river";

const smsOf = new WeakMap<Express, MemorySmsTransport>();

let phoneSequence = 0;
/** A mobile number no other test user has (each account needs its own, ADR-0020). */
export const uniquePhone = (): string => `98${String(Date.now() % 10_000).padStart(4, "0")}${String(++phoneSequence % 10_000).padStart(4, "0")}`;

/**
 * Creates a user directly in the database (admins and professionals have no public sign-up).
 * Only admins get a password: everyone else logs in with an SMS code.
 */
export async function createUser(fields: Partial<UserFields> & { password?: string } = {}) {
  const { password = STRONG_PASSWORD, ...rest } = fields;
  const role = rest.role ?? "customer";
  return User.create({
    role,
    name: "Test User",
    email: `user.${randomUUID().slice(0, 6)}@example.com`,
    phone: uniquePhone(),
    locale: "en",
    passwordHash: role === "admin" ? await hashPassword(password) : null,
    ...rest,
  });
}

/** The newest SMS login code the app sent to this number. */
export function lastCode(app: Express, phone: string): string {
  const code = smsOf.get(app)?.latestTo(phone);
  if (!code) throw new Error(`no SMS code sent to ${phone}`);
  return code;
}

/** Logs a customer or professional in as the web does: number → SMS code → signed in. */
export async function loginByPhone(app: Express, phone: string): Promise<Client> {
  const client = new Client(app);
  const sent = await client.post("/v1/auth/otp/send", { phone });
  if (sent.status !== 202) throw new Error(`code not sent: ${sent.status} ${JSON.stringify(sent.body)}`);
  const res = await client.post("/v1/auth/otp/verify", { phone, code: lastCode(app, phone) });
  if (res.status !== 200 || res.body.status !== "signed-in") throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return client;
}

/**
 * Logs a user in by their email: admins with Team login (email + password), everyone else
 * with their mobile number and an SMS code.
 */
export async function loginAs(app: Express, email: string | null, password = STRONG_PASSWORD): Promise<Client> {
  const user = email ? await User.findOne({ email }) : null;
  if (!user) throw new Error(`no user with email ${email}`);
  if (user.role !== "admin") return loginByPhone(app, user.phone);
  const client = new Client(app);
  const res = await client.post("/v1/auth/login", { email, password });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return client;
}
