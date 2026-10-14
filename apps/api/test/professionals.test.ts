import { randomUUID } from "node:crypto";
import type { ProfessionalDto, ProfessionalInput } from "@brand/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Professional } from "../src/modules/professionals/professional.model";
import { sweepPresence } from "../src/modules/professionals/professionals.service";
import { Client, createUser, lastCode, loginAs, loginByPhone, startTestApp, type TestContext, uniquePhone } from "./helpers";

let ctx: TestContext;
let admin: Client;

const input = (overrides: Partial<ProfessionalInput> = {}): ProfessionalInput => ({
  name: "Sunita Devi",
  email: `sunita.${randomUUID().slice(0, 6)}@example.com`,
  phone: uniquePhone(),
  gender: "female",
  skills: ["salon_women", "makeup"],
  baseArea: "Sector 15, Faridabad",
  travelRadiusKm: 5,
  verified: false,
  verificationNote: "",
  photo: null,
  locale: "hi",
  ...overrides,
});

const FIX = { lat: 28.4089, lng: 77.3178, accuracy: 25 };
const SUBSCRIPTION = (endpoint = `https://push.example.com/${randomUUID()}`) => ({ endpoint, expirationTime: null, keys: { p256dh: "BOrlb0pKXsmL5H6CpGW0Qn4UZ9z2lQ", auth: "pq8d0tRkLdQ2bJ5w" } });

/** Creates a professional through the admin API, then they log in with their number and an SMS code. */
async function professional(overrides: Partial<ProfessionalInput> = {}): Promise<{ dto: ProfessionalDto; client: Client }> {
  const res = await admin.post("/v1/admin/professionals", input(overrides));
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  const dto = res.body as ProfessionalDto;
  return { dto, client: await loginByPhone(ctx.app, dto.phone) };
}

beforeAll(async () => {
  ctx = await startTestApp();
  admin = await loginAs(ctx.app, (await createUser({ role: "admin", name: "Asha Admin" })).email);
});
afterAll(async () => {
  await ctx.close();
});

describe("admin: professionals (W11, W15)", () => {
  it("creates the account and profile without sending anything, and lists them", async () => {
    const res = await admin.post("/v1/admin/professionals", input({ email: "sunita.devi@example.com" }));
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "Sunita Devi", lastLoginAt: null, verifiedAt: null, presence: { state: "offline" }, devices: 0, version: 1 });
    // No set-password email any more: they log in with their mobile number (ADR-0020).
    expect(ctx.email.latestTo("sunita.devi@example.com")).toBeUndefined();

    const list = await admin.get("/v1/admin/professionals");
    expect(list.body).toEqual(expect.arrayContaining([expect.objectContaining({ email: "sunita.devi@example.com", status: "active", lastLoginAt: null })]));

    const sameEmail = await admin.post("/v1/admin/professionals", input({ email: "sunita.devi@example.com" }));
    expect(sameEmail.status).toBe(409);
    expect(sameEmail.body.error).toMatchObject({ code: "EMAIL_TAKEN", fields: { email: "validation.emailTaken" } });
    const sameNumber = await admin.post("/v1/admin/professionals", input({ phone: res.body.phone }));
    expect(sameNumber.status).toBe(409);
    expect(sameNumber.body.error).toMatchObject({ code: "PHONE_TAKEN", fields: { phone: "validation.phoneTaken" } });
  });

  it("needs no email, and shows when the professional first logs in", async () => {
    const res = await admin.post("/v1/admin/professionals", input({ email: "" }));
    expect(res.status).toBe(201);
    expect(res.body.email).toBeNull();
    // The admin form sends what its own parse produced: null for an empty email.
    const fromForm = await admin.post("/v1/admin/professionals", input({ email: null }));
    expect(fromForm.status, JSON.stringify(fromForm.body)).toBe(201);

    await loginByPhone(ctx.app, res.body.phone);
    const after = await admin.get(`/v1/admin/professionals/${res.body.id}`);
    expect(after.body.lastLoginAt).toBeTruthy();
  });

  it("verifies with a stamp of who and when, and refuses a stale version", async () => {
    const { dto } = await professional();
    const verified = await admin.send("put", `/v1/admin/professionals/${dto.id}`, { version: 1, professional: input({ email: dto.email ?? "", phone: dto.phone, verified: true, verificationNote: "Aadhaar and PAN checked" }) });
    expect(verified.status).toBe(200);
    expect(verified.body).toMatchObject({ verifiedBy: "Asha Admin", verificationNote: "Aadhaar and PAN checked", version: 2 });
    expect(verified.body.verifiedAt).toBeTruthy();

    const stale = await admin.send("put", `/v1/admin/professionals/${dto.id}`, { version: 1, professional: input({ email: dto.email ?? "", phone: dto.phone, verified: true }) });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe("VERSION_CONFLICT");
  });

  it("is admin-only, and validates every field", async () => {
    const customer = await loginAs(ctx.app, (await createUser()).email);
    expect((await customer.get("/v1/admin/professionals")).status).toBe(403);
    const bad = await admin.post("/v1/admin/professionals", { ...input(), skills: [], travelRadiusKm: 99, phone: "123" });
    expect(bad.status).toBe(400);
    expect(Object.keys(bad.body.error.fields as object)).toEqual(expect.arrayContaining(["skills", "travelRadiusKm", "phone"]));
  });
});

describe("professional panel: presence (W12)", () => {
  it("can't go online before verification, nor without a location", async () => {
    const { client } = await professional();
    const early = await client.post("/v1/pro/presence", { online: true, location: FIX });
    expect(early.status).toBe(403);
    expect(early.body.error.code).toBe("PRO_NOT_VERIFIED");
  });

  it("goes online, beats, turns stale when silent, then offline with a notification", async () => {
    const { dto, client } = await professional({ verified: true });
    const endpoint = `https://push.example.com/${randomUUID()}`;
    expect((await client.post("/v1/pro/push-subscriptions", SUBSCRIPTION(endpoint))).body).toEqual({ devices: 1 });

    const missing = await client.post("/v1/pro/presence", { online: true });
    expect(missing.status).toBe(400);
    expect(missing.body.error.fields).toEqual({ location: "validation.required" });

    const online = await client.post("/v1/pro/presence", { online: true, location: FIX });
    expect(online.body.state).toBe("available");
    const profile = await Professional.findOne({ userId: dto.id }).lean();
    expect(profile?.presence.location?.coordinates).toEqual([FIX.lng, FIX.lat]);

    // Silent for two minutes: stale (left out of matching), then six: offline.
    await Professional.updateOne({ userId: dto.id }, { $set: { "presence.lastHeartbeatAt": new Date(Date.now() - 2 * 60_000) } });
    expect((await client.get("/v1/pro/me")).body.presence.state).toBe("stale");
    expect(await sweepPresence({ now: new Date(), push: ctx.push })).toMatchObject({ stale: expect.any(Number) as number });
    expect((await Professional.findOne({ userId: dto.id }).lean())?.presence.state).toBe("stale");

    // A heartbeat brings a stale professional back.
    expect((await client.post("/v1/pro/heartbeat", { location: FIX })).body.state).toBe("available");

    await Professional.updateOne({ userId: dto.id }, { $set: { "presence.state": "stale", "presence.lastHeartbeatAt": new Date(Date.now() - 6 * 60_000) } });
    await sweepPresence({ now: new Date(), push: ctx.push });
    expect((await client.get("/v1/pro/me")).body.presence.state).toBe("offline");
    expect(ctx.pushes.to(endpoint).map((payload) => payload.kind)).toContain("presence-offline");

    // Offline stays offline until they tap Online again.
    expect((await client.post("/v1/pro/heartbeat", {})).body.state).toBe("offline");
  });

  it("refuses to go offline or be suspended during a job", async () => {
    const { dto, client } = await professional({ verified: true });
    await client.post("/v1/pro/presence", { online: true, location: FIX });
    await Professional.updateOne({ userId: dto.id }, { $set: { "presence.state": "busy", "presence.activeBookingId": dto.id } });
    expect((await client.post("/v1/pro/presence", { online: false })).body.error.code).toBe("PRO_BUSY");
    expect((await admin.post(`/v1/admin/professionals/${dto.id}/status`, { status: "suspended", reason: "test" })).body.error.code).toBe("PRO_BUSY");
  });
});

describe("professional panel: alerts (plan C10)", () => {
  it("sends a test alert to every device in the professional's language and drops expired ones", async () => {
    const { client } = await professional({ verified: true, locale: "hi" });
    const phone = `https://push.example.com/${randomUUID()}`;
    const oldPhone = `https://push.example.com/${randomUUID()}`;
    await client.post("/v1/pro/push-subscriptions", SUBSCRIPTION(phone));
    expect((await client.post("/v1/pro/push-subscriptions", SUBSCRIPTION(oldPhone))).body).toEqual({ devices: 2 });
    ctx.pushes.gone.add(oldPhone);

    const res = await client.post("/v1/pro/push-test");
    expect(res.body).toEqual({ sent: 1, removed: 1, failed: 0 });
    expect(ctx.pushes.to(phone).at(-1)).toMatchObject({ kind: "test", title: "आपके फ़ोन पर अलर्ट आ रहे हैं", url: "/pro?alert=test" });
    expect((await client.get("/v1/pro/me")).body.devices).toBe(1);

    expect((await client.send("delete", "/v1/pro/push-subscriptions", { endpoint: phone })).body).toEqual({ devices: 0 });
  });

  it("only accepts https push endpoints", async () => {
    const { client } = await professional();
    const res = await client.post("/v1/pro/push-subscriptions", SUBSCRIPTION("http://insecure.example.com/x"));
    expect(res.status).toBe(400);
  });
});

describe("suspension (W15)", () => {
  it("signs the professional out everywhere, takes them offline and blocks login", async () => {
    const { dto, client } = await professional({ verified: true });
    await client.post("/v1/pro/presence", { online: true, location: FIX });

    const res = await admin.post(`/v1/admin/professionals/${dto.id}/status`, { status: "suspended", reason: "Repeated no-shows" });
    expect(res.body).toMatchObject({ status: "suspended", presence: { state: "offline" } });
    expect((await client.get("/v1/pro/me")).status).toBe(401);

    const login = new Client(ctx.app);
    await login.post("/v1/auth/otp/send", { phone: dto.phone });
    const refused = await login.post("/v1/auth/otp/verify", { phone: dto.phone, code: lastCode(ctx.app, dto.phone) });
    expect(refused.body.error.code).toBe("ACCOUNT_SUSPENDED");

    expect((await admin.post(`/v1/admin/professionals/${dto.id}/status`, { status: "active", reason: "" })).body.status).toBe("active");
  });

  it("a customer can't use the professional panel", async () => {
    const customer = await loginAs(ctx.app, (await createUser()).email);
    expect((await customer.get("/v1/pro/me")).status).toBe(403);
  });
});
