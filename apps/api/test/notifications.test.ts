import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { notify } from "../src/modules/notifications/feed";
import { Notification } from "../src/modules/notifications/feed.model";
import { raiseAlert } from "../src/modules/notifications/notifications";
import { type Client, createUser, loginAs, startTestApp, type TestContext } from "./helpers";

let ctx: TestContext;
let customer: Client;
let customerId: string;
let admin: Client;

beforeAll(async () => {
  ctx = await startTestApp();
  const customerUser = await createUser({ role: "customer", name: "Neha Kapoor" });
  customerId = customerUser.id;
  customer = await loginAs(ctx.app, customerUser.email);
  admin = await loginAs(ctx.app, (await createUser({ role: "admin" })).email);
});
afterAll(async () => {
  await ctx.close();
});

const clear = () => Notification.deleteMany({});

describe("the notification feed (plan C10)", () => {
  it("gives someone their own rows, newest first, with an unread count", async () => {
    await clear();
    await notify({ userId: customerId }, { kind: "payment_received", title: "Payment received", body: "₹660 paid.", url: "/bookings/a" });
    await notify({ userId: customerId }, { kind: "professional_arrived", title: "Your professional has arrived", body: "Share your code.", url: "/bookings/a" });

    const res = await customer.get("/v1/me/notifications");
    expect(res.status).toBe(200);
    expect(res.body.items.map((item: { kind: string }) => item.kind)).toEqual(["professional_arrived", "payment_received"]);
    expect(res.body.unread).toBe(2);
    // The link is what makes the bell useful: it has to come back intact.
    expect(res.body.items[0].url).toBe("/bookings/a");
  });

  it("never shows one person another person's notifications", async () => {
    await clear();
    const other = await createUser({ role: "customer" });
    await notify({ userId: other.id }, { kind: "booking_completed", title: "Service complete", body: "Done.", url: "/bookings/b" });

    const res = await customer.get("/v1/me/notifications");
    expect(res.body.items).toHaveLength(0);
    expect(res.body.unread).toBe(0);
  });

  it("marks one read, then the rest, and the badge follows", async () => {
    await clear();
    await notify({ userId: customerId }, { kind: "payment_received", title: "One", body: "", url: "/bookings/a" });
    await notify({ userId: customerId }, { kind: "service_started", title: "Two", body: "", url: "/bookings/a" });

    const listed = await customer.get("/v1/me/notifications");
    const first = listed.body.items[0].id;

    const one = await customer.post("/v1/me/notifications/read", { id: first });
    expect(one.body).toMatchObject({ read: 1, unread: 1 });

    const all = await customer.post("/v1/me/notifications/read", {});
    expect(all.body).toMatchObject({ read: 1, unread: 0 });

    expect((await customer.get("/v1/me/notifications/unread-count")).body.unread).toBe(0);
  });

  it("will not let someone mark another person's notification read", async () => {
    await clear();
    const other = await createUser({ role: "customer" });
    await notify({ userId: other.id }, { kind: "booking_completed", title: "Theirs", body: "", url: "/bookings/b" });
    const theirs = await Notification.findOne({ userId: other.id }).lean();

    const res = await customer.post("/v1/me/notifications/read", { id: String(theirs?._id) });
    expect(res.body.read).toBe(0);
    expect(await Notification.countDocuments({ readAt: null })).toBe(1);
  });

  it("shows the team's rows to an admin, and an alert puts one there", async () => {
    await clear();
    await raiseAlert("no_match", null, "BK-1001: nobody accepted.");

    const mine = await admin.get("/v1/me/notifications");
    expect(mine.body.items[0]).toMatchObject({ kind: "admin_alert", title: "No professional found", url: "/admin" });

    // A customer must never see the team's feed.
    expect((await customer.get("/v1/me/notifications")).body.items).toHaveLength(0);
  });

  it("pages backwards through a long feed", async () => {
    await clear();
    for (let index = 0; index < 5; index++) {
      await notify({ userId: customerId }, { kind: "payment_received", title: `#${index}`, body: "", url: "/bookings/a" });
    }

    const first = await customer.get("/v1/me/notifications?limit=2");
    expect(first.body.items).toHaveLength(2);
    expect(first.body.nextBefore).toBeTruthy();

    const second = await customer.get(`/v1/me/notifications?limit=2&before=${encodeURIComponent(String(first.body.nextBefore))}`);
    expect(second.body.items).toHaveLength(2);
    // No overlap between pages.
    const ids = new Set(first.body.items.map((item: { id: string }) => item.id));
    expect(second.body.items.some((item: { id: string }) => ids.has(item.id))).toBe(false);
  });

  it("is refused when signed out", async () => {
    expect((await request(ctx.app).get("/v1/me/notifications")).status).toBe(401);
  });
});
