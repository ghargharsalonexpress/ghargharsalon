import { randomUUID } from "node:crypto";
import { type AddressInput, type BookingDto, type CategoryInput, DEFAULT_SETTINGS, type QuoteDto, type ServiceInput, type Skill } from "@brand/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Quote } from "../src/modules/availability/availability.service";
import { Booking } from "../src/modules/bookings/booking.model";
import { Refund } from "../src/modules/payments/payment.model";
import { expireUnpaid, refundHandler } from "../src/modules/payments/payments.service";
import { Professional, toPoint } from "../src/modules/professionals/professional.model";
import { dispatchOutbox } from "../src/modules/system/outbox";
import { User } from "../src/modules/users/user.model";
import { createLogger } from "../src/logger";
import { type Client, createUser, loginAs, startTestApp, type TestContext, uniquePhone, WEB_ORIGIN } from "./helpers";
import request from "supertest";

let ctx: TestContext;
let admin: Client;
let customer: Client;
let proUserId: string;

const HOME = { lat: 28.4089, lng: 77.3178 }; // Faridabad, inside the default Delhi NCR area
const NEAR = { lat: 28.4120, lng: 77.3200 }; // ~400 m away
const MUMBAI = { lat: 19.076, lng: 72.8777 };

const category: CategoryInput = {
  slug: "salon-for-women",
  gender: "women",
  name: { en: "Salon for women", hi: "" },
  description: { en: "", hi: "" },
  filters: [{ slug: "facials", name: { en: "Facials", hi: "" } }],
  skill: "salon_women",
  image: null,
  order: 0,
  active: true,
};

const service: ServiceInput = {
  slug: "fruit-facial",
  gender: "women",
  categorySlugs: ["salon-for-women"],
  filterSlugs: ["facials"],
  name: { en: "Fruit facial", hi: "" },
  summary: { en: "", hi: "" },
  overview: [],
  thingsToKnow: [],
  aftercare: [],
  recommendedFor: [],
  products: [],
  faq: [],
  tiers: [{ id: "standard", label: { en: "Standard", hi: "" }, pricePaise: 64_900, compareAtPaise: null, durationMin: 45, sessions: 1 }],
  requiredSkills: ["salon_women"],
  images: [],
  active: true,
  order: 0,
};

const address = (overrides: Partial<AddressInput> = {}): AddressInput => ({
  label: "home",
  house: "Flat 302",
  building: "Green Towers",
  street: "Sector 15",
  landmark: "Near the market",
  city: "Faridabad",
  pincode: "121007",
  location: HOME,
  placeId: null,
  isDefault: false,
  ...overrides,
});

const LINES = [{ serviceSlug: "fruit-facial", tierId: "standard", quantity: 1, seenUnitPricePaise: 64_900 }];

async function onlinePro(skills: Skill[] = ["salon_women"], location = NEAR) {
  const user = await User.create({ role: "professional", name: "Priya Verma", email: `pro.${randomUUID().slice(0, 6)}@example.com`, phone: uniquePhone(), locale: "hi" });
  await Professional.create({
    userId: user._id,
    gender: "female",
    skills,
    baseArea: "Sector 15",
    travelRadiusKm: 5,
    photo: null,
    verificationNote: "",
    verification: { at: new Date(), by: user._id, byName: "Admin" },
    presence: { state: "available", since: new Date(), lastHeartbeatAt: new Date(), location: toPoint(location.lat, location.lng), locationAt: new Date(), accuracyM: 20, activeBookingId: null },
  });
  return String(user._id);
}

const quote = async (location = HOME) => (await customer.post("/v1/availability/quote", { location, lines: LINES, preference: "any" })).body as QuoteDto;

async function newBooking(addressId: string, key = randomUUID()) {
  const q = await quote();
  expect(q.available, JSON.stringify(q)).toBe(true);
  return customer.agent
    .post("/v1/bookings")
    .set("Origin", WEB_ORIGIN)
    .set("X-CSRF-Token", customer.csrfToken)
    .set("Idempotency-Key", key)
    .send({ quoteId: q.quoteId, addressId, preference: "any", lines: LINES });
}

async function payAndVerify(booking: BookingDto) {
  const payment = booking.payment;
  if (!payment) throw new Error("no payment");
  const paid = ctx.gateway.pay(payment.orderId, "success", payment.amountPaise);
  return customer.post(`/v1/bookings/${booking.id}/payments/verify`, { orderId: payment.orderId, paymentId: paid.paymentId, signature: paid.signature });
}

let homeId: string;

beforeAll(async () => {
  ctx = await startTestApp();
  admin = await loginAs(ctx.app, (await createUser({ role: "admin" })).email);
  expect((await admin.post("/v1/admin/categories", category)).status).toBe(201);
  expect((await admin.post("/v1/admin/services", service)).status).toBe(201);
  // Open all day, so the suite passes whatever the time in India.
  const current = await admin.get("/v1/admin/settings");
  const settings = { ...DEFAULT_SETTINGS, operations: { ...DEFAULT_SETTINGS.operations, serviceHours: { open: "00:00", close: "23:59" } } };
  expect((await admin.send("put", "/v1/admin/settings", { version: current.body.version, settings })).status).toBe(200);
  customer = await loginAs(ctx.app, (await createUser({ role: "customer" })).email);
  homeId = (await customer.post("/v1/me/addresses", address())).body.id;
  proUserId = await onlinePro();
});
afterAll(async () => {
  await ctx.close();
});

describe("addresses (W3)", () => {
  it("keeps one default and never shows another customer's address", async () => {
    const list = await customer.get("/v1/me/addresses");
    expect(list.body).toEqual([expect.objectContaining({ id: homeId, isDefault: true, location: HOME })]);
    const work = await customer.post("/v1/me/addresses", address({ label: "work", house: "Office 5", isDefault: true }));
    expect(work.status).toBe(201);
    const after = (await customer.get("/v1/me/addresses")).body as Array<{ id: string; isDefault: boolean }>;
    expect(after.filter((item) => item.isDefault).map((item) => item.id)).toEqual([work.body.id]);

    const stranger = await loginAs(ctx.app, (await createUser({ role: "customer" })).email);
    expect((await stranger.send("put", `/v1/me/addresses/${homeId}`, address())).status).toBe(404);
    expect((await customer.send("delete", `/v1/me/addresses/${work.body.id}`)).status).toBe(204);
    expect(((await customer.get("/v1/me/addresses")).body as Array<{ isDefault: boolean }>)[0]?.isDefault).toBe(true);
  });

  it("validates the PIN code and the pin", async () => {
    const bad = await customer.post("/v1/me/addresses", { ...address(), pincode: "12345", location: { lat: 200, lng: 0 } });
    expect(bad.status).toBe(400);
    expect(bad.body.error.fields).toMatchObject({ pincode: "validation.pincode" });
  });
});

describe("availability quote (plan C6)", () => {
  it("gives an arrival range when a matching professional is free nearby", async () => {
    const q = await quote();
    expect(q).toMatchObject({ available: true, reason: null });
    expect(q.etaMinutes?.max).toBe((q.etaMinutes?.min ?? 0) + 6);
  });

  it("says why when it can't serve: outside the area, nobody with the skill", async () => {
    expect(await quote(MUMBAI)).toMatchObject({ available: false, reason: "outside_area" });
    const makeup = { ...service, slug: "party-makeup", requiredSkills: ["makeup"] as ServiceInput["requiredSkills"] };
    expect((await admin.post("/v1/admin/services", makeup)).status).toBe(201);
    const res = await customer.post("/v1/availability/quote", { location: HOME, lines: [{ serviceSlug: "party-makeup", tierId: "standard", quantity: 1 }], preference: "any" });
    expect(res.body).toMatchObject({ available: false, reason: "skill_unavailable" });
    const male = await customer.post("/v1/availability/quote", { location: HOME, lines: LINES, preference: "male" });
    expect(male.body).toMatchObject({ available: false, reason: "none_free" });
  });
});

describe("booking and payment (W4)", () => {
  it("creates an unpaid booking once per Idempotency-Key, then payment starts the search", async () => {
    const key = randomUUID();
    const q = await quote();
    const body = { quoteId: q.quoteId, addressId: homeId, preference: "any", lines: LINES };
    const post = (payload: object) => customer.agent.post("/v1/bookings").set("Origin", WEB_ORIGIN).set("X-CSRF-Token", customer.csrfToken).set("Idempotency-Key", key).send(payload);
    const created = await post(body);
    expect(created.status).toBe(201);
    const booking = created.body as BookingDto;
    expect(booking).toMatchObject({ status: "awaiting_payment", number: expect.stringMatching(/^BK-\d{4,}$/) as string, payment: { provider: "fake", status: "created" } });
    expect(booking.pricing).toMatchObject({ itemsPaise: 64_900, platformFeePaise: 1_100, totalPaise: 66_000 });
    expect(booking.address).toMatchObject({ house: "Flat 302", location: HOME });

    // A double tap replays the first answer instead of creating a second booking...
    const replay = await post(body);
    expect(replay.status).toBe(201);
    expect(replay.body.id).toBe(booking.id);
    // ...and the same key with different details is refused.
    const other = await post({ ...body, note: "Different" });
    expect(other.body.error.code).toBe("IDEMPOTENCY_CONFLICT");

    const verified = await payAndVerify(booking);
    expect(verified.status).toBe(200);
    expect(verified.body).toMatchObject({ status: "searching", payment: { status: "captured" } });
    expect(verified.body.search.deadlineAt).toBeTruthy();

    // Verifying again is harmless.
    expect((await payAndVerify(booking)).body.status).toBe("searching");
  });

  it("lets the browser send the Idempotency-Key from the web origin (CORS preflight)", async () => {
    const preflight = await request(ctx.app)
      .options("/v1/bookings")
      .set("Origin", WEB_ORIGIN)
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type,idempotency-key,x-csrf-token");
    expect(preflight.status).toBe(204);
    expect(String(preflight.headers["access-control-allow-headers"]).toLowerCase()).toContain("idempotency-key");
  });

  it("refuses a forged signature and an expired quote", async () => {
    const booking = (await newBooking(homeId)).body as BookingDto;
    const forged = await customer.post(`/v1/bookings/${booking.id}/payments/verify`, { orderId: booking.payment?.orderId, paymentId: "pay_forged_123", signature: "0".repeat(64) });
    expect(forged.status).toBe(400);
    expect(forged.body.error.code).toBe("PAYMENT_VERIFICATION_FAILED");

    const q = await quote();
    await Quote.updateOne({ _id: q.quoteId }, { $set: { expiresAt: new Date(Date.now() - 1_000) } });
    const late = await customer.agent
      .post("/v1/bookings")
      .set("Origin", WEB_ORIGIN)
      .set("X-CSRF-Token", customer.csrfToken)
      .set("Idempotency-Key", randomUUID())
      .send({ quoteId: q.quoteId, addressId: homeId, preference: "any", lines: LINES });
    expect(late.body.error.code).toBe("QUOTE_EXPIRED");
  });

  it("refuses a changed price and a professional who just went busy", async () => {
    const q = await quote();
    const changed = await customer.agent
      .post("/v1/bookings")
      .set("Origin", WEB_ORIGIN)
      .set("X-CSRF-Token", customer.csrfToken)
      .set("Idempotency-Key", randomUUID())
      .send({ quoteId: q.quoteId, addressId: homeId, preference: "any", lines: [{ ...LINES[0], seenUnitPricePaise: 49_900 }] });
    expect(changed.body.error.code).toBe("PRICE_CHANGED");

    const fresh = await quote();
    await Professional.updateOne({ userId: proUserId }, { $set: { "presence.state": "offline" } });
    const busy = await customer.agent
      .post("/v1/bookings")
      .set("Origin", WEB_ORIGIN)
      .set("X-CSRF-Token", customer.csrfToken)
      .set("Idempotency-Key", randomUUID())
      .send({ quoteId: fresh.quoteId, addressId: homeId, preference: "any", lines: LINES });
    expect(busy.body.error.code).toBe("NO_PROFESSIONALS");
    await Professional.updateOne({ userId: proUserId }, { $set: { "presence.state": "available", "presence.lastHeartbeatAt": new Date(), "presence.locationAt": new Date() } });
  });

  it("expires unpaid bookings and refunds a payment that arrives too late", async () => {
    const booking = (await newBooking(homeId)).body as BookingDto;
    await Booking.updateOne({ _id: booking.id }, { $set: { paymentExpiresAt: new Date(Date.now() - 1_000) } });
    expect(await expireUnpaid()).toBeGreaterThanOrEqual(1);
    expect((await customer.get(`/v1/bookings/${booking.id}`)).body.status).toBe("expired");

    await payAndVerify(booking);
    const refund = await Refund.findOne({ bookingId: booking.id }).lean();
    expect(refund).toMatchObject({ amountPaise: 66_000, reason: "late_capture", status: "queued" });
    await dispatchOutbox({ refund: refundHandler(ctx.gateway, createLogger(ctx.config)), email: async () => undefined, push: async () => undefined }, createLogger(ctx.config));
    expect((await Refund.findById(refund?._id).lean())?.status).toBe("processed");
    expect((await customer.get(`/v1/bookings/${booking.id}`)).body.refund).toMatchObject({ amountPaise: 66_000, status: "processed" });
  });

  it("accepts a signed webhook once, in any order, and refuses unsigned ones", async () => {
    const booking = (await newBooking(homeId)).body as BookingDto;
    const orderId = booking.payment?.orderId ?? "";
    const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: `pay_hook_${randomUUID().slice(0, 8)}`, order_id: orderId, method: "upi", status: "captured" } } } });
    const send = (signature: string, eventId: string) =>
      request(ctx.app).post("/v1/webhooks/razorpay").set("Content-Type", "application/json").set("X-Razorpay-Signature", signature).set("X-Razorpay-Event-Id", eventId).send(body);

    expect((await send("bad", "evt_1")).status).toBe(403);
    const eventId = `evt_${randomUUID().slice(0, 8)}`;
    expect((await send(ctx.gateway.signWebhook(body), eventId)).status).toBe(200);
    expect((await customer.get(`/v1/bookings/${booking.id}`)).body.status).toBe("searching");
    expect((await send(ctx.gateway.signWebhook(body), eventId)).status).toBe(200);
  });

  it("shows a booking only to its customer and admins", async () => {
    const booking = (await newBooking(homeId)).body as BookingDto;
    const stranger = await loginAs(ctx.app, (await createUser({ role: "customer" })).email);
    expect((await stranger.get(`/v1/bookings/${booking.id}`)).status).toBe(404);
    expect((await admin.get(`/v1/bookings/${booking.id}`)).body.number).toBe(booking.number);
    const mine = await customer.get("/v1/bookings");
    expect((mine.body as Array<{ id: string }>).some((item) => item.id === booking.id)).toBe(true);
  });
});
