import { randomUUID } from "node:crypto";
import { type BookingDto, type CategoryInput, DEFAULT_SETTINGS, type OfferDto, type ServiceInput, type Skill } from "@brand/shared";
import type { Express } from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createLogger } from "../src/logger";
import { Booking } from "../src/modules/bookings/booking.model";
import type { Matching } from "../src/modules/matching/matching.service";
import { Offer } from "../src/modules/matching/offer.model";
import { Alert } from "../src/modules/notifications/notifications";
import { Refund } from "../src/modules/payments/payment.model";
import { refundHandler } from "../src/modules/payments/payments.service";
import { Professional, toPoint } from "../src/modules/professionals/professional.model";
import { dispatchOutbox } from "../src/modules/system/outbox";
import { User } from "../src/modules/users/user.model";
import { type Client, createUser, loginAs, startTestApp, type TestContext, uniquePhone, WEB_ORIGIN } from "./helpers";

let ctx: TestContext;
let admin: Client;
let customer: Client;
let matching: Matching;
let addressId: string;

const HOME = { lat: 28.4089, lng: 77.3178 };
const LINES = [{ serviceSlug: "fruit-facial", tierId: "standard", quantity: 1, seenUnitPricePaise: 64_900 }];

const category: CategoryInput = {
  slug: "salon-for-women",
  gender: "women",
  name: { en: "Salon for women", hi: "" },
  description: { en: "", hi: "" },
  filters: [],
  skill: "salon_women",
  image: null,
  order: 0,
  active: true,
};
const service: ServiceInput = {
  slug: "fruit-facial",
  gender: "women",
  categorySlugs: ["salon-for-women"],
  filterSlugs: [],
  name: { en: "Fruit facial", hi: "फ्रूट फ़ेशियल" },
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

interface ProOverrides {
  rating?: number;
  gender?: "female" | "male";
  skills?: Skill[];
  travelRadiusKm?: number;
  /** Seconds since the last heartbeat; the default is "just now". */
  heardSecondsAgo?: number;
  /** Seconds since the last position fix; defaults to the heartbeat's age. */
  fixSecondsAgo?: number;
  status?: "active" | "suspended";
}

/** An online, verified professional `metres` north of HOME, logged in. */
async function pro(metres: number, overrides: ProOverrides = {}): Promise<{ id: string; client: Client }> {
  const email = `pro.${randomUUID().slice(0, 8)}@example.com`;
  const user = await User.create({ role: "professional", name: `Pro ${metres}`, email, phone: uniquePhone(), locale: "en", status: overrides.status ?? "active" });
  const heard = new Date(Date.now() - (overrides.heardSecondsAgo ?? 0) * 1000);
  const fixed = new Date(Date.now() - (overrides.fixSecondsAgo ?? overrides.heardSecondsAgo ?? 0) * 1000);
  await Professional.create({
    userId: user._id,
    gender: overrides.gender ?? "female",
    skills: overrides.skills ?? ["salon_women"],
    baseArea: "Sector 15",
    travelRadiusKm: overrides.travelRadiusKm ?? 5,
    photo: null,
    verificationNote: "",
    verification: { at: new Date(), by: user._id, byName: "Admin" },
    presence: { state: "available", since: new Date(), lastHeartbeatAt: heard, location: toPoint(HOME.lat + metres / 111_000, HOME.lng), locationAt: fixed, accuracyM: 20, activeBookingId: null },
    stats: { rating: overrides.rating ?? null, ratingCount: 0, jobsToday: 0, jobsTodayDate: null, lastCompletedAt: null, offers: 0, accepted: 0 },
  });
  // A suspended account cannot sign in, and these tests only need it to exist.
  const client = overrides.status === "suspended" ? (null as unknown as Client) : await loginAs(ctx.app as Express, email);
  return { id: String(user._id), client };
}

/** Changes matching settings for one test; pass the same keys back to restore them. */
async function setMatching(partial: Record<string, unknown>) {
  const current = await admin.get("/v1/admin/settings");
  await admin.send("put", "/v1/admin/settings", {
    version: current.body.version,
    settings: { ...current.body.settings, matching: { ...current.body.settings.matching, ...partial } },
  });
}

/** Pretends the search has been running for `seconds`, and makes the next round due now. */
async function ageSearch(bookingId: string, seconds: number) {
  await Booking.updateOne({ _id: bookingId }, { $set: { "search.startedAt": new Date(Date.now() - seconds * 1000), "search.nextRoundAt": new Date(Date.now() - 1_000) } });
}

/** A paid booking, now searching (the first round goes out on the "searching" event). */
async function paidBooking(preference: "any" | "female" | "male" = "any"): Promise<BookingDto> {
  const quote = await customer.post("/v1/availability/quote", { location: HOME, lines: LINES, preference });
  expect(quote.body.available, JSON.stringify(quote.body)).toBe(true);
  const created = await customer.agent
    .post("/v1/bookings")
    .set("Origin", WEB_ORIGIN)
    .set("X-CSRF-Token", customer.csrfToken)
    .set("Idempotency-Key", randomUUID())
    .send({ quoteId: quote.body.quoteId, addressId, preference, lines: LINES });
  const booking = created.body as BookingDto;
  const paid = ctx.gateway.pay(booking.payment?.orderId ?? "", "success", booking.payment?.amountPaise ?? 0);
  const verified = await customer.post(`/v1/bookings/${booking.id}/payments/verify`, { orderId: booking.payment?.orderId, paymentId: paid.paymentId, signature: paid.signature });
  expect(verified.body.status).toBe("searching");
  return verified.body as BookingDto;
}

async function offersFor(bookingId: string) {
  // The first round is sent asynchronously; wait for it.
  for (let attempt = 0; attempt < 50; attempt++) {
    const offers = await Offer.find({ bookingId }).lean();
    if (offers.length) return offers;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return [];
}

async function clearProfessionals() {
  await Professional.deleteMany({});
}

beforeAll(async () => {
  // Many bookings in a few seconds: the checkout limits would (rightly) stop a real person.
  ctx = await startTestApp({ CHECKOUT_RATE_LIMITS: "0" });
  matching = ctx.app.locals.matching as Matching;
  admin = await loginAs(ctx.app, (await createUser({ role: "admin" })).email);
  await admin.post("/v1/admin/categories", category);
  await admin.post("/v1/admin/services", service);
  const current = await admin.get("/v1/admin/settings");
  await admin.send("put", "/v1/admin/settings", { version: current.body.version, settings: { ...DEFAULT_SETTINGS, operations: { ...DEFAULT_SETTINGS.operations, serviceHours: { open: "00:00", close: "23:59" } } } });
  customer = await loginAs(ctx.app, (await createUser({ role: "customer", name: "Neha Kapoor" })).email);
  addressId = (
    await customer.post("/v1/me/addresses", { label: "home", house: "302", building: "", street: "Sector 15", landmark: "", city: "Faridabad", pincode: "121007", location: HOME, placeId: null, isDefault: true })
  ).body.id;
});
afterAll(async () => {
  await ctx.close();
});

describe("matching (plan C6, W5/W6)", () => {
  it("offers the nearest three, ranked by distance, with earnings after commission", async () => {
    await clearProfessionals();
    const near = await pro(300);
    const mid = await pro(900);
    const far = await pro(1_600);
    await pro(4_000);
    const booking = await paidBooking();
    const offers = await offersFor(booking.id);
    expect(offers.map((offer) => String(offer.professionalId)).sort()).toEqual([near.id, mid.id, far.id].sort());

    const offer = (await near.client.get("/v1/pro/offers")).body as OfferDto[];
    expect(offer).toHaveLength(1);
    // 25% commission on ₹649 of services: ₹486.75 → 48,675 paise; the ₹11 platform fee isn't theirs.
    expect(offer[0]).toMatchObject({ bookingNumber: booking.number, locality: "Sector 15, Faridabad", earningsPaise: 48_675, direct: false });
    expect(JSON.stringify(offer[0])).not.toContain("302");
  });

  it("lets exactly one of five simultaneous accepts win, and tells the others it's taken", async () => {
    await clearProfessionals();
    const pros = await Promise.all([200, 250, 300, 350, 400].map((metres) => pro(metres)));
    const current = await admin.get("/v1/admin/settings");
    await admin.send("put", "/v1/admin/settings", { version: current.body.version, settings: { ...current.body.settings, matching: { ...current.body.settings.matching, offersPerRound: 5 } } });

    const booking = await paidBooking();
    const offers = await offersFor(booking.id);
    expect(offers).toHaveLength(5);
    const results = await Promise.all(
      offers.map((offer) => {
        const client = pros.find((candidate) => candidate.id === String(offer.professionalId))?.client;
        return client?.post(`/v1/pro/offers/${String(offer._id)}/accept`);
      }),
    );
    const statuses = results.map((res) => res?.status);
    expect(statuses.filter((status) => status === 200), JSON.stringify(results.map((res) => [res?.status, res?.body]))).toHaveLength(1);
    expect(results.filter((res) => res?.status === 409).every((res) => res?.body.error.code === "OFFER_TAKEN" || res?.body.error.code === "PRO_BUSY")).toBe(true);

    const accepted = await Booking.findById(booking.id).lean();
    expect(accepted?.status).toBe("accepted");
    const winner = results.find((res) => res?.status === 200)?.body as BookingDto;
    expect(String(accepted?.professionalId)).toBe(winner.professional?.id);
    expect(await Professional.countDocuments({ "presence.state": "busy" })).toBe(1);
    expect(await Offer.countDocuments({ bookingId: booking.id, status: "revoked" })).toBe(4);

    // The customer now sees who is coming, their phone, and the start code.
    const view = (await customer.get(`/v1/bookings/${booking.id}`)).body as BookingDto;
    expect(view).toMatchObject({ status: "accepted", professional: { phone: expect.stringMatching(/^[6-9]\d{9}$/) } });
    expect(view.otp).toMatch(/^\d{4}$/);

    await admin.send("put", "/v1/admin/settings", { version: (await admin.get("/v1/admin/settings")).body.version, settings: { ...current.body.settings, matching: { ...current.body.settings.matching, offersPerRound: 3 } } });
  });

  // Plan C17: "100 runs of 5 simultaneous accepts must give exactly 1 winner". 20 runs by
  // default; CONCURRENCY_RUNS=100 for the full check.
  it("keeps exactly one winner across repeated races", async () => {
    const runs = Number(process.env.CONCURRENCY_RUNS ?? 20);
    const current = await admin.get("/v1/admin/settings");
    await admin.send("put", "/v1/admin/settings", { version: current.body.version, settings: { ...current.body.settings, matching: { ...current.body.settings.matching, offersPerRound: 5 } } });
    for (let run = 0; run < runs; run++) {
      await clearProfessionals();
      const pros = await Promise.all([200, 250, 300, 350, 400].map((metres) => pro(metres)));
      const booking = await paidBooking();
      const offers = await offersFor(booking.id);
      const results = await Promise.all(
        offers.map((offer) => pros.find((candidate) => candidate.id === String(offer.professionalId))?.client.post(`/v1/pro/offers/${String(offer._id)}/accept`)),
      );
      expect(results.filter((res) => res?.status === 200), `run ${run}`).toHaveLength(1);
      expect(results.filter((res) => res?.status === 500), `run ${run}`).toHaveLength(0);
      expect(await Professional.countDocuments({ "presence.state": "busy" }), `run ${run}`).toBe(1);
    }
    await admin.send("put", "/v1/admin/settings", { version: (await admin.get("/v1/admin/settings")).body.version, settings: { ...current.body.settings, matching: { ...current.body.settings.matching, offersPerRound: 3 } } });
  }, 240_000);

  it("moves to the next round when everyone declines", async () => {
    await clearProfessionals();
    const first = await pro(200);
    const second = await pro(2_500);
    const current = await admin.get("/v1/admin/settings");
    await admin.send("put", "/v1/admin/settings", { version: current.body.version, settings: { ...current.body.settings, matching: { ...current.body.settings.matching, offersPerRound: 1 } } });
    const booking = await paidBooking();
    const [offer] = await offersFor(booking.id);
    expect(String(offer?.professionalId)).toBe(first.id);
    expect((await first.client.post(`/v1/pro/offers/${String(offer?._id)}/decline`, { reason: "too_far" })).status).toBe(204);
    const offers = await Offer.find({ bookingId: booking.id }).lean();
    expect(offers.map((item) => [String(item.professionalId), item.status])).toEqual(
      expect.arrayContaining([
        [first.id, "declined"],
        [second.id, "pending"],
      ]),
    );
    await admin.send("put", "/v1/admin/settings", { version: (await admin.get("/v1/admin/settings")).body.version, settings: { ...current.body.settings, matching: { ...current.body.settings.matching, offersPerRound: 3 } } });
  });

  it("refuses an expired offer", async () => {
    await clearProfessionals();
    const solo = await pro(200);
    const booking = await paidBooking();
    const [offer] = await offersFor(booking.id);
    await Offer.updateOne({ _id: offer?._id }, { $set: { expiresAt: new Date(Date.now() - 1_000) } });
    const late = await solo.client.post(`/v1/pro/offers/${String(offer?._id)}/accept`);
    expect(late.body.error.code).toBe("OFFER_EXPIRED");
  });

  it("refunds in full and alerts the team when no one accepts in time", async () => {
    await clearProfessionals();
    await pro(200);
    const booking = await paidBooking();
    await Booking.updateOne({ _id: booking.id }, { $set: { "search.deadlineAt": new Date(Date.now() - 1_000) } });
    await matching.sweep();
    const ended = (await customer.get(`/v1/bookings/${booking.id}`)).body as BookingDto;
    expect(ended).toMatchObject({ status: "no_professional_found", refund: { amountPaise: 66_000, reason: "no_match" } });
    expect(await Alert.countDocuments({ bookingId: booking.id, kind: "no_match" })).toBe(1);
    expect(await Offer.countDocuments({ bookingId: booking.id, status: "pending" })).toBe(0);

    // Earlier tests left confirmation emails in the queue; deliver everything.
    await dispatchOutbox({ refund: refundHandler(ctx.gateway, createLogger(ctx.config)), email: async () => undefined, push: async () => undefined }, createLogger(ctx.config), 1_000);
    expect((await Refund.findOne({ bookingId: booking.id }).lean())?.status).toBe("processed");
  });

  it("lets an admin send a direct offer to an eligible professional", async () => {
    await clearProfessionals();
    const busy = await pro(200);
    const booking = await paidBooking();
    const [offer] = await offersFor(booking.id);
    await busy.client.post(`/v1/pro/offers/${String(offer?._id)}/decline`, {});
    const chosen = await pro(3_000);
    const direct = await admin.post(`/v1/admin/bookings/${booking.id}/offer`, { professionalId: chosen.id });
    expect(direct.status).toBe(201);
    expect(direct.body).toMatchObject({ direct: true, bookingNumber: booking.number });
    const accepted = await chosen.client.post(`/v1/pro/offers/${String(direct.body.id)}/accept`);
    expect(accepted.status, JSON.stringify(accepted.body)).toBe(200);
  });
});

/**
 * Who is eligible at all. These run with no Maps key, so road distance is never asked for and
 * the straight-line path is what is being proved -- the same path production uses today.
 */
describe("who gets offered (plan C6)", () => {
  it("reaches further as the search runs, without breaking a professional's own travel limit", async () => {
    await clearProfessionals();
    await setMatching({ radiusKm: 5, maxRadiusKm: 8, widenAfterSeconds: 40, searchTimeoutSeconds: 120, offersPerRound: 1 });

    // Someone nearby, so the booking can be made at all; they are offered first and say no.
    const near = await pro(500);
    // 7 km out and willing to travel it: past the 5 km the search starts with, inside the 8 km it grows to.
    const far = await pro(7_000, { travelRadiusKm: 10 });
    // Also 7 km out, but will not travel past 2 km, so widening must never reach them.
    const homebody = await pro(7_000, { travelRadiusKm: 2 });

    const booking = await paidBooking();
    const first = await offersFor(booking.id);
    expect(first.map((offer) => String(offer.professionalId))).toEqual([near.id]);

    // With the search still young, the 7 km professionals are out of reach.
    await near.client.post(`/v1/pro/offers/${String(first[0]?._id)}/decline`, { reason: "busy" });
    expect(await Offer.countDocuments({ bookingId: booking.id, status: "pending" })).toBe(0);

    // Once it has been looking a while, the radius has grown past 7 km.
    await ageSearch(booking.id, 100);
    await matching.sweep();

    const offered = (await Offer.find({ bookingId: booking.id }).lean()).map((offer) => String(offer.professionalId));
    expect(offered).toContain(far.id);
    expect(offered).not.toContain(homebody.id);

    await setMatching({ ...DEFAULT_SETTINGS.matching });
  });

  it("skips anyone who already holds a live offer for another booking", async () => {
    await clearProfessionals();
    const only = await pro(300);

    const first = await paidBooking();
    expect((await offersFor(first.id)).map((offer) => String(offer.professionalId))).toEqual([only.id]);

    // The same professional cannot take a second booking while that offer is open.
    const second = await paidBooking();
    expect(await offersFor(second.id)).toHaveLength(0);

    // Once the offer is gone they are back in the pool.
    await Offer.updateMany({ bookingId: first.id, status: "pending" }, { $set: { status: "revoked" } });
    await ageSearch(second.id, 1);
    await matching.sweep();
    expect((await offersFor(second.id)).map((offer) => String(offer.professionalId))).toEqual([only.id]);
  });

  it("leaves out the wrong skill, a silent phone and a stale position", async () => {
    await clearProfessionals();
    const wanted = await pro(900);
    await pro(150, { skills: ["makeup"] });
    // Heard from 10 minutes ago: well past stalePresenceSeconds.
    await pro(200, { heardSecondsAgo: 600 });
    // Still reporting, but the last position fix is 10 minutes old, so it cannot be trusted.
    await pro(250, { heardSecondsAgo: 0, fixSecondsAgo: 600 });

    const booking = await paidBooking();
    expect((await offersFor(booking.id)).map((offer) => String(offer.professionalId))).toEqual([wanted.id]);
  });

  it("honours a request for a female or male professional", async () => {
    await clearProfessionals();
    await pro(100, { gender: "male" });
    const woman = await pro(2_000, { gender: "female" });

    const booking = await paidBooking("female");
    expect((await offersFor(booking.id)).map((offer) => String(offer.professionalId))).toEqual([woman.id]);
  });

  it("does not offer a suspended account, however near it is", async () => {
    await clearProfessionals();
    await pro(100, { status: "suspended" });
    const working = await pro(2_000);

    const booking = await paidBooking();
    expect((await offersFor(booking.id)).map((offer) => String(offer.professionalId))).toEqual([working.id]);
  });
});
