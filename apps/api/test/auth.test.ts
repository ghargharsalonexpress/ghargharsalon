import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hashPassword } from "../src/modules/auth/password";
import { User } from "../src/modules/users/user.model";
import { Client, createUser, lastCode, loginAs, loginByPhone, STRONG_PASSWORD, startTestApp, type TestContext } from "./helpers";

let ctx: TestContext;
beforeAll(async () => {
  ctx = await startTestApp();
});
afterAll(() => ctx.close());

const cookieHoursLeft = (res: { headers: Record<string, unknown> }) => {
  const cookie = (res.headers["set-cookie"] as string[] | undefined)?.find((c) => c.startsWith("sid=")) ?? "";
  return (Date.parse(/Expires=([^;]+)/i.exec(cookie)?.[1] ?? "") - Date.now()) / 3_600_000;
};

describe("GET /v1/session", () => {
  it("returns a null user and a CSRF token for guests", async () => {
    const res = await new Client(ctx.app).session();
    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
    expect(res.body.csrfToken).toMatch(/^[\w-]+\.[\w-]+$/);
    expect(res.headers["cache-control"]).toBe("no-store");
  });
});

describe("Team login: admins keep email + password (ADR-0020)", () => {
  it("gives the same answer for a wrong password, an unknown email and a non-admin account", async () => {
    const admin = await createUser({ role: "admin" });
    // A customer from before mobile login may still have a password: it no longer opens anything.
    const customer = await createUser({ role: "customer" });
    await User.updateOne({ _id: customer._id }, { passwordHash: await hashPassword(STRONG_PASSWORD) });

    const answers = await Promise.all([
      new Client(ctx.app).post("/v1/auth/login", { email: admin.email, password: "not-the-password" }),
      new Client(ctx.app).post("/v1/auth/login", { email: "nobody@example.com", password: "not-the-password" }),
      new Client(ctx.app).post("/v1/auth/login", { email: customer.email, password: STRONG_PASSWORD }),
    ]);
    for (const res of answers) {
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    }
  });

  it("signs an admin in, never returns the password hash, and ends the session on logout", async () => {
    const admin = await createUser({ role: "admin", name: "Asha Admin" });
    const client = new Client(ctx.app);
    const res = await client.post("/v1/auth/login", { email: admin.email, password: STRONG_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ role: "admin", name: "Asha Admin", email: admin.email });
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
    expect((await client.get("/v1/me")).status).toBe(200);

    expect((await client.post("/v1/auth/logout")).status).toBe(204);
    const after = await client.get("/v1/me");
    expect(after.status).toBe(401);
    expect(after.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("gives admins a 12-hour session and customers 30 days", async () => {
    const admin = await createUser({ role: "admin" });
    const adminHours = cookieHoursLeft(await new Client(ctx.app).post("/v1/auth/login", { email: admin.email, password: STRONG_PASSWORD }));
    expect(adminHours).toBeGreaterThan(11.9);
    expect(adminHours).toBeLessThanOrEqual(12);

    const customer = await createUser();
    const client = new Client(ctx.app);
    await client.post("/v1/auth/otp/send", { phone: customer.phone });
    const signedIn = await client.post("/v1/auth/otp/verify", { phone: customer.phone, code: lastCode(ctx.app, customer.phone) });
    expect(cookieHoursLeft(signedIn)).toBeGreaterThan(24 * 29.9);
  });

  it("signs a person out on their next request once they are blocked", async () => {
    const user = await createUser();
    const client = await loginAs(ctx.app, user.email);
    expect((await client.get("/v1/me")).status).toBe(200);
    await User.updateOne({ _id: user._id }, { status: "blocked" });
    expect((await client.get("/v1/me")).status).toBe(401);
    expect((await client.session()).body.user).toBeNull();
  });
});

describe("Team login rate limit (plan C11: 5 per minute per IP and email)", () => {
  it("allows five failures, then answers 429 with Retry-After", async () => {
    const admin = await createUser({ role: "admin" });
    const client = new Client(ctx.app);
    for (let attempt = 1; attempt <= 5; attempt++) {
      const res = await client.post("/v1/auth/login", { email: admin.email, password: `wrong-password-${attempt}` });
      expect(res.status).toBe(401);
    }
    const limited = await client.post("/v1/auth/login", { email: admin.email, password: STRONG_PASSWORD });
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe("RATE_LIMITED");
    expect(limited.body.error.retryAfterSeconds).toBeGreaterThan(0);
    expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);

    // Another email from the same IP is not locked out.
    const other = await createUser({ role: "admin" });
    expect((await client.post("/v1/auth/login", { email: other.email, password: STRONG_PASSWORD })).status).toBe(200);
  });
});

describe("PATCH /v1/me", () => {
  it("adds or removes an email, but never changes the phone (the login)", async () => {
    const user = await createUser({ email: null });
    const me = await loginByPhone(ctx.app, user.phone);

    const added = await me.send("patch", "/v1/me", { email: " Neha@Example.com " });
    expect(added.status).toBe(200);
    expect(added.body.user.email).toBe("neha@example.com");

    const taken = await createUser({ email: "taken@example.com" });
    const clash = await me.send("patch", "/v1/me", { email: taken.email });
    expect(clash.status).toBe(409);
    expect(clash.body.error).toMatchObject({ code: "EMAIL_TAKEN", fields: { email: "validation.emailTaken" } });

    expect((await me.send("patch", "/v1/me", { email: "" })).body.user.email).toBeNull();
    const phone = await me.send("patch", "/v1/me", { phone: "9123456780" });
    expect(phone.status).toBe(400);
    expect(phone.body.error.fields.phone).toBe("validation.unknownField");
  });

  it("keeps a team member's email (it is their login)", async () => {
    const admin = await createUser({ role: "admin" });
    const client = await loginAs(ctx.app, admin.email);
    const res = await client.send("patch", "/v1/me", { email: "" });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.email).toBe("validation.required");
  });
});
