import { DEFAULT_SETTINGS } from "@brand/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuditLog } from "../src/modules/audit/audit.model";
import { SettingsHistory } from "../src/modules/settings/settings.service";
import { Client, createUser, loginAs, startTestApp, type TestContext } from "./helpers";

let ctx: TestContext;
beforeAll(async () => {
  ctx = await startTestApp();
});
afterAll(() => ctx.close());

describe("PATCH /v1/me", () => {
  it("saves the language to the profile (W18)", async () => {
    const user = await createUser();
    const client = await loginAs(ctx.app, user.email);
    const res = await client.send("patch", "/v1/me", { locale: "hi" });
    expect(res.status).toBe(200);
    expect(res.body.user.locale).toBe("hi");
    expect((await client.get("/v1/me")).body.user.locale).toBe("hi");
  });

  it("refuses an empty update and fields people can't change", async () => {
    const user = await createUser();
    const client = await loginAs(ctx.app, user.email);
    expect((await client.send("patch", "/v1/me", {})).status).toBe(400);
    const roleChange = await client.send("patch", "/v1/me", { role: "admin" });
    expect(roleChange.status).toBe(400);
    expect(roleChange.body.error.fields.role).toBe("validation.unknownField");
  });

  it("needs a session", async () => {
    const res = await new Client(ctx.app).send("patch", "/v1/me", { locale: "hi" });
    expect(res.status).toBe(401);
  });
});

describe("admin settings (plan A8, C12)", () => {
  it("is admin-only: guests get 401, customers and professionals 403", async () => {
    expect((await new Client(ctx.app).get("/v1/admin/settings")).status).toBe(401);
    const customer = await loginAs(ctx.app, (await createUser()).email);
    expect((await customer.get("/v1/admin/settings")).status).toBe(403);
    const pro = await loginAs(ctx.app, (await createUser({ role: "professional" })).email);
    expect((await pro.get("/v1/admin/settings")).status).toBe(403);
  });

  it("starts from the plan's defaults and saves a new version with history and audit", async () => {
    const admin = await loginAs(ctx.app, (await createUser({ role: "admin" })).email);
    const current = await admin.get("/v1/admin/settings");
    expect(current.status).toBe(200);
    expect(current.body.settings).toEqual(DEFAULT_SETTINGS);

    const settings = { ...DEFAULT_SETTINGS, matching: { ...DEFAULT_SETTINGS.matching, searchTimeoutSeconds: 150 } };
    const saved = await admin.send("put", "/v1/admin/settings", { version: current.body.version, settings });
    expect(saved.status).toBe(200);
    expect(saved.body.version).toBe(current.body.version + 1);
    expect(saved.body.settings.matching.searchTimeoutSeconds).toBe(150);

    expect(await SettingsHistory.countDocuments({ version: saved.body.version })).toBe(1);
    const audit = await AuditLog.findOne({ action: "settings.update" }).lean();
    expect(audit?.actorRole).toBe("admin");
    expect((audit?.after as typeof settings).matching.searchTimeoutSeconds).toBe(150);
  });

  it("refuses a stale version instead of overwriting someone else's change", async () => {
    const admin = await loginAs(ctx.app, (await createUser({ role: "admin" })).email);
    const { version } = (await admin.get("/v1/admin/settings")).body as { version: number };
    expect((await admin.send("put", "/v1/admin/settings", { version, settings: DEFAULT_SETTINGS })).status).toBe(200);
    const stale = await admin.send("put", "/v1/admin/settings", { version, settings: DEFAULT_SETTINGS });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe("VERSION_CONFLICT");
  });

  it("validates combinations, e.g. the accept window must be shorter than the search", async () => {
    const admin = await loginAs(ctx.app, (await createUser({ role: "admin" })).email);
    const { version } = (await admin.get("/v1/admin/settings")).body as { version: number };
    const settings = { ...DEFAULT_SETTINGS, matching: { ...DEFAULT_SETTINGS.matching, acceptWindowSeconds: 120, searchTimeoutSeconds: 60 } };
    const res = await admin.send("put", "/v1/admin/settings", { version, settings });
    expect(res.status).toBe(400);
    expect(res.body.error.fields["settings.matching.acceptWindowSeconds"]).toBe("validation.acceptWindowTooLong");
  });
});
