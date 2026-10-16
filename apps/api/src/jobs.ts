import { Types } from "mongoose";
import type { Logger } from "./logger";
import type { PaymentGateway } from "./modules/payments/gateway";
import { expireUnpaid, reconcile, refundGaveUp, refundHandler } from "./modules/payments/payments.service";
import { sweepPresence } from "./modules/professionals/professionals.service";
import type { PushService } from "./modules/professionals/push";
import { raiseAlert } from "./modules/notifications/notifications";
import { dispatchOutbox, type OutboxHandlers, type OutboxType, recoverStuckOutbox } from "./modules/system/outbox";

export interface JobDeps {
  logger: Logger;
  push: PushService;
  gateway: PaymentGateway;
  /** Extra outbox handlers and loops added by later modules (matching, notifications). */
  handlers?: Partial<OutboxHandlers>;
  loops?: Array<{ name: string; everyMs: number; run: () => Promise<unknown> }>;
}

/**
 * Background work for one API instance (plan C7). Timed behaviour lives in the data; these
 * loops only notice what is due, with conditional updates, so a restart or an overlapping run
 * never applies anything twice.
 */
/**
 * The outbox has tried eight times and stopped. A refund has its own recovery; a message that
 * will never arrive used to vanish into a log line, so it now reaches the team's bell.
 */
async function gaveUp(type: OutboxType, payload: Record<string, unknown>): Promise<void> {
  if (type === "refund") return refundGaveUp(payload);
  if (type === "email" || type === "whatsapp") {
    const bookingId = typeof payload.bookingId === "string" ? payload.bookingId : null;
    await raiseAlert("message_failed", bookingId ? new Types.ObjectId(bookingId) : null, `A ${type} message could not be delivered after 8 attempts (${String(payload.kind ?? type)}).`);
  }
}

export function startJobs({ logger, push, gateway, handlers = {}, loops = [] }: JobDeps): () => void {
  const outboxHandlers: OutboxHandlers = {
    refund: refundHandler(gateway, logger),
    push: async (payload) => {
      const { userId, message, ttlSeconds, urgency } = payload as { userId: string; message: Parameters<PushService["sendToUser"]>[1]; ttlSeconds: number; urgency: "normal" | "high" };
      await push.sendToUser(userId, message, { ttlSeconds, urgency });
    },
    email: async () => {
      throw new Error("no email handler registered");
    },
    whatsapp: async () => {
      throw new Error("no whatsapp handler registered");
    },
    ...handlers,
  };

  const all = [
    { name: "outbox", everyMs: 2_000, run: () => dispatchOutbox(outboxHandlers, logger, 20, gaveUp) },
    { name: "presence", everyMs: 15_000, run: () => sweepPresence({ now: new Date(), push }) },
    { name: "unpaid-expiry", everyMs: 30_000, run: () => expireUnpaid() },
    { name: "outbox-recovery", everyMs: 60_000, run: () => recoverStuckOutbox() },
    { name: "reconciliation", everyMs: 10 * 60_000, run: () => reconcile(gateway, logger) },
    ...loops,
  ];

  const timers = all.map(({ name, everyMs, run }) => {
    let running = false;
    return setInterval(() => {
      if (running) return;
      running = true;
      run()
        .catch((error: unknown) => logger.error({ err: error, job: name }, "background job failed"))
        .finally(() => {
          running = false;
        });
    }, everyMs);
  });
  return () => timers.forEach((timer) => clearInterval(timer));
}
