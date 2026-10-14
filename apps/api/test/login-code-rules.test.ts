import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config";
import { LoginCode } from "../src/modules/auth/loginCode";
import { TwoFactorSmsTransport } from "../src/modules/sms/transport";
import { Client, startTestApp, type TestContext, uniquePhone, WEB_ORIGIN } from "./helpers";

/** Limits on SMS login codes (ADR-0020), with LOGIN_RATE_LIMITS on as in production. */
let ctx: TestContext;
beforeAll(async () => {
  ctx = await startTestApp({ LOGIN_RATE_LIMITS: "1" });
});
afterAll(() => ctx.close());

/** Moves the last send back in time, as if the person waited. */
const waited = (phone: string, seconds: number) => LoginCode.updateOne({ phone }, { $set: { lastSentAt: new Date(Date.now() - seconds * 1000) } });

describe("send limits per number", () => {
  it("makes people wait 30 seconds before asking again", async () => {
    const phone = uniquePhone();
    const client = new Client(ctx.app);
    expect((await client.post("/v1/auth/otp/send", { phone })).status).toBe(202);
    const again = await client.post("/v1/auth/otp/send", { phone });
    expect(again.status).toBe(429);
    expect(again.body.error.code).toBe("RATE_LIMITED");
    expect(again.body.error.retryAfterSeconds).toBeGreaterThan(0);
    expect(again.body.error.retryAfterSeconds).toBeLessThanOrEqual(30);

    await waited(phone, 31);
    expect((await client.post("/v1/auth/otp/send", { phone })).status).toBe(202);
  });

  it("sends at most 3 codes in 15 minutes", async () => {
    const phone = uniquePhone();
    const client = new Client(ctx.app);
    for (let send = 1; send <= 3; send++) {
      expect((await client.post("/v1/auth/otp/send", { phone })).status, `send ${send}`).toBe(202);
      await waited(phone, 31);
    }
    const fourth = await client.post("/v1/auth/otp/send", { phone });
    expect(fourth.status).toBe(429);
    expect(fourth.body.error.retryAfterSeconds).toBeGreaterThan(30);
  });
});

describe("send limit per IP (SMS pumping)", () => {
  it("allows 20 code requests an hour from one IP, to any numbers", async () => {
    const client = new Client(ctx.app);
    // New numbers never hit the per-number limits, so the first 429 here is the IP limit
    // (the tests above already used some of this IP's 20).
    const statuses: number[] = [];
    for (let i = 0; i < 22; i++) statuses.push((await client.post("/v1/auth/otp/send", { phone: uniquePhone() })).status);
    const firstLimited = statuses.indexOf(429);
    expect(firstLimited).toBeGreaterThan(0);
    expect(statuses.slice(0, firstLimited).every((status) => status === 202)).toBe(true);
    expect(statuses.slice(firstLimited).every((status) => status === 429)).toBe(true);
  });
});

describe("configuration", () => {
  const base = {
    MONGODB_URI: "mongodb://127.0.0.1:27017/x",
    SESSION_SECRET: "s".repeat(32),
    CSRF_SECRET: "c".repeat(32),
    WEB_URL: WEB_ORIGIN,
  };

  it("shows the code on screen only for local demos with the log transport", () => {
    expect(loadConfig({ ...base, SMS_TRANSPORT: "log", SMS_DEV_CODE: "1" }).smsDevCode).toBe(true);
    expect(loadConfig({ ...base, SMS_TRANSPORT: "log" }).smsDevCode).toBe(false);
    expect(loadConfig({ ...base, SMS_TRANSPORT: "log", SMS_DEV_CODE: "1", WEB_URL: "https://ghargharsalonexpress.com" }).smsDevCode).toBe(false);
    expect(loadConfig({ ...base, SMS_TRANSPORT: "memory", SMS_DEV_CODE: "1" }).smsDevCode).toBe(false);
    expect(loadConfig({ ...base, SMS_TRANSPORT: "2factor", TWOFACTOR_API_KEY: "k".repeat(20), SMS_DEV_CODE: "1" }).smsDevCode).toBe(false);
  });

  it("needs the 2Factor key, and refuses demo settings in production", () => {
    expect(() => loadConfig({ ...base, SMS_TRANSPORT: "2factor" })).toThrow(/TWOFACTOR_API_KEY/);
    expect(() => loadConfig({ ...base, NODE_ENV: "production" })).toThrow(/SMS_TRANSPORT must be '2factor'/);
    expect(() => loadConfig({ ...base, NODE_ENV: "production", SMS_DEV_CODE: "1" })).toThrow(/SMS_DEV_CODE must be off/);
    expect(() => loadConfig({ ...base, NODE_ENV: "production", LOGIN_RATE_LIMITS: "0" })).toThrow(/LOGIN_RATE_LIMITS must be on/);
  });
});

describe("2Factor.in", () => {
  const reply = (status: number, body: unknown) => async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  it("sends our code through the approved template", async () => {
    const urls: string[] = [];
    const sms = new TwoFactorSmsTransport("api-key-123", "GGS Login", async (url) => {
      urls.push(String(url));
      return reply(200, { Status: "Success", Details: "session-id" })();
    });
    await sms.sendLoginCode("9876543210", "042917");
    expect(urls).toEqual(["https://2factor.in/API/V1/api-key-123/SMS/919876543210/042917/GGS%20Login"]);
  });

  it("fails loudly when 2Factor refuses, without the key in the message", async () => {
    const refused = new TwoFactorSmsTransport("api-key-123", undefined, reply(200, { Status: "Error", Details: "Invalid Phone Number" }));
    await expect(refused.sendLoginCode("9876543210", "042917")).rejects.toThrow(/Invalid Phone Number/);
    await expect(refused.sendLoginCode("9876543210", "042917")).rejects.not.toThrow(/api-key-123/);
    const down = new TwoFactorSmsTransport("api-key-123", undefined, reply(503, {}));
    await expect(down.sendLoginCode("9876543210", "042917")).rejects.toThrow(/HTTP 503/);
  });
});
