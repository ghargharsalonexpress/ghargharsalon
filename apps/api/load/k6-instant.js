/* global __ENV, __VU */
/**
 * Load test for the instant-booking API (plan C17), run with k6 (https://k6.io):
 *
 *   k6 run -e API=https://api.load.brand.in -e ORIGIN=https://load.brand.in -e PASSWORD=... apps/api/load/k6-instant.js
 *
 * Needs the accounts from `npm run seed:load` and an API with PAYMENT_PROVIDER=fake (the local
 * gateway's test payment route), so payments can be scripted. Never point it at production.
 *
 * Scenarios (the plan's sizing: ≤ 300 professionals online, ≤ 30 active jobs, ≤ 20 bookings a minute):
 *   pros      300 professionals online, a heartbeat with location every 20 s; they accept alerts and
 *             then share location every 5 s for a few minutes, like a real job on the way.
 *   bookings  20 bookings a minute: quote, create (Idempotency-Key), pay, then watch the booking.
 * Targets: p95 under 300 ms for reads and heartbeats, accept under 150 ms at p95, under 1% errors.
 */
import { check, sleep } from "k6";
import http from "k6/http";
import { Counter, Trend } from "k6/metrics";

const API = __ENV.API || "http://localhost:4000";
const ORIGIN = __ENV.ORIGIN || "http://localhost:5174";
const PASSWORD = __ENV.PASSWORD;
const PROS = Number(__ENV.PROS || 300);
const CUSTOMERS = Number(__ENV.CUSTOMERS || 200);
const CENTRE = { lat: 28.4089, lng: 77.3178 };
const LINES = [{ serviceSlug: __ENV.SERVICE || "fruit-facial", tierId: __ENV.TIER || "standard", quantity: 1 }];

const acceptTime = new Trend("accept_ms", true);
const bookingsPaid = new Counter("bookings_paid");
const offersAccepted = new Counter("offers_accepted");

export const options = {
  scenarios: {
    pros: { executor: "constant-vus", exec: "professional", vus: PROS, duration: __ENV.DURATION || "15m" },
    bookings: {
      executor: "constant-arrival-rate",
      exec: "customer",
      rate: Number(__ENV.BOOKINGS_PER_MINUTE || 20),
      timeUnit: "1m",
      duration: __ENV.DURATION || "15m",
      startTime: "1m",
      preAllocatedVUs: 40,
      maxVUs: 120,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{kind:read}": ["p(95)<300"],
    "http_req_duration{kind:heartbeat}": ["p(95)<300"],
    accept_ms: ["p(95)<150"],
  },
};

/** A browser-like session: cookies from the jar, Origin and the CSRF token on writes. */
function session(email) {
  const first = http.get(`${API}/v1/session`, { headers: { Origin: ORIGIN }, tags: { kind: "read" } });
  let csrf = first.json("csrfToken");
  const login = http.post(`${API}/v1/auth/login`, JSON.stringify({ email, password: PASSWORD }), { headers: { "Content-Type": "application/json", Origin: ORIGIN, "X-CSRF-Token": csrf } });
  check(login, { "logged in": (res) => res.status === 200 });
  // A new session after login carries its own token.
  csrf = http.get(`${API}/v1/session`, { headers: { Origin: ORIGIN }, tags: { kind: "read" } }).json("csrfToken");
  const write = (path, body, tags = {}, extra = {}) =>
    http.post(`${API}${path}`, JSON.stringify(body || {}), { headers: { "Content-Type": "application/json", Origin: ORIGIN, "X-CSRF-Token": csrf, ...extra }, tags });
  const read = (path) => http.get(`${API}${path}`, { headers: { Origin: ORIGIN }, tags: { kind: "read" } });
  return { write, read };
}

const jitter = (point, metres) => ({ lat: point.lat + (Math.random() - 0.5) * (metres / 111000), lng: point.lng + (Math.random() - 0.5) * (metres / 100000), accuracy: 15 });

function proHome(index) {
  const angle = index * 2.399963;
  const distance = 5 * Math.sqrt((index % 97) / 97);
  return { lat: CENTRE.lat + (distance / 111) * Math.cos(angle), lng: CENTRE.lng + (distance / 97.6) * Math.sin(angle) };
}

export function professional() {
  const index = ((__VU - 1) % PROS) + 1;
  const api = session(`load.pro.${index}@loadtest.invalid`);
  let here = proHome(index);
  api.write("/v1/pro/presence", { online: true, location: jitter(here, 20) });

  for (;;) {
    const beat = api.write("/v1/pro/heartbeat", { location: jitter(here, 20) }, { kind: "heartbeat" });
    check(beat, { "heartbeat ok": (res) => res.status === 200 });

    const offers = api.read("/v1/pro/offers");
    const pending = offers.status === 200 ? offers.json().filter((offer) => offer.status === "pending") : [];
    if (pending.length > 0 && Math.random() < 0.7) {
      const started = Date.now();
      const accepted = api.write(`/v1/pro/offers/${pending[0].id}/accept`, {}, { kind: "accept" });
      acceptTime.add(Date.now() - started);
      if (accepted.status === 200) {
        offersAccepted.add(1);
        const bookingId = accepted.json("id");
        // On the way for about three minutes: location every 5 s.
        for (let step = 0; step < 36; step++) {
          here = jitter(here, 40);
          api.write(`/v1/pro/jobs/${bookingId}/location`, { location: here, heading: null }, { kind: "location" });
          sleep(5);
        }
        // Then step back: the booking searches again and this professional is free (keeps the pool steady).
        api.write(`/v1/pro/jobs/${bookingId}/cancel`, { reason: "other" });
      }
    }
    sleep(20);
  }
}

export function customer() {
  const index = Math.floor(Math.random() * CUSTOMERS) + 1;
  const api = session(`load.customer.${index}@loadtest.invalid`);
  const addresses = api.read("/v1/me/addresses");
  const address = addresses.status === 200 ? addresses.json()[0] : null;
  if (!address) return;

  const quote = api.write("/v1/availability/quote", { location: address.location, lines: LINES, preference: "any" }, { kind: "quote" });
  if (quote.status !== 200 || !quote.json("available")) return;
  const key = `load-${__VU}-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  const created = api.write("/v1/bookings", { quoteId: quote.json("quoteId"), addressId: address.id, preference: "any", lines: LINES }, { kind: "create" }, { "Idempotency-Key": key });
  if (!check(created, { "booking created": (res) => res.status === 201 })) return;
  const booking = created.json();
  const paid = api.write("/v1/payments/local/pay", { orderId: booking.payment.orderId, outcome: "success" });
  if (paid.status !== 200) return;
  const verified = api.write(`/v1/bookings/${booking.id}/payments/verify`, { orderId: booking.payment.orderId, paymentId: paid.json("paymentId"), signature: paid.json("signature") });
  if (check(verified, { "payment verified": (res) => res.status === 200 })) bookingsPaid.add(1);

  // The booking page polls every 15 s while the customer watches.
  for (let poll = 0; poll < 8; poll++) {
    sleep(15);
    api.read(`/v1/bookings/${booking.id}`);
  }
}
