import { adminNoteSchema, adminRefundSchema, customerStatusSchema, reviewVisibilitySchema } from "@brand/shared";
import { Router } from "express";
import { currentUser, requireRole } from "../../http/auth";
import { objectIdParam } from "../../http/ids";
import { bodyOf, validateBody } from "../../http/validate";
import { auditActor, recordAudit } from "../audit/audit.model";
import { toBookingDto } from "../bookings/bookings.service";
import type { Jobs } from "../jobs/jobs.service";
import type { PaymentGateway } from "../payments/gateway";
import { retryRefund } from "../payments/payments.service";
import { SettingsHistory } from "../settings/settings.service";
import type { Admin } from "./admin.service";

const query = (req: { query: unknown }) => req.query as Record<string, unknown>;

/** /v1/admin (plan C12, Phase 8): the operations console. Admins only; every change is audited. */
export function adminRouter({ admin, jobs, gateway }: { admin: Admin; jobs: Jobs; gateway: PaymentGateway }): Router {
  const router = Router();
  router.use(requireRole("admin"));

  // Dashboard and alerts (W14)
  router.get("/dashboard", async (_req, res) => {
    res.json(await admin.dashboard());
  });
  router.get("/alerts", async (req, res) => {
    res.json(await admin.alerts(req.query.all === "1"));
  });
  router.post("/alerts/:id/resolve", async (req, res) => {
    const id = objectIdParam(req.params.id);
    await admin.resolveAlert(id, currentUser(req)._id);
    await recordAudit({ action: "alert.resolve", entity: { type: "alert", id } }, auditActor(req));
    res.status(204).end();
  });

  // Live board
  router.get("/live", async (_req, res) => {
    res.json(await admin.live());
  });

  // Bookings
  router.get("/bookings", async (req, res) => {
    res.json(await admin.listBookings(query(req)));
  });
  router.get("/bookings/export.csv", async (req, res) => {
    const csv = await admin.exportBookings(query(req));
    const day = new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
    await recordAudit({ action: "bookings.export", entity: { type: "booking", id: "export" }, after: { filters: query(req) } }, auditActor(req));
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="bookings-${day}.csv"`);
    // A byte-order mark so Excel reads the ₹ and Hindi names as UTF-8.
    res.send(String.fromCharCode(0xfeff) + csv);
  });
  router.get("/bookings/:id", async (req, res) => {
    res.json(await admin.bookingDetail(objectIdParam(req.params.id), currentUser(req)._id));
  });
  router.get("/bookings/:id/eligible", async (req, res) => {
    res.json(await admin.eligibleFor(objectIdParam(req.params.id)));
  });
  router.post("/bookings/:id/notes", validateBody(adminNoteSchema), async (req, res) => {
    const id = objectIdParam(req.params.id);
    const { text } = bodyOf(req, adminNoteSchema);
    await admin.addNote(id, currentUser(req), text);
    await recordAudit({ action: "booking.note", entity: { type: "booking", id }, after: { text } }, auditActor(req));
    res.status(201).json({ ok: true });
  });
  router.post("/bookings/:id/refund", validateBody(adminRefundSchema), async (req, res) => {
    const id = objectIdParam(req.params.id);
    const input = bodyOf(req, adminRefundSchema);
    await admin.manualRefund(id, input.amountPaise, input.reason);
    await recordAudit({ action: "booking.refund", entity: { type: "booking", id }, after: input }, auditActor(req));
    res.status(201).json({ ok: true });
  });
  router.post("/bookings/:id/unlock-code", async (req, res) => {
    const id = objectIdParam(req.params.id);
    await admin.unlockOtp(id, currentUser(req)._id);
    await recordAudit({ action: "booking.unlock_code", entity: { type: "booking", id } }, auditActor(req));
    res.status(204).end();
  });
  router.post("/bookings/:id/reassign", async (req, res) => {
    const id = objectIdParam(req.params.id);
    const booking = await jobs.adminReassign(id);
    await recordAudit({ action: "booking.reassign", entity: { type: "booking", id } }, auditActor(req));
    res.json(await toBookingDto(booking, { role: "admin", id: currentUser(req)._id }, gateway));
  });

  // Customers
  router.get("/customers", async (req, res) => {
    res.json(await admin.listCustomers(query(req)));
  });
  router.get("/customers/:id", async (req, res) => {
    res.json(await admin.customerDetail(objectIdParam(req.params.id)));
  });
  router.post("/customers/:id/status", validateBody(customerStatusSchema), async (req, res) => {
    const id = objectIdParam(req.params.id);
    const { status, reason } = bodyOf(req, customerStatusSchema);
    const change = await admin.setCustomerStatus(id, status);
    await recordAudit({ action: status === "blocked" ? "customer.block" : "customer.unblock", entity: { type: "user", id }, before: { status: change.before }, after: { status, reason } }, auditActor(req));
    res.json({ status });
  });

  // Money
  router.get("/payments", async (req, res) => {
    res.json(await admin.listPayments(query(req)));
  });
  router.get("/refunds", async (req, res) => {
    res.json(await admin.listRefunds(query(req)));
  });
  router.post("/refunds/:id/retry", async (req, res) => {
    const id = objectIdParam(req.params.id);
    await retryRefund(id, currentUser(req)._id);
    await recordAudit({ action: "refund.retry", entity: { type: "refund", id } }, auditActor(req));
    res.status(204).end();
  });

  // Reviews
  router.get("/reviews", async (req, res) => {
    res.json(await admin.listReviews(query(req)));
  });
  router.post("/reviews/:bookingId/visibility", validateBody(reviewVisibilitySchema), async (req, res) => {
    const id = objectIdParam(req.params.bookingId);
    const { hidden } = bodyOf(req, reviewVisibilitySchema);
    const change = await admin.setReviewHidden(id, hidden);
    await recordAudit({ action: hidden ? "review.hide" : "review.show", entity: { type: "booking", id }, before: { hidden: change.before }, after: { hidden } }, auditActor(req));
    res.json({ hidden });
  });

  // Professionals: performance and payouts
  router.get("/professionals/:id/performance", async (req, res) => {
    res.json(await admin.proPerformance(objectIdParam(req.params.id)));
  });
  router.post("/professionals/:id/payouts", async (req, res) => {
    const id = objectIdParam(req.params.id);
    const result = await admin.markPayout(id);
    if (result.jobs > 0) await recordAudit({ action: "professional.payout", entity: { type: "user", id }, after: result }, auditActor(req));
    res.json(result);
  });

  // Settings history (W16) and the audit trail
  router.get("/settings/history", async (_req, res) => {
    const rows = await SettingsHistory.find().sort({ version: -1 }).limit(50).lean();
    res.json(rows.map((row) => ({ version: row.version, changedAt: row.changedAt.toISOString(), changedBy: row.changedBy ? String(row.changedBy) : null })));
  });
  router.get("/audit", async (req, res) => {
    res.json(await admin.listAudit(query(req)));
  });

  return router;
}
