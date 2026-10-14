import { randomUUID } from "node:crypto";
import type { AdminBookingDetailDto, AdminDashboardDto, AdminLiveDto, BookingDto, CategoryInput, Paged, AdminBookingRow, ServiceInput } from "@brand/shared";
import { DEFAULT_SETTINGS } from "@brand/shared";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hashPassword } from "../src/modules/auth/password";
import { Booking } from "../src/modules/bookings/booking.model";
import { Offer } from "../src/modules/matching/offer.model";
import { Alert } from "../src/modules/notifications/notifications";
import { Refund } from "../src/modules/payments/payment.model";
import { refundHandler } from "../src/modules/payments/payments.service";
import { Professional, toPoint } from "../src/modules/professionals/professional.model";
import { dispatchOutbox } from "../src/modules/system/outbox";
import { User } from "../src/modules/users/user.model";
import { createLogger } from "../src/logger";
import { type Client, createUser, loginAs, STRONG_PASSWORD, startTestApp, type TestContext, WEB_ORIGIN } from "./helpers";

/** Plan Phase 8 (W14–W16): the operations console's API. */

let ctx: TestContext;
let admin: Client;
let customer: Client;
let customerId: string;
let pro: Client;
let proId: string;
let addressId: string;

const HOME = { lat: 28.4089, lng: 77.3178 };
const NEAR = { lat: 28.41, lng: 77.318 };
const LINES = [{ serviceSlug: "fruit-facial", tierId: "standard", quantity: 1, seenUnitPricePaise: 64_900 }];

const category: CategoryInput = { slug: "salon-for-women", gender: "women", name: { en: "Salon for women", hi: "" }, description: { en: "", hi: "" }, filters: [], skill: "salon_women", image: null, order: 0, active: true };
const service: ServiceInput = {
  slug: "fruit-facial",
  gender: "women",
  categorySlugs: ["salon-for-women"],
  filterSlugs: [],
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

const flush = () => dispatchOutbox({ refund: refundHandler(ctx.gateway, createLogger(ctx.config)), email: async () => undefined, push: async () => undefined }, createLogger(ctx.config), 1000);

async function freePro() {
  await Professional.updateOne({ userId: proId }, { $set: { "presence.state": "available", "presence.activeBookingId": null, "presence.lastHeartbeatAt": new Date() } });
}

/** A paid booking, searching. */
async function paidBooking(): Promise<BookingDto> {
  await freePro();
  const quote = await customer.post("/v1/availability/quote", { location: HOME, lines: LINES, preference: "any" });
  const created = await customer.agent
    .post("/v1/bookings")
    .set("Origin", WEB_ORIGIN)
    .set("X-CSRF-Token", customer.csrfToken)
    .set("Idempotency-Key", randomUUID())
    .send({ quoteId: quote.body.quoteId, addressId, preference: "any", lines: LINES });
  const booking = created.body as BookingDto;
  const paid = ctx.gateway.pay(booking.payment?.orderId ?? "", "success", booking.payment?.amountPaise ?? 0);
  const verified = await customer.post(`/v1/bookings/${booking.id}/payments/verify`, { orderId: booking.payment?.orderId, paymentId: paid.paymentId, signature: paid.signature });
  expect(verified.body.status).toBe("searching");
  return verified.body as BookingDto;
}

async function acceptedBooking(): Promise<BookingDto> {
  const booking = await paidBooking();
  let offer = null;
  for (let attempt = 0; attempt < 50 && !offer; attempt++) {
    offer = await Offer.findOne({ bookingId: booking.id, professionalId: proId, status: "pending" }).lean();
    if (!offer) await new Promise((resolve) => setTimeout(resolve, 20));
  }
  expect((await pro.post(`/v1/pro/offers/${String(offer?._id)}/accept`)).status).toBe(200);
  return (await customer.get(`/v1/bookings/${booking.id}`)).body as BookingDto;
}

async function completedBooking(): Promise<BookingDto> {
  const booking = await acceptedBooking();
  await pro.post(`/v1/pro/jobs/${booking.id}/arrived`, { location: { ...HOME, accuracy: 10 } });
  await pro.post(`/v1/pro/jobs/${booking.id}/start`, { otp: booking.otp });
  expect((await pro.post(`/v1/pro/jobs/${booking.id}/complete`, { confirmEarly: true })).body.status).toBe("completed");
  return booking;
}

beforeAll(async () => {
  ctx = await startTestApp({ CHECKOUT_RATE_LIMITS: "0" });
  admin = await loginAs(ctx.app, (await createUser({ role: "admin", name: "Asha Admin" })).email);
  await admin.post("/v1/admin/categories", category);
  await admin.post("/v1/admin/services", service);
  const current = await admin.get("/v1/admin/settings");
  await admin.send("put", "/v1/admin/settings", { version: current.body.version, settings: { ...DEFAULT_SETTINGS, operations: { ...DEFAULT_SETTINGS.operations, serviceHours: { open: "00:00", close: "23:59" } } } });
  const customerUser = await createUser({ role: "customer", name: "Neha Kapoor", phone: "9876543210" });
  customerId = customerUser.id;
  customer = await loginAs(ctx.app, customerUser.email);
  addressId = (await customer.post("/v1/me/addresses", { label: "home", house: "302", building: "", street: "Sector 15", landmark: "", city: "Faridabad", pincode: "121007", location: HOME, placeId: null, isDefault: true })).body.id;

  const email = `pro.${randomUUID().slice(0, 6)}@example.com`;
  const user = await User.create({ role: "professional", name: "Priya Verma", email, phone: "9811100001", locale: "en", passwordHash: await hashPassword(STRONG_PASSWORD) });
  proId = String(user._id);
  await Professional.create({
    userId: user._id,
    gender: "female",
    skills: ["salon_women"],
    baseArea: "Sector 15",
    travelRadiusKm: 5,
    photo: null,
    verificationNote: "",
    verification: { at: new Date(), by: user._id, byName: "Admin" },
    presence: { state: "available", since: new Date(), lastHeartbeatAt: new Date(), location: toPoint(NEAR.lat, NEAR.lng), locationAt: new Date(), accuracyM: 20, activeBookingId: null },
  });
  pro = await loginAs(ctx.app, email);
});
afterAll(async () => {
  await ctx.close();
});

describe("admin access", () => {
  it("is for admins only", async () => {
    expect((await customer.get("/v1/admin/dashboard")).status).toBe(403);
    expect((await pro.get("/v1/admin/bookings")).status).toBe(403);
    expect((await request(ctx.app).get("/v1/admin/live").set("Origin", WEB_ORIGIN)).status).toBe(401);
  });
});

describe("dashboard, live board and alerts (W14)", () => {
  it("counts today's bookings, shows who is searching and what needs attention", async () => {
    const searching = await paidBooking();
    await Alert.create({ kind: "slow_search", bookingId: searching.id, message: `${searching.number}: searching for 90 s`, createdAt: new Date(), resolvedAt: null, resolvedBy: null });

    const dashboard = (await admin.get("/v1/admin/dashboard")).body as AdminDashboardDto;
    expect(dashboard.today.bookings).toBeGreaterThanOrEqual(1);
    expect(dashboard.today.paid).toBeGreaterThanOrEqual(1);
    expect(dashboard.today.revenuePaise).toBeGreaterThanOrEqual(66_000);
    expect(dashboard.now.searching).toBeGreaterThanOrEqual(1);
    const alert = dashboard.alerts.find((item) => item.bookingId === searching.id);
    expect(alert).toMatchObject({ kind: "slow_search", bookingNumber: searching.number });

    const live = (await admin.get("/v1/admin/live")).body as AdminLiveDto;
    expect(live.bookings.find((booking) => booking.id === searching.id)).toMatchObject({ status: "searching", area: "Sector 15, Faridabad" });
    expect(live.professionals.find((row) => row.id === proId)).toMatchObject({ name: "Priya Verma", location: { lat: NEAR.lat, lng: NEAR.lng } });

    expect((await admin.post(`/v1/admin/alerts/${alert?.id}/resolve`)).status).toBe(204);
    expect(((await admin.get("/v1/admin/dashboard")).body as AdminDashboardDto).alerts.some((item) => item.id === alert?.id)).toBe(false);
    expect((await admin.post(`/v1/admin/alerts/${alert?.id}/resolve`)).status).toBe(404);
    // Cleanup: let the search end so later specs start fresh.
    await Booking.updateOne({ _id: searching.id }, { $set: { status: "cancelled" } });
  });
});

describe("alerts that resolve themselves", () => {
  it("closes a slow-search alert once the booking is accepted, but keeps a failed refund open", async () => {
    const searching = await paidBooking();
    await Alert.create({ kind: "slow_search", bookingId: searching.id, message: "searching for 90 s", createdAt: new Date(), resolvedAt: null, resolvedBy: null });
    await Alert.create({ kind: "refund_failed", bookingId: searching.id, message: "needs a person", createdAt: new Date(), resolvedAt: null, resolvedBy: null });
    let offer = null;
    for (let attempt = 0; attempt < 50 && !offer; attempt++) {
      offer = await Offer.findOne({ bookingId: searching.id, professionalId: proId, status: "pending" }).lean();
      if (!offer) await new Promise((resolve) => setTimeout(resolve, 20));
    }
    expect((await pro.post(`/v1/pro/offers/${String(offer?._id)}/accept`)).status).toBe(200);
    let open = 1;
    for (let attempt = 0; attempt < 50 && open > 0; attempt++) {
      open = await Alert.countDocuments({ bookingId: searching.id, kind: "slow_search", resolvedAt: null });
      if (open > 0) await new Promise((resolve) => setTimeout(resolve, 20));
    }
    expect(open).toBe(0);
    expect(await Alert.countDocuments({ bookingId: searching.id, kind: "refund_failed", resolvedAt: null })).toBe(1);
    // Free the professional for the next specs.
    await pro.post(`/v1/pro/jobs/${searching.id}/cancel`, { reason: "other" });
    await Booking.updateOne({ _id: searching.id }, { $set: { status: "cancelled" } });
    await Alert.deleteMany({ bookingId: searching.id });
  });
});

describe("bookings (W14)", () => {
  it("filters by view and finds a booking by number or the customer's phone", async () => {
    const booking = await paidBooking();
    const byNumber = (await admin.get(`/v1/admin/bookings?q=${booking.number}`)).body as Paged<AdminBookingRow>;
    expect(byNumber.total).toBe(1);
    expect(byNumber.rows[0]).toMatchObject({ number: booking.number, customerName: "Neha Kapoor", customerPhone: "9876543210", totalPaise: 66_000, status: "searching" });
    const byPhone = (await admin.get("/v1/admin/bookings?q=98765%2043210")).body as Paged<AdminBookingRow>;
    expect(byPhone.rows.some((row) => row.id === booking.id)).toBe(true);
    const searching = (await admin.get("/v1/admin/bookings?view=searching")).body as Paged<AdminBookingRow>;
    expect(searching.rows.every((row) => row.status === "searching")).toBe(true);
    const completed = (await admin.get("/v1/admin/bookings?view=completed")).body as Paged<AdminBookingRow>;
    expect(completed.rows.some((row) => row.id === booking.id)).toBe(false);
    await Booking.updateOne({ _id: booking.id }, { $set: { status: "cancelled" } });
  });

  it("exports CSV with formulas neutralised", async () => {
    await User.updateOne({ _id: customerId }, { $set: { name: "=HYPERLINK(evil)" } });
    const booking = await paidBooking();
    const res = await admin.get(`/v1/admin/bookings/export.csv?q=${booking.number}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    // Starts with a byte-order mark for Excel.
    expect(res.text.charCodeAt(0)).toBe(0xfeff);
    const text = res.text.slice(1);
    const [header, row] = text.split("\r\n");
    expect(header).toBe('"Booking","Created (IST)","Status","Customer","Phone","Professional","Area","Total (INR)","Refund"');
    expect(row).toContain(`"${booking.number}"`);
    expect(row).toContain(`"'=HYPERLINK(evil)"`);
    expect(row).toContain('"660.00"');
    await User.updateOne({ _id: customerId }, { $set: { name: "Neha Kapoor" } });
    await Booking.updateOne({ _id: booking.id }, { $set: { status: "cancelled" } });
  });

  it("shows the whole story, takes notes, and refunds no more than was paid", async () => {
    const booking = await completedBooking();
    const detail = (await admin.get(`/v1/admin/bookings/${booking.id}`)).body as AdminBookingDetailDto;
    expect(detail.customer).toMatchObject({ name: "Neha Kapoor", phone: "9876543210" });
    expect(detail.history.map((entry) => entry.status)).toEqual(["awaiting_payment", "searching", "accepted", "arrived", "in_progress", "completed"]);
    expect(detail.offers[0]).toMatchObject({ professionalName: "Priya Verma", status: "accepted" });
    expect(detail.payments[0]).toMatchObject({ status: "captured", amountPaise: 66_000 });
    expect(detail.refundablePaise).toBe(66_000);
    // The admin view shows the professional's phone even after completion.
    expect(detail.booking.professional?.phone).toBe("9811100001");

    expect((await admin.post(`/v1/admin/bookings/${booking.id}/notes`, { text: "Customer called about the towel." })).status).toBe(201);
    const tooMuch = await admin.post(`/v1/admin/bookings/${booking.id}/refund`, { amountPaise: 70_000, reason: "Goodwill" });
    expect(tooMuch.status).toBe(400);
    expect(tooMuch.body.error.fields.amountPaise).toBe("validation.refundTooMuch");
    expect((await admin.post(`/v1/admin/bookings/${booking.id}/refund`, { amountPaise: 10_000, reason: "Goodwill for a late start" })).status).toBe(201);
    await flush();

    const after = (await admin.get(`/v1/admin/bookings/${booking.id}`)).body as AdminBookingDetailDto;
    expect(after.notes[0]).toMatchObject({ text: "Customer called about the towel.", byName: "Asha Admin" });
    expect(after.refunds.at(-1)).toMatchObject({ amountPaise: 10_000, status: "processed", initiatedBy: "admin" });
    expect(after.refundablePaise).toBe(56_000);
    const audit = (await admin.get(`/v1/admin/audit?entityId=${booking.id}`)).body as Paged<{ action: string }>;
    expect(audit.rows.map((row) => row.action)).toEqual(expect.arrayContaining(["booking.note", "booking.refund"]));
  });

  it("reassigns an accepted job: the booking searches again and the professional is free", async () => {
    const booking = await acceptedBooking();
    const res = await admin.post(`/v1/admin/bookings/${booking.id}/reassign`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("searching");
    const profile = await Professional.findOne({ userId: proId }).lean();
    expect(profile?.presence).toMatchObject({ state: "available", activeBookingId: null });
    const stored = await Booking.findById(booking.id).lean();
    expect(stored?.statusHistory.at(-1)).toMatchObject({ status: "searching", by: "admin" });
    expect(stored?.search?.offeredUserIds.map(String)).toContain(proId);
    // The professional can no longer open it.
    expect((await pro.get(`/v1/pro/jobs/${booking.id}`)).status).toBe(404);
    await Booking.updateOne({ _id: booking.id }, { $set: { status: "cancelled" } });
  });
});

describe("start code", () => {
  it("unlocks a locked code after the team calls the customer", async () => {
    const booking = await acceptedBooking();
    await pro.post(`/v1/pro/jobs/${booking.id}/arrived`, { location: { ...HOME, accuracy: 10 } });
    const wrong = booking.otp === "0000" ? "1111" : "0000";
    for (let attempt = 0; attempt < 5; attempt++) await pro.post(`/v1/pro/jobs/${booking.id}/start`, { otp: wrong });
    expect((await pro.post(`/v1/pro/jobs/${booking.id}/start`, { otp: booking.otp })).body.error.code).toBe("OTP_LOCKED");
    expect(((await admin.get(`/v1/admin/bookings/${booking.id}`)).body as AdminBookingDetailDto).otp).toEqual({ attempts: 5, locked: true });

    expect((await admin.post(`/v1/admin/bookings/${booking.id}/unlock-code`)).status).toBe(204);
    expect(await Alert.findOne({ bookingId: booking.id, kind: "otp_locked", resolvedAt: null }).lean()).toBeNull();
    expect((await pro.post(`/v1/pro/jobs/${booking.id}/start`, { otp: booking.otp })).body.status).toBe("in_progress");
    // Nothing to unlock any more.
    expect((await admin.post(`/v1/admin/bookings/${booking.id}/unlock-code`)).status).toBe(409);
    await pro.post(`/v1/pro/jobs/${booking.id}/complete`, { confirmEarly: true });
  });
});

describe("customers", () => {
  it("blocks a customer, which ends their session at once", async () => {
    const other = await createUser({ role: "customer", name: "Ravi Sharma", phone: "9811122233" });
    const client = await loginAs(ctx.app, other.email);
    const list = (await admin.get("/v1/admin/customers?q=ravi")).body as Paged<{ id: string; name: string }>;
    expect(list.rows.map((row) => row.name)).toContain("Ravi Sharma");
    expect((await admin.post(`/v1/admin/customers/${other.id}/status`, { status: "blocked", reason: "Abusive calls" })).body).toEqual({ status: "blocked" });
    expect((await client.get("/v1/session")).body.user).toBeNull();
    const login = await request(ctx.app).post("/v1/auth/login").set("Origin", WEB_ORIGIN).send({ email: other.email, password: STRONG_PASSWORD });
    expect(login.status).not.toBe(200);
    expect((await admin.post(`/v1/admin/customers/${other.id}/status`, { status: "active", reason: "Apologised" })).body).toEqual({ status: "active" });
    const detail = (await admin.get(`/v1/admin/customers/${customerId}`)).body as { customer: { bookings: number }; bookings: unknown[] };
    expect(detail.bookings.length).toBeGreaterThan(0);
  });
});

describe("money", () => {
  it("raises an alert when a refund fails at the gateway, and a retry sends it again", async () => {
    const booking = await paidBooking();
    expect((await customer.post(`/v1/bookings/${booking.id}/cancel`, { reason: "changed_plans" })).body.status).toBe("cancelled");
    await flush();
    const refund = await Refund.findOne({ bookingId: booking.id }).lean();
    expect(refund?.status).toBe("processed");

    // The bank turns it down later (refund.failed webhook).
    await Refund.updateOne({ _id: refund?._id }, { $set: { gatewayRefundId: "rfnd_failing_1" } });
    const body = JSON.stringify({ event: "refund.failed", payload: { refund: { entity: { id: "rfnd_failing_1", payment_id: refund?.paymentId, status: "failed" } } } });
    const hook = await request(ctx.app).post("/v1/webhooks/razorpay").set("Content-Type", "application/json").set("X-Razorpay-Signature", ctx.gateway.signWebhook(body)).set("X-Razorpay-Event-Id", `evt_${randomUUID()}`).send(body);
    expect(hook.status).toBe(200);
    expect(await Alert.findOne({ bookingId: booking.id, kind: "refund_failed", resolvedAt: null }).lean()).toBeTruthy();

    const failed = (await admin.get("/v1/admin/refunds?status=failed")).body as Paged<{ id: string; bookingNumber: string }>;
    expect(failed.rows.find((row) => row.id === String(refund?._id))).toMatchObject({ bookingNumber: booking.number });
    expect((await admin.post(`/v1/admin/refunds/${String(refund?._id)}/retry`)).status).toBe(204);
    expect((await Refund.findById(refund?._id).lean())?.status).toBe("queued");
    expect(await Alert.findOne({ bookingId: booking.id, kind: "refund_failed", resolvedAt: null }).lean()).toBeNull();
    await flush();
    expect((await Refund.findById(refund?._id).lean())?.status).toBe("processed");
    // Only a failed refund can be retried.
    expect((await admin.post(`/v1/admin/refunds/${String(refund?._id)}/retry`)).status).toBe(409);
    const payments = (await admin.get("/v1/admin/payments")).body as Paged<{ bookingNumber: string }>;
    expect(payments.rows.some((row) => row.bookingNumber === booking.number)).toBe(true);
  });
});

describe("reviews and payouts", () => {
  it("hides a review (the rating follows) and marks earnings as paid out", async () => {
    const booking = await completedBooking();
    expect((await customer.post(`/v1/bookings/${booking.id}/review`, { rating: 1, comment: "Rude" })).status).toBe(204);
    const before = await Professional.findOne({ userId: proId }).lean();
    expect(before?.stats.ratingCount).toBeGreaterThan(0);

    const reviews = (await admin.get("/v1/admin/reviews?rating=1")).body as Paged<{ bookingId: string; comment: string }>;
    expect(reviews.rows.find((row) => row.bookingId === booking.id)).toMatchObject({ comment: "Rude" });
    expect((await admin.post(`/v1/admin/reviews/${booking.id}/visibility`, { hidden: true })).body).toEqual({ hidden: true });
    const after = await Professional.findOne({ userId: proId }).lean();
    expect(after?.stats.ratingCount).toBe((before?.stats.ratingCount ?? 1) - 1);
    // Hidden from the customer's view too.
    expect((await customer.get(`/v1/bookings/${booking.id}`)).body.review).toBeNull();

    const performance = (await admin.get(`/v1/admin/professionals/${proId}/performance`)).body as { completed: number; pendingPayoutPaise: number; acceptRate: number | null };
    expect(performance.completed).toBeGreaterThan(0);
    expect(performance.pendingPayoutPaise).toBeGreaterThan(0);
    expect(performance.acceptRate).toBeGreaterThan(0);
    const payout = (await admin.post(`/v1/admin/professionals/${proId}/payouts`)).body as { jobs: number; paidPaise: number };
    expect(payout.jobs).toBeGreaterThan(0);
    expect(payout.paidPaise).toBe(performance.pendingPayoutPaise);
    expect(((await admin.get(`/v1/admin/professionals/${proId}/performance`)).body as { pendingPayoutPaise: number }).pendingPayoutPaise).toBe(0);
    expect((await pro.get("/v1/pro/jobs/earnings")).body.pendingPayoutPaise).toBe(0);
  });
});
