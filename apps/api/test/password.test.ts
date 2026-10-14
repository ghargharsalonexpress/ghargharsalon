import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuditLog } from "../src/modules/audit/audit.model";
import { AuthToken } from "../src/modules/auth/token.model";
import { Client, createUser, loginAs, STRONG_PASSWORD, startTestApp, type TestContext } from "./helpers";

let ctx: TestContext;
beforeAll(async () => {
  ctx = await startTestApp();
});
afterAll(() => ctx.close());

const tokenFrom = (url?: string) => new URL(url ?? "http://x").searchParams.get("token") ?? "";

/** Only team accounts have a password (ADR-0020): customers and professionals use SMS codes. */
const teamMember = (fields: Parameters<typeof createUser>[0] = {}) => createUser({ role: "admin", ...fields });

async function requestReset(email: string | null) {
  if (!email) throw new Error("team members always have an email");
  const res = await new Client(ctx.app).post("/v1/auth/password/forgot", { email });
  expect(res.status).toBe(202);
  const message = ctx.email.latestTo(email);
  const url = /https?:\/\/\S+reset-password\?token=[\w-]+/.exec(message?.text ?? "")?.[0];
  return { message, url, token: tokenFrom(url) };
}

describe("forgot password (Team login)", () => {
  it("answers the same for unknown emails and non-team accounts, and sends nothing", async () => {
    const customer = await createUser({ role: "customer" });
    const before = ctx.email.sent.length;
    for (const email of ["ghost@example.com", customer.email]) {
      const res = await new Client(ctx.app).post("/v1/auth/password/forgot", { email });
      expect(res.status).toBe(202);
      expect(res.body).toEqual({});
    }
    expect(ctx.email.sent.length).toBe(before);
  });

  it("emails a 30-minute link in the person's language", async () => {
    const user = await teamMember({ locale: "hi", name: "Priya Verma" });
    const { message, url, token } = await requestReset(user.email);
    expect(message?.tag).toBe("password-reset");
    expect(message?.subject).toContain("पासवर्ड");
    expect(message?.html).toContain('lang="hi"');
    expect(url).toContain("http://localhost:5174/reset-password?token=");
    expect(token).toHaveLength(43);

    const stored = await AuthToken.findOne({ userId: user._id });
    expect(stored?.tokenHash).not.toBe(token); // only the hash is stored
    const minutes = ((stored?.expiresAt.getTime() ?? 0) - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(29);
    expect(minutes).toBeLessThanOrEqual(30);
  });

  it("limits requests to 3 per hour per email", async () => {
    const user = await teamMember();
    const client = new Client(ctx.app);
    for (let i = 0; i < 3; i++) expect((await client.post("/v1/auth/password/forgot", { email: user.email })).status).toBe(202);
    const limited = await client.post("/v1/auth/password/forgot", { email: user.email });
    expect(limited.status).toBe(429);
  });
});

describe("reset password (Team login)", () => {
  it("checks the link first, keeps it when the new password is weak, then resets and signs in", async () => {
    const user = await teamMember();
    const { token } = await requestReset(user.email);

    const check = await new Client(ctx.app).post("/v1/auth/password/check", { token });
    expect(check.status).toBe(200);
    expect(check.body).toEqual({ type: "reset_password" });

    const weak = await new Client(ctx.app).post("/v1/auth/password/reset", { token, password: "password123" });
    expect(weak.status).toBe(400);
    expect(weak.body.error.fields.password).toBe("validation.passwordWeak");

    const client = new Client(ctx.app);
    const reset = await client.post("/v1/auth/password/reset", { token, password: "new-harbour-lamp-77" });
    expect(reset.status).toBe(200);
    expect(reset.body.user.email).toBe(user.email);
    expect((await client.get("/v1/me")).status).toBe(200);

    expect((await new Client(ctx.app).post("/v1/auth/login", { email: user.email, password: STRONG_PASSWORD })).status).toBe(401);
    expect((await new Client(ctx.app).post("/v1/auth/login", { email: user.email, password: "new-harbour-lamp-77" })).status).toBe(200);

    const reused = await new Client(ctx.app).post("/v1/auth/password/reset", { token, password: "another-long-pass-88" });
    expect(reused.status).toBe(410);
    expect(reused.body.error.code).toBe("TOKEN_USED");

    expect(await AuditLog.countDocuments({ action: "user.password_reset", "entity.id": user.id })).toBe(1);
  });

  it("signs out every other session of that person", async () => {
    const user = await teamMember();
    const elsewhere = await loginAs(ctx.app, user.email);
    const { token } = await requestReset(user.email);
    await new Client(ctx.app).post("/v1/auth/password/reset", { token, password: "fresh-garden-path-42" });
    expect((await elsewhere.get("/v1/me")).status).toBe(401);
  });

  it("says when a link has expired, and only the newest link works", async () => {
    const user = await teamMember();
    const first = await requestReset(user.email);
    const second = await requestReset(user.email);

    const old = await new Client(ctx.app).post("/v1/auth/password/check", { token: first.token });
    expect(old.status).toBe(400);
    expect(old.body.error.code).toBe("TOKEN_INVALID");

    await AuthToken.updateOne({ userId: user._id }, { expiresAt: new Date(Date.now() - 1000) });
    const expired = await new Client(ctx.app).post("/v1/auth/password/check", { token: second.token });
    expect(expired.status).toBe(410);
    expect(expired.body.error.code).toBe("TOKEN_EXPIRED");
  });

  it("rejects malformed tokens before touching the database", async () => {
    const res = await new Client(ctx.app).post("/v1/auth/password/check", { token: "short" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
