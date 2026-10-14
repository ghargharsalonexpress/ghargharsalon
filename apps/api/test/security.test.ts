import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client, signupBody, startTestApp, type TestContext, WEB_ORIGIN } from "./helpers";

let ctx: TestContext;
beforeAll(async () => {
  ctx = await startTestApp();
});
afterAll(() => ctx.close());

describe("CSRF and origin (plan C11)", () => {
  it("rejects a mutation without the CSRF token", async () => {
    const res = await request(ctx.app).post("/v1/auth/login").set("Origin", WEB_ORIGIN).send({ email: "a@b.co", password: "x" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("CSRF_FAILED");
  });

  it("rejects a mutation from another origin even with a valid token", async () => {
    const client = new Client(ctx.app);
    await client.session();
    const res = await client.agent.post("/v1/auth/login").set("Origin", "https://evil.example").set("X-CSRF-Token", client.csrfToken).send({});
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ORIGIN_NOT_ALLOWED");
  });

  it("rejects a forged token that matches its own forged cookie", async () => {
    const forged = "abc.def";
    const res = await request(ctx.app)
      .post("/v1/auth/login")
      .set("Origin", WEB_ORIGIN)
      .set("Cookie", `csrf=${forged}`)
      .set("X-CSRF-Token", forged)
      .send({ email: "a@b.co", password: "x" });
    expect(res.body.error.code).toBe("CSRF_FAILED");
  });

  it("issues a readable csrf cookie and an httpOnly, SameSite=Lax session cookie", async () => {
    const client = new Client(ctx.app);
    const session = await client.session();
    const csrfCookie = session.headers["set-cookie"]?.[0] ?? "";
    expect(csrfCookie).toMatch(/^csrf=/);
    expect(csrfCookie).not.toMatch(/HttpOnly/i);

    const signup = await client.post("/v1/auth/signup", signupBody());
    const sid = (signup.headers["set-cookie"] as unknown as string[]).find((cookie) => cookie.startsWith("sid="));
    expect(sid).toMatch(/HttpOnly/i);
    expect(sid).toMatch(/SameSite=Lax/i);
    expect(sid).not.toMatch(/Secure/i); // test env is plain http; production sets Secure
  });
});

describe("CORS", () => {
  it("allows the web origin with credentials", async () => {
    const res = await request(ctx.app)
      .options("/v1/auth/login")
      .set("Origin", WEB_ORIGIN)
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type,x-csrf-token");
    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe(WEB_ORIGIN);
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("gives other origins nothing", async () => {
    const res = await request(ctx.app).options("/v1/auth/login").set("Origin", "https://evil.example").set("Access-Control-Request-Method", "POST");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("headers and error shape (plan C12/C13)", () => {
  it("sends security headers and no x-powered-by", async () => {
    const res = await request(ctx.app).get("/health/live");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("returns the standard error body with a request id for unknown routes", async () => {
    const res = await request(ctx.app).get("/v1/nothing-here").set("X-Request-Id", "req-test-12345");
    expect(res.status).toBe(404);
    expect(res.headers["x-request-id"]).toBe("req-test-12345");
    expect(res.body).toEqual({ error: { code: "NOT_FOUND", messageKey: "errors.notFound", requestId: "req-test-12345" } });
  });

  it("turns malformed JSON into a validation error, not a 500", async () => {
    const client = new Client(ctx.app);
    await client.session();
    const res = await client.agent
      .post("/v1/auth/login")
      .set("Origin", WEB_ORIGIN)
      .set("X-CSRF-Token", client.csrfToken)
      .set("Content-Type", "application/json")
      .send('{"email": ');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("refuses bodies over 100 KB", async () => {
    const client = new Client(ctx.app);
    const res = await client.post("/v1/auth/login", { email: "a@b.co", password: "x".repeat(120_000) });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });
});

describe("health", () => {
  it("is live and ready when MongoDB answers", async () => {
    expect((await request(ctx.app).get("/health/live")).body).toEqual({ status: "ok" });
    const ready = await request(ctx.app).get("/health/ready");
    expect(ready.status).toBe(200);
    expect(ready.body.checks.mongo).toBe("ok");
  });
});
