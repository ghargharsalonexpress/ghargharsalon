import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuditLog } from "../src/modules/audit/audit.model";
import { LoginCode } from "../src/modules/auth/loginCode";
import { User } from "../src/modules/users/user.model";
import { Client, createUser, lastCode, startTestApp, type TestContext, uniquePhone } from "./helpers";

/** Mobile number + SMS code login for customers and professionals (ADR-0020). */
let ctx: TestContext;
beforeAll(async () => {
  ctx = await startTestApp();
});
afterAll(() => ctx.close());

/** Sends a code to the number from this client and returns the code that went out. */
async function sendCode(client: Client, phone: string): Promise<string> {
  const res = await client.post("/v1/auth/otp/send", { phone });
  expect(res.status).toBe(202);
  return lastCode(ctx.app, phone);
}

describe("sending the code", () => {
  it("sends a 6-digit code and gives the same answer for known and unknown numbers", async () => {
    const known = await createUser();
    const unknown = uniquePhone();
    const forKnown = await new Client(ctx.app).post("/v1/auth/otp/send", { phone: known.phone });
    const forUnknown = await new Client(ctx.app).post("/v1/auth/otp/send", { phone: unknown });

    expect(forKnown.status).toBe(202);
    expect(forUnknown.status).toBe(202);
    expect(forKnown.body).toEqual({ resendAfterSeconds: 30, expiresInSeconds: 300 });
    expect(forUnknown.body).toEqual(forKnown.body);
    expect(lastCode(ctx.app, known.phone)).toMatch(/^\d{6}$/);
    expect(lastCode(ctx.app, unknown)).toMatch(/^\d{6}$/);
  });

  it("keeps only a hash of the code", async () => {
    const phone = uniquePhone();
    const code = await sendCode(new Client(ctx.app), phone);
    const stored = await LoginCode.findOne({ phone }).lean();
    expect(stored?.codeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored?.codeHash).not.toContain(code);
  });

  it("checks the number and the code format", async () => {
    const badPhone = await new Client(ctx.app).post("/v1/auth/otp/send", { phone: "12345" });
    expect(badPhone.status).toBe(400);
    expect(badPhone.body.error.fields.phone).toBe("validation.phone");
    const badCode = await new Client(ctx.app).post("/v1/auth/otp/verify", { phone: uniquePhone(), code: "12" });
    expect(badCode.body.error.fields.code).toBe("validation.loginCode");
    const injection = await new Client(ctx.app).post("/v1/auth/otp/verify", { phone: { $ne: "" }, code: { $gt: "" } });
    expect(injection.status).toBe(400);
  });

  it("says so when the SMS company fails", async () => {
    const send = ctx.sms.sendLoginCode;
    ctx.sms.sendLoginCode = async () => {
      throw new Error("2Factor is down");
    };
    try {
      const res = await new Client(ctx.app).post("/v1/auth/otp/send", { phone: uniquePhone() });
      expect(res.status).toBe(502);
      expect(res.body.error.code).toBe("SMS_SEND_FAILED");
    } finally {
      ctx.sms.sendLoginCode = send;
    }
  });
});

describe("a known number", () => {
  it("signs a customer in with the right code, in a new session", async () => {
    const customer = await createUser({ name: "Neha Kapoor" });
    const client = new Client(ctx.app);
    const code = await sendCode(client, customer.phone);
    const res = await client.post("/v1/auth/otp/verify", { phone: customer.phone, code });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "signed-in", user: { role: "customer", name: "Neha Kapoor", phone: customer.phone } });
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
    expect((res.headers["set-cookie"] as unknown as string[]).some((cookie) => cookie.startsWith("sid="))).toBe(true);
    expect((await client.get("/v1/me")).body.user.id).toBe(String(customer._id));

    const saved = await User.findById(customer._id).lean();
    expect(saved?.lastLoginAt).toBeInstanceOf(Date);
    expect(saved?.phoneVerifiedAt).toBeInstanceOf(Date);
  });

  it("signs a professional in to their own account", async () => {
    const pro = await createUser({ role: "professional", locale: "hi" });
    const client = new Client(ctx.app);
    const res = await client.post("/v1/auth/otp/verify", { phone: pro.phone, code: await sendCode(client, pro.phone) });
    expect(res.body).toMatchObject({ status: "signed-in", user: { role: "professional", locale: "hi" } });
  });

  it("uses a code once, and only the newest code works", async () => {
    const customer = await createUser();
    const client = new Client(ctx.app);
    const first = await sendCode(client, customer.phone);
    const second = await sendCode(client, customer.phone);
    if (first !== second) {
      const old = await client.post("/v1/auth/otp/verify", { phone: customer.phone, code: first });
      expect(old.body.error.code).toBe("LOGIN_CODE_INVALID");
    }
    expect((await client.post("/v1/auth/otp/verify", { phone: customer.phone, code: second })).status).toBe(200);
    const again = await new Client(ctx.app).post("/v1/auth/otp/verify", { phone: customer.phone, code: second });
    expect(again.status).toBe(410);
    expect(again.body.error.code).toBe("LOGIN_CODE_EXPIRED");
  });

  it("stops a code after 5 minutes", async () => {
    const customer = await createUser();
    const client = new Client(ctx.app);
    const code = await sendCode(client, customer.phone);
    await LoginCode.updateOne({ phone: customer.phone }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    const res = await client.post("/v1/auth/otp/verify", { phone: customer.phone, code });
    expect(res.body.error.code).toBe("LOGIN_CODE_EXPIRED");
  });

  it("locks the code after five wrong tries, even for the right code, until a new one is sent", async () => {
    const customer = await createUser();
    const client = new Client(ctx.app);
    const code = await sendCode(client, customer.phone);
    const wrong = code === "000000" ? "111111" : "000000";
    for (let attempt = 1; attempt <= 4; attempt++) {
      const res = await client.post("/v1/auth/otp/verify", { phone: customer.phone, code: wrong });
      expect(res.status, `try ${attempt}`).toBe(400);
      expect(res.body.error).toMatchObject({ code: "LOGIN_CODE_INVALID", fields: { code: "validation.loginCodeWrong" } });
    }
    const fifth = await client.post("/v1/auth/otp/verify", { phone: customer.phone, code: wrong });
    expect(fifth.body.error.code).toBe("LOGIN_CODE_LOCKED");
    const right = await client.post("/v1/auth/otp/verify", { phone: customer.phone, code });
    expect(right.status).toBe(429);
    expect(right.body.error.code).toBe("LOGIN_CODE_LOCKED");

    const fresh = await sendCode(client, customer.phone);
    expect((await client.post("/v1/auth/otp/verify", { phone: customer.phone, code: fresh })).status).toBe(200);
  });

  it("can't be guessed in parallel: five looks at a code at most", async () => {
    const customer = await createUser();
    await sendCode(new Client(ctx.app), customer.phone);
    const guesses = await Promise.all(Array.from({ length: 12 }, (_, i) => new Client(ctx.app).post("/v1/auth/otp/verify", { phone: customer.phone, code: String(100_000 + i) })));
    const looked = guesses.filter((res) => res.body.error?.code === "LOGIN_CODE_INVALID" || res.status === 200).length;
    expect(looked).toBeLessThanOrEqual(5);
  });

  it("sends an admin's number to Team login, and only after the right code", async () => {
    const admin = await createUser({ role: "admin" });
    const client = new Client(ctx.app);
    const code = await sendCode(client, admin.phone);
    const wrong = await client.post("/v1/auth/otp/verify", { phone: admin.phone, code: code === "000000" ? "111111" : "000000" });
    expect(wrong.body.error.code).toBe("LOGIN_CODE_INVALID");
    const right = await client.post("/v1/auth/otp/verify", { phone: admin.phone, code });
    expect(right.status).toBe(403);
    expect(right.body.error.code).toBe("TEAM_LOGIN_REQUIRED");
    expect((await client.session()).body.user).toBeNull();
  });

  it("tells blocked customers and suspended professionals only after the right code", async () => {
    const blocked = await createUser({ status: "blocked" });
    const client = new Client(ctx.app);
    const code = await sendCode(client, blocked.phone);
    const wrong = await client.post("/v1/auth/otp/verify", { phone: blocked.phone, code: code === "000000" ? "111111" : "000000" });
    expect(wrong.body.error.code).toBe("LOGIN_CODE_INVALID");
    expect((await client.post("/v1/auth/otp/verify", { phone: blocked.phone, code })).body.error.code).toBe("ACCOUNT_BLOCKED");

    const suspended = await createUser({ role: "professional", status: "suspended" });
    const res = await client.post("/v1/auth/otp/verify", { phone: suspended.phone, code: await sendCode(client, suspended.phone) });
    expect(res.body.error.code).toBe("ACCOUNT_SUSPENDED");
  });
});

describe("a new number", () => {
  it("gets the name step, then becomes a customer signed in for 30 days", async () => {
    const phone = uniquePhone();
    const client = new Client(ctx.app);
    const verified = await client.post("/v1/auth/otp/verify", { phone, code: await sendCode(client, phone) });
    expect(verified.status).toBe(200);
    expect(verified.body).toEqual({ status: "new" });
    expect((await client.session()).body.user).toBeNull();

    const res = await client.post("/v1/auth/otp/complete", { name: "Neha Kapoor", email: "  Neha.K@Example.com ", locale: "hi" });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ role: "customer", name: "Neha Kapoor", email: "neha.k@example.com", phone, locale: "hi" });
    expect((await client.get("/v1/me")).status).toBe(200);
    expect(await AuditLog.exists({ action: "user.signup", "entity.id": res.body.user.id })).toBeTruthy();
  });

  it("doesn't need an email", async () => {
    const phone = uniquePhone();
    const client = new Client(ctx.app);
    await client.post("/v1/auth/otp/verify", { phone, code: await sendCode(client, phone) });
    // The web sends null for an empty optional email (its own parse of the form).
    const res = await client.post("/v1/auth/otp/complete", { name: "Ravi Sharma", email: null });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: "Ravi Sharma", email: null, locale: "en" });
  });

  it("can only be finished by the browser that entered the code, within 15 minutes", async () => {
    const phone = uniquePhone();
    const client = new Client(ctx.app);
    await client.post("/v1/auth/otp/verify", { phone, code: await sendCode(client, phone) });

    const stranger = await new Client(ctx.app).post("/v1/auth/otp/complete", { name: "Someone Else" });
    expect(stranger.status).toBe(410);
    expect(stranger.body.error.code).toBe("LOGIN_CODE_EXPIRED");
    expect(await User.exists({ phone })).toBeNull();

    // Without a code at all.
    expect((await new Client(ctx.app).post("/v1/auth/otp/complete", { name: "Nobody Here" })).body.error.code).toBe("LOGIN_CODE_EXPIRED");
  });

  it("never takes a role or a phone in the name step", async () => {
    const phone = uniquePhone();
    const client = new Client(ctx.app);
    await client.post("/v1/auth/otp/verify", { phone, code: await sendCode(client, phone) });
    for (const extra of [{ role: "admin" }, { phone: "9123456780" }]) {
      const res = await client.post("/v1/auth/otp/complete", { name: "Neha Kapoor", ...extra });
      expect(res.status).toBe(400);
      expect(Object.values(res.body.error.fields)).toContain("validation.unknownField");
    }
    const ok = await client.post("/v1/auth/otp/complete", { name: "Neha Kapoor" });
    expect(ok.body.user).toMatchObject({ role: "customer", phone });
  });

  it("says an email is taken, on the email field", async () => {
    await createUser({ email: "taken@example.com" });
    const phone = uniquePhone();
    const client = new Client(ctx.app);
    await client.post("/v1/auth/otp/verify", { phone, code: await sendCode(client, phone) });
    const res = await client.post("/v1/auth/otp/complete", { name: "Neha Kapoor", email: "TAKEN@example.com" });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: "EMAIL_TAKEN", fields: { email: "validation.emailTaken" } });
  });

  it("finishes once: a second name step for the same number is refused", async () => {
    const phone = uniquePhone();
    const client = new Client(ctx.app);
    await client.post("/v1/auth/otp/verify", { phone, code: await sendCode(client, phone) });
    expect((await client.post("/v1/auth/otp/complete", { name: "Neha Kapoor" })).status).toBe(201);
    // The new session no longer holds a pending number.
    expect((await client.post("/v1/auth/otp/complete", { name: "Neha Again" })).body.error.code).toBe("LOGIN_CODE_EXPIRED");
    expect(await User.countDocuments({ phone })).toBe(1);
  });
});
