import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ClientError } from "../src/modules/system/clientErrors";
import { Client, createUser, loginAs, startTestApp, type TestContext } from "./helpers";

/**
 * Plan Phase 9 (security review): every protected endpoint refuses guests (401) and the wrong
 * roles (403), checked from a real browser-like session with a valid CSRF token, so the
 * refusal comes from authorisation and not from CSRF or validation.
 */

let ctx: TestContext;
let guest: Client;
let customer: Client;
let pro: Client;
let admin: Client;

const ID = "0123456789abcdef01234567";
type Method = "get" | "post" | "put" | "patch" | "delete";
type Role = "customer" | "professional" | "admin";

const ROUTES: Array<{ method: Method; path: string; allowed: Role[] }> = [
  // Customer
  { method: "get", path: "/v1/me/addresses", allowed: ["customer"] },
  { method: "post", path: "/v1/me/addresses", allowed: ["customer"] },
  { method: "post", path: "/v1/bookings", allowed: ["customer"] },
  { method: "get", path: "/v1/bookings", allowed: ["customer"] },
  { method: "get", path: `/v1/bookings/${ID}`, allowed: ["customer", "professional", "admin"] },
  { method: "post", path: `/v1/bookings/${ID}/payments/verify`, allowed: ["customer"] },
  { method: "post", path: `/v1/bookings/${ID}/payments/retry`, allowed: ["customer"] },
  { method: "get", path: `/v1/bookings/${ID}/cancel-preview`, allowed: ["customer"] },
  { method: "post", path: `/v1/bookings/${ID}/cancel`, allowed: ["customer"] },
  { method: "post", path: `/v1/bookings/${ID}/review`, allowed: ["customer"] },
  { method: "get", path: `/v1/bookings/${ID}/invoice`, allowed: ["customer", "admin"] },
  // Professional
  { method: "get", path: "/v1/pro/me", allowed: ["professional"] },
  { method: "post", path: "/v1/pro/presence", allowed: ["professional"] },
  { method: "post", path: "/v1/pro/heartbeat", allowed: ["professional"] },
  { method: "post", path: "/v1/pro/push-test", allowed: ["professional"] },
  { method: "get", path: "/v1/pro/offers", allowed: ["professional"] },
  { method: "get", path: `/v1/pro/offers/${ID}`, allowed: ["professional"] },
  { method: "post", path: `/v1/pro/offers/${ID}/accept`, allowed: ["professional"] },
  { method: "post", path: `/v1/pro/offers/${ID}/decline`, allowed: ["professional"] },
  { method: "get", path: "/v1/pro/jobs", allowed: ["professional"] },
  { method: "get", path: "/v1/pro/jobs/earnings", allowed: ["professional"] },
  { method: "get", path: `/v1/pro/jobs/${ID}`, allowed: ["professional"] },
  { method: "post", path: `/v1/pro/jobs/${ID}/arrived`, allowed: ["professional"] },
  { method: "post", path: `/v1/pro/jobs/${ID}/start`, allowed: ["professional"] },
  { method: "post", path: `/v1/pro/jobs/${ID}/complete`, allowed: ["professional"] },
  { method: "post", path: `/v1/pro/jobs/${ID}/call`, allowed: ["professional"] },
  { method: "post", path: `/v1/pro/jobs/${ID}/customer-unavailable`, allowed: ["professional"] },
  { method: "post", path: `/v1/pro/jobs/${ID}/cancel`, allowed: ["professional"] },
  { method: "post", path: `/v1/pro/jobs/${ID}/location`, allowed: ["professional"] },
  // Admin
  { method: "get", path: "/v1/admin/settings", allowed: ["admin"] },
  { method: "put", path: "/v1/admin/settings", allowed: ["admin"] },
  { method: "get", path: "/v1/admin/settings/history", allowed: ["admin"] },
  { method: "get", path: "/v1/admin/services", allowed: ["admin"] },
  { method: "post", path: "/v1/admin/services", allowed: ["admin"] },
  { method: "get", path: "/v1/admin/categories", allowed: ["admin"] },
  { method: "get", path: "/v1/admin/messages", allowed: ["admin"] },
  { method: "get", path: "/v1/admin/professionals", allowed: ["admin"] },
  { method: "post", path: "/v1/admin/professionals", allowed: ["admin"] },
  { method: "get", path: `/v1/admin/professionals/${ID}/performance`, allowed: ["admin"] },
  { method: "post", path: `/v1/admin/professionals/${ID}/payouts`, allowed: ["admin"] },
  { method: "get", path: "/v1/admin/dashboard", allowed: ["admin"] },
  { method: "get", path: "/v1/admin/alerts", allowed: ["admin"] },
  { method: "post", path: `/v1/admin/alerts/${ID}/resolve`, allowed: ["admin"] },
  { method: "get", path: "/v1/admin/live", allowed: ["admin"] },
  { method: "get", path: "/v1/admin/bookings", allowed: ["admin"] },
  { method: "get", path: "/v1/admin/bookings/export.csv", allowed: ["admin"] },
  { method: "get", path: `/v1/admin/bookings/${ID}`, allowed: ["admin"] },
  { method: "get", path: `/v1/admin/bookings/${ID}/eligible`, allowed: ["admin"] },
  { method: "post", path: `/v1/admin/bookings/${ID}/notes`, allowed: ["admin"] },
  { method: "post", path: `/v1/admin/bookings/${ID}/refund`, allowed: ["admin"] },
  { method: "post", path: `/v1/admin/bookings/${ID}/reassign`, allowed: ["admin"] },
  { method: "post", path: `/v1/admin/bookings/${ID}/unlock-code`, allowed: ["admin"] },
  { method: "post", path: `/v1/admin/bookings/${ID}/offer`, allowed: ["admin"] },
  { method: "post", path: `/v1/admin/bookings/${ID}/cancel`, allowed: ["admin"] },
  { method: "get", path: "/v1/admin/customers", allowed: ["admin"] },
  { method: "get", path: `/v1/admin/customers/${ID}`, allowed: ["admin"] },
  { method: "post", path: `/v1/admin/customers/${ID}/status`, allowed: ["admin"] },
  { method: "get", path: "/v1/admin/payments", allowed: ["admin"] },
  { method: "get", path: "/v1/admin/refunds", allowed: ["admin"] },
  { method: "post", path: `/v1/admin/refunds/${ID}/retry`, allowed: ["admin"] },
  { method: "get", path: "/v1/admin/reviews", allowed: ["admin"] },
  { method: "post", path: `/v1/admin/reviews/${ID}/visibility`, allowed: ["admin"] },
  { method: "get", path: "/v1/admin/audit", allowed: ["admin"] },
];

const call = (client: Client, method: Method, path: string) => (method === "get" ? client.get(path) : client.send(method, path, {}));

beforeAll(async () => {
  ctx = await startTestApp();
  guest = new Client(ctx.app);
  await guest.session();
  customer = await loginAs(ctx.app, (await createUser({ role: "customer" })).email);
  pro = await loginAs(ctx.app, (await createUser({ role: "professional" })).email);
  admin = await loginAs(ctx.app, (await createUser({ role: "admin" })).email);
});
afterAll(async () => {
  await ctx.close();
});

describe("authorisation on every protected endpoint (plan C11, Phase 9)", () => {
  it("refuses guests with 401", async () => {
    const wrong: string[] = [];
    for (const route of ROUTES) {
      const res = await call(guest, route.method, route.path);
      if (res.status !== 401) wrong.push(`${route.method.toUpperCase()} ${route.path} → ${res.status}`);
    }
    expect(wrong).toEqual([]);
  });

  it("refuses the wrong role with 403 and lets the right one past the role check", async () => {
    const clients: Record<Role, Client> = { customer, professional: pro, admin };
    const wrong: string[] = [];
    for (const route of ROUTES) {
      for (const role of ["customer", "professional", "admin"] as const) {
        const res = await call(clients[role], route.method, route.path);
        const allowed = route.allowed.includes(role);
        // Allowed roles may still get 400/404/409 (no such record, empty body); never 401/403.
        const ok = allowed ? res.status !== 401 && res.status !== 403 : res.status === 403;
        if (!ok) wrong.push(`${role} ${route.method.toUpperCase()} ${route.path} → ${res.status} ${JSON.stringify(res.body?.error?.code ?? "")}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it("refuses mutations without the CSRF token or from another website", async () => {
    const noToken = await customer.agent.post("/v1/me/addresses").set("Origin", "http://localhost:5174").send({});
    expect(noToken.status).toBe(403);
    expect(noToken.body.error.code).toBe("CSRF_FAILED");
    const otherSite = await customer.agent.post("/v1/me/addresses").set("Origin", "https://evil.example").set("X-CSRF-Token", customer.csrfToken).send({});
    expect(otherSite.status).toBe(403);
  });
});

describe("client error reports (plan C13)", () => {
  it("keeps a browser crash, refuses junk, and limits a crash loop", async () => {
    const ok = await guest.post("/v1/client-errors", { kind: "render", message: "Cannot read properties of undefined", url: "/bookings/abc", stack: "TypeError: …" });
    expect(ok.status).toBe(204);
    expect(await ClientError.findOne({ message: "Cannot read properties of undefined" }).lean()).toMatchObject({ kind: "render", url: "/bookings/abc", userId: null });
    expect((await guest.post("/v1/client-errors", { kind: "nonsense", message: "x", url: "/" })).status).toBe(400);
    let limited = 0;
    for (let index = 0; index < 25; index++) {
      const res = await guest.post("/v1/client-errors", { kind: "error", message: `loop ${index}`, url: "/" });
      if (res.status === 429) limited++;
    }
    expect(limited).toBeGreaterThan(0);
  });
});
