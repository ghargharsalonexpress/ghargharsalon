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
import { LocalGateway } from "../src/modules/payments/gateway";
import { createPushService, MemoryPushSender, type PushService } from "../src/modules/professionals/push";
import { User, type UserFields } from "../src/modules/users/user.model";

export const WEB_ORIGIN = "http://localhost:5174";

export interface TestContext {
  app: Express;
  email: MemoryTransport;
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
    ...overrides,
  });

  await connectDb(config.MONGODB_URI);
  await ensureIndexes();
  const email = new MemoryTransport();
  const logger = createLogger(config);
  const pushes = new MemoryPushSender();
  const push = createPushService({ config, sender: pushes, logger });
  const gateway = new LocalGateway("test-payment-secret");
  const app = createApp({ config, logger, email, mongoClient: mongoose.connection.getClient(), push, gateway });

  return {
    app,
    email,
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

export const signupBody = (overrides: Partial<Record<"name" | "phone" | "email" | "password" | "locale", string>> = {}) => ({
  name: "Neha Kapoor",
  phone: "9876543210",
  email: `neha.${randomUUID().slice(0, 6)}@example.com`,
  password: STRONG_PASSWORD,
  ...overrides,
});

/** Creates a user directly in the database (admins and professionals have no public sign-up). */
export async function createUser(fields: Partial<UserFields> & { password?: string } = {}) {
  const { password = STRONG_PASSWORD, ...rest } = fields;
  return User.create({
    role: "customer",
    name: "Test User",
    email: `user.${randomUUID().slice(0, 6)}@example.com`,
    phone: "9876500000",
    locale: "en",
    passwordHash: await hashPassword(password),
    ...rest,
  });
}

export async function loginAs(app: Express, email: string, password = STRONG_PASSWORD): Promise<Client> {
  const client = new Client(app);
  const res = await client.post("/v1/auth/login", { email, password });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return client;
}
