import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { User } from "../src/modules/users/user.model";
import { Client, createUser, loginAs, signupBody, STRONG_PASSWORD, startTestApp, type TestContext } from "./helpers";

let ctx: TestContext;
beforeAll(async () => {
  ctx = await startTestApp();
});
afterAll(() => ctx.close());

describe("GET /v1/session", () => {
  it("returns a null user and a CSRF token for guests", async () => {
    const res = await new Client(ctx.app).session();
    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
    expect(res.body.csrfToken).toMatch(/^[\w-]+\.[\w-]+$/);
    expect(res.headers["cache-control"]).toBe("no-store");
  });
});

describe("sign up (W2)", () => {
  it("creates a customer, signs them in and never returns the password hash", async () => {
    const client = new Client(ctx.app);
    const body = signupBody({ email: "  Neha.K@Example.com ", locale: "hi" });
    const res = await client.post("/v1/auth/signup", body);

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ role: "customer", name: "Neha Kapoor", email: "neha.k@example.com", phone: "9876543210", locale: "hi" });
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");

    const me = await client.get("/v1/me");
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe("neha.k@example.com");
  });

  it("says the email is taken, on the email field", async () => {
    const email = "taken@example.com";
    await new Client(ctx.app).post("/v1/auth/signup", signupBody({ email }));
    const res = await new Client(ctx.app).post("/v1/auth/signup", signupBody({ email: "TAKEN@example.com" }));
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: "EMAIL_TAKEN", fields: { email: "validation.emailTaken" } });
  });

  it("refuses common and personal passwords", async () => {
    for (const password of ["Password@123", "qwertyuiop", "neha.kapoor2024", "98765432109"]) {
      const res = await new Client(ctx.app).post("/v1/auth/signup", signupBody({ password, email: "neha.kapoor@example.com" }));
      expect(res.status, password).toBe(400);
      expect(res.body.error.fields.password, password).toBe("validation.passwordWeak");
    }
  });

  it("refuses a role field (no privilege escalation through sign-up)", async () => {
    const res = await new Client(ctx.app).post("/v1/auth/signup", { ...signupBody(), role: "admin" });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.role).toBe("validation.unknownField");
  });

  it("reports every invalid field with a message key", async () => {
    const res = await new Client(ctx.app).post("/v1/auth/signup", { name: "", phone: "12345", email: "nope", password: "short" });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toEqual({
      name: "validation.required",
      phone: "validation.phone",
      email: "validation.email",
      password: "validation.passwordShort",
    });
  });
});

describe("log in and log out (W2)", () => {
  it("gives the same answer for a wrong password and an unknown email", async () => {
    const user = await createUser();
    const wrongPassword = await new Client(ctx.app).post("/v1/auth/login", { email: user.email, password: "not-the-password" });
    const unknownEmail = await new Client(ctx.app).post("/v1/auth/login", { email: "nobody@example.com", password: "not-the-password" });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(unknownEmail.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("rotates the session id on login and ends it on logout", async () => {
    const user = await createUser();
    const client = await loginAs(ctx.app, user.email);
    expect((await client.get("/v1/me")).status).toBe(200);

    const logout = await client.post("/v1/auth/logout");
    expect(logout.status).toBe(204);
    const after = await client.get("/v1/me");
    expect(after.status).toBe(401);
    expect(after.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("gives admins a 12-hour session and customers 30 days", async () => {
    const hoursLeft = async (role: "admin" | "customer") => {
      const user = await createUser({ role });
      const res = await new Client(ctx.app).post("/v1/auth/login", { email: user.email, password: STRONG_PASSWORD });
      const cookie = (res.headers["set-cookie"] as unknown as string[]).find((c) => c.startsWith("sid=")) ?? "";
      return (Date.parse(/Expires=([^;]+)/i.exec(cookie)?.[1] ?? "") - Date.now()) / 3_600_000;
    };
    const admin = await hoursLeft("admin");
    expect(admin).toBeGreaterThan(11.9);
    expect(admin).toBeLessThanOrEqual(12);
    expect(await hoursLeft("customer")).toBeGreaterThan(24 * 29.9);
  });

  it("tells blocked and suspended people only after the right password", async () => {
    const blocked = await createUser({ status: "blocked" });
    const wrong = await new Client(ctx.app).post("/v1/auth/login", { email: blocked.email, password: "wrong-password-here" });
    expect(wrong.body.error.code).toBe("INVALID_CREDENTIALS");
    const right = await new Client(ctx.app).post("/v1/auth/login", { email: blocked.email, password: STRONG_PASSWORD });
    expect(right.status).toBe(403);
    expect(right.body.error.code).toBe("ACCOUNT_BLOCKED");

    const suspended = await createUser({ role: "professional", status: "suspended" });
    const res = await new Client(ctx.app).post("/v1/auth/login", { email: suspended.email, password: STRONG_PASSWORD });
    expect(res.body.error.code).toBe("ACCOUNT_SUSPENDED");
  });

  it("signs a person out on their next request once they are blocked", async () => {
    const user = await createUser();
    const client = await loginAs(ctx.app, user.email);
    await User.updateOne({ _id: user._id }, { status: "blocked" });
    expect((await client.get("/v1/me")).status).toBe(401);
    expect((await client.session()).body.user).toBeNull();
  });

  it("refuses a professional without a password (they use their set-password link)", async () => {
    const pro = await createUser({ role: "professional" });
    await User.updateOne({ _id: pro._id }, { passwordHash: null });
    const res = await new Client(ctx.app).post("/v1/auth/login", { email: pro.email, password: STRONG_PASSWORD });
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });
});

describe("login rate limit (plan C11: 5 per minute per IP and email)", () => {
  it("allows five failures, then answers 429 with Retry-After", async () => {
    const user = await createUser();
    const client = new Client(ctx.app);
    for (let attempt = 1; attempt <= 5; attempt++) {
      const res = await client.post("/v1/auth/login", { email: user.email, password: `wrong-password-${attempt}` });
      expect(res.status).toBe(401);
    }
    const limited = await client.post("/v1/auth/login", { email: user.email, password: STRONG_PASSWORD });
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe("RATE_LIMITED");
    expect(limited.body.error.retryAfterSeconds).toBeGreaterThan(0);
    expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);

    // Another email from the same IP is not locked out.
    const other = await createUser();
    expect((await client.post("/v1/auth/login", { email: other.email, password: STRONG_PASSWORD })).status).toBe(200);
  });
});
