import { randomUUID } from "node:crypto";
import { type BookingDto, type CategoryInput, DEFAULT_SETTINGS, type InvoiceDto, type ProJobDto, type ServiceInput } from "@brand/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "../src/modules/auth/password";
import { Booking } from "../src/modules/bookings/booking.model";
import { Offer } from "../src/modules/matching/offer.model";
import { Alert } from "../src/modules/notifications/notifications";
import { Refund } from "../src/modules/payments/payment.model";
import { Professional, toPoint } from "../src/modules/professionals/professional.model";
import { User } from "../src/modules/users/user.model";
import { type Client, createUser, loginAs, STRONG_PASSWORD, startTestApp, type TestContext, WEB_ORIGIN } from "./helpers";

let ctx: TestContext;
let admin: Client;
let customer: Client;
let pro: Client;
let proId: string;
let addressId: string;

const HOME = { lat: 28.4089, lng: 77.3178 };
const NEAR = { lat: 28.4100, lng: 77.3180 };
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

/** Paid and offered to our one professional, who hasn't answered yet. */
async function offeredBooking(): Promise<{ booking: BookingDto; offerId: string }> {
  await Professional.updateOne({ userId: proId }, { $set: { "presence.state": "available", "presence.activeBookingId": null, "presence.lastHeartbeatAt": new Date() } });
  const quote = await customer.post("/v1/availability/quote", { location: HOME, lines: LINES, preference: "any" });
  const created = await customer.agent
    .post("/v1/bookings")
    .set("Origin", WEB_ORIGIN)
    .set("X-CSRF-Token", customer.csrfToken)
    .set("Idempotency-Key", randomUUID())
    .send({ quoteId: quote.body.quoteId, addressId, preference: "any", lines: LINES, note: "Ring the bell twice" });
  const booking = created.body as BookingDto;
  const paid = ctx.gateway.pay(booking.payment?.orderId ?? "", "success", booking.payment?.amountPaise ?? 0);
  await customer.post(`/v1/bookings/${booking.id}/payments/verify`, { orderId: booking.payment?.orderId, paymentId: paid.paymentId, signature: paid.signature });
  let offer = null;
  for (let attempt = 0; attempt < 50 && !offer; attempt++) {
    offer = await Offer.findOne({ bookingId: booking.id, professionalId: proId, status: "pending" }).lean();
    if (!offer) await new Promise((resolve) => setTimeout(resolve, 20));
  }
  expect(offer).toBeTruthy();
  return { booking, offerId: String(offer?._id) };
}

/** Paid, offered to our one professional, and accepted. */
async function acceptedBooking(): Promise<{ booking: BookingDto; job: ProJobDto }> {
  const { booking, offerId } = await offeredBooking();
  const accepted = await pro.post(`/v1/pro/offers/${offerId}/accept`);
  expect(accepted.status, JSON.stringify(accepted.body)).toBe(200);
  const job = (await pro.get(`/v1/pro/jobs/${booking.id}`)).body as ProJobDto;
  return { booking: (await customer.get(`/v1/bookings/${booking.id}`)).body as BookingDto, job };
}

beforeAll(async () => {
  ctx = await startTestApp({ CHECKOUT_RATE_LIMITS: "0" });
  admin = await loginAs(ctx.app, (await createUser({ role: "admin" })).email);
  await admin.post("/v1/admin/categories", category);
  await admin.post("/v1/admin/services", service);
  const current = await admin.get("/v1/admin/settings");
  await admin.send("put", "/v1/admin/settings", { version: current.body.version, settings: { ...DEFAULT_SETTINGS, operations: { ...DEFAULT_SETTINGS.operations, serviceHours: { open: "00:00", close: "23:59" } } } });
  customer = await loginAs(ctx.app, (await createUser({ role: "customer", name: "Neha Kapoor", phone: "9876543210" })).email);
  addressId = (await customer.post("/v1/me/addresses", { label: "home", house: "302", building: "Green Towers", street: "Sector 15", landmark: "", city: "Faridabad", pincode: "121007", location: HOME, placeId: null, isDefault: true })).body.id;

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
beforeEach(async () => {
  await Alert.deleteMany({});
});

describe("job execution (plan W7, W8, W9)", () => {
  it("runs from accept to a rated, invoiced, paid-out job", async () => {
    const { booking, job } = await acceptedBooking();
    // After accept: the professional sees the full address and the phone; the customer sees the code.
    expect(job).toMatchObject({ status: "accepted", customer: { firstName: "Neha", phone: "9876543210" }, address: { house: "302" }, note: "Ring the bell twice", earningsPaise: 48_675 });
    expect(booking.otp).toMatch(/^\d{4}$/);

    // Location on the way: accepted, but a poor fix is ignored.
    expect((await pro.post(`/v1/pro/jobs/${booking.id}/location`, { location: { ...NEAR, accuracy: 15 }, heading: 90 })).body).toEqual({ accepted: true });
    expect((await pro.post(`/v1/pro/jobs/${booking.id}/location`, { location: { ...NEAR, accuracy: 500 } })).body).toEqual({ accepted: false });
    expect((await customer.get(`/v1/bookings/${booking.id}`)).body.tracking).toMatchObject({ lat: NEAR.lat, lng: NEAR.lng, heading: 90 });

    // Arrival 2 km away needs a confirmation.
    const far = await pro.post(`/v1/pro/jobs/${booking.id}/arrived`, { location: { lat: 28.43, lng: 77.3178, accuracy: 10 } });
    expect(far.body.error.code).toBe("CONFIRM_REQUIRED");
    expect((await pro.post(`/v1/pro/jobs/${booking.id}/arrived`, { location: { lat: 28.43, lng: 77.3178, accuracy: 10 }, confirmFar: true })).body.status).toBe("arrived");

    // A wrong code counts down; the right one starts the service.
    const wrong = await pro.post(`/v1/pro/jobs/${booking.id}/start`, { otp: booking.otp === "0000" ? "1111" : "0000" });
    expect(wrong.body.error.code).toBe("OTP_INVALID");
    expect((await pro.get(`/v1/pro/jobs/${booking.id}`)).body.otpAttemptsLeft).toBe(4);
    expect((await pro.post(`/v1/pro/jobs/${booking.id}/start`, { otp: booking.otp })).body.status).toBe("in_progress");
    expect((await customer.get(`/v1/bookings/${booking.id}`)).body.otp).toBeNull();

    // Finishing far too early asks first.
    expect((await pro.post(`/v1/pro/jobs/${booking.id}/complete`, {})).body.error.code).toBe("CONFIRM_REQUIRED");
    const done = await pro.post(`/v1/pro/jobs/${booking.id}/complete`, { confirmEarly: true });
    expect(done.body.status).toBe("completed");
    expect((await Professional.findOne({ userId: proId }).lean())?.presence).toMatchObject({ state: "available", activeBookingId: null });

    const view = (await customer.get(`/v1/bookings/${booking.id}`)).body as BookingDto;
    expect(view.invoiceNumber).toMatch(/^INV\/\d{4}-\d{2}\/000001$/);
    // Phones are hidden again after completion.
    expect(view.professional?.phone).toBeNull();

    const invoice = (await customer.get(`/v1/bookings/${booking.id}/invoice`)).body as InvoiceDto;
    expect(invoice).toMatchObject({ number: view.invoiceNumber, totalPaise: 66_000, gstRateBps: 500 });
    expect(invoice.taxablePaise + invoice.gstPaise).toBe(66_000);
    expect(invoice.lines.map((line) => line.sac)).toEqual(["999722", "998599"]);

    expect((await customer.post(`/v1/bookings/${booking.id}/review`, { rating: 5, comment: "Very gentle." })).status).toBe(204);
    expect((await customer.post(`/v1/bookings/${booking.id}/review`, { rating: 4, comment: "" })).body.error.code).toBe("REVIEW_EXISTS");
    expect((await Professional.findOne({ userId: proId }).lean())?.stats).toMatchObject({ rating: 5, ratingCount: 1, jobsToday: 1 });

    const earnings = (await pro.get("/v1/pro/jobs/earnings")).body;
    expect(earnings.todayPaise).toBeGreaterThanOrEqual(48_675);
    expect(earnings.jobs[0]).toMatchObject({ number: booking.number, netPaise: 48_675, payoutStatus: "pending" });
  });

  it("locks the code after five wrong tries and alerts the team", async () => {
    const { booking } = await acceptedBooking();
    await pro.post(`/v1/pro/jobs/${booking.id}/arrived`, { location: { ...HOME, accuracy: 10 } });
    const wrongCode = booking.otp === "0000" ? "1111" : "0000";
    for (let attempt = 1; attempt <= 4; attempt++) expect((await pro.post(`/v1/pro/jobs/${booking.id}/start`, { otp: wrongCode })).body.error.code).toBe("OTP_INVALID");
    expect((await pro.post(`/v1/pro/jobs/${booking.id}/start`, { otp: wrongCode })).body.error.code).toBe("OTP_LOCKED");
    expect((await pro.post(`/v1/pro/jobs/${booking.id}/start`, { otp: booking.otp })).body.error.code).toBe("OTP_LOCKED");
    expect(await Alert.countDocuments({ bookingId: booking.id, kind: "otp_locked" })).toBe(1);
    await ctx.app.locals.jobs.adminCancel(booking.id, "locked code", 0);
  });

  it("charges the fee when the customer cancels after accept, and refunds the rest", async () => {
    const { booking } = await acceptedBooking();
    const preview = (await customer.get(`/v1/bookings/${booking.id}/cancel-preview`)).body;
    expect(preview).toEqual({ allowed: true, feePaise: 9_900, refundPaise: 56_100, basis: "after_accept" });
    const cancelled = await customer.post(`/v1/bookings/${booking.id}/cancel`, { reason: "changed_plans" });
    expect(cancelled.body).toMatchObject({ status: "cancelled", cancellation: { by: "customer", feePaise: 9_900 }, refund: { amountPaise: 56_100 } });
    expect((await Professional.findOne({ userId: proId }).lean())?.presence.activeBookingId).toBeNull();
  });

  it("stops the professional's job alert when the customer cancels while we're still looking", async () => {
    const phone = `https://push.example.test/${randomUUID()}`;
    await pro.post("/v1/pro/push-subscriptions", { endpoint: phone, keys: { p256dh: "BOrlb0pKXsmL5H6CpGW0Qn4UZ9z2lQ", auth: "pq8d0tRkLdQ2bJ5w" } });
    const { booking, offerId } = await offeredBooking();
    expect((await customer.post(`/v1/bookings/${booking.id}/cancel`, { reason: "changed_plans" })).body).toMatchObject({ status: "cancelled" });
    expect((await Offer.findById(offerId).lean())?.status).toBe("revoked");
    // The alert on their phone is replaced at once (the open alert screen gets the same news live).
    expect(ctx.pushes.to(phone).at(-1)).toMatchObject({ kind: "offer-closed", title: "Job cancelled", url: "/pro" });
  });

  it("cancels free when the professional is late", async () => {
    const { booking } = await acceptedBooking();
    await Booking.updateOne({ _id: booking.id }, { $set: { acceptedAt: new Date(Date.now() - 60 * 60_000) } });
    expect((await customer.get(`/v1/bookings/${booking.id}/cancel-preview`)).body).toMatchObject({ feePaise: 0, refundPaise: 66_000, basis: "professional_late" });
    await ctx.app.locals.jobs.sweep();
    expect(await Alert.countDocuments({ bookingId: booking.id, kind: "late" })).toBe(1);
    await customer.post(`/v1/bookings/${booking.id}/cancel`, { reason: "too_late" });
    expect((await Refund.findOne({ bookingId: booking.id }).lean())?.amountPaise).toBe(66_000);
  });

  it("re-opens the search when the professional cancels, without offering it to them again", async () => {
    const { booking } = await acceptedBooking();
    expect((await pro.post(`/v1/pro/jobs/${booking.id}/cancel`, { reason: "vehicle" })).status).toBe(204);
    const reopened = await Booking.findById(booking.id).lean();
    expect(reopened).toMatchObject({ status: "searching", professionalId: null });
    expect(reopened?.search?.offeredUserIds.map(String)).toContain(proId);
    expect(await Alert.countDocuments({ bookingId: booking.id, kind: "pro_cancelled" })).toBe(1);
    expect((await customer.get(`/v1/bookings/${booking.id}`)).body.otp).toBeNull();
    await ctx.app.locals.jobs.adminCancel(booking.id, "test cleanup", 0);
  });

  it("allows 'customer not reachable' only after the wait and two calls, with the no-show fee", async () => {
    const { booking } = await acceptedBooking();
    await pro.post(`/v1/pro/jobs/${booking.id}/arrived`, { location: { ...HOME, accuracy: 10 } });
    expect((await pro.post(`/v1/pro/jobs/${booking.id}/customer-unavailable`)).body.error.code).toBe("BOOKING_STATE");
    await pro.post(`/v1/pro/jobs/${booking.id}/call`);
    await pro.post(`/v1/pro/jobs/${booking.id}/call`);
    await Booking.updateOne({ _id: booking.id }, { $set: { arrivedAt: new Date(Date.now() - 11 * 60_000) } });
    const ended = await pro.post(`/v1/pro/jobs/${booking.id}/customer-unavailable`);
    expect(ended.body).toMatchObject({ status: "cancelled", cancellation: { by: "professional", reason: "customer_unavailable" } });
    expect((await Refund.findOne({ bookingId: booking.id }).lean())?.amountPaise).toBe(66_000 - 19_900);
  });

  it("keeps jobs private to their professional", async () => {
    const { booking } = await acceptedBooking();
    const otherEmail = `pro.${randomUUID().slice(0, 6)}@example.com`;
    const other = await User.create({ role: "professional", name: "Other Pro", email: otherEmail, phone: "9811100009", locale: "en", passwordHash: await hashPassword(STRONG_PASSWORD) });
    await Professional.create({ userId: other._id, gender: "female", skills: ["salon_women"], baseArea: "X", travelRadiusKm: 5, photo: null, verificationNote: "", verification: null });
    const stranger = await loginAs(ctx.app, otherEmail);
    expect((await stranger.get(`/v1/pro/jobs/${booking.id}`)).status).toBe(404);
    expect((await stranger.post(`/v1/pro/jobs/${booking.id}/location`, { location: { ...HOME, accuracy: 10 } })).status).toBe(404);
    expect((await stranger.get(`/v1/bookings/${booking.id}`)).status).toBe(404);
    await ctx.app.locals.jobs.adminCancel(booking.id, "test cleanup", 0);
  });
});
