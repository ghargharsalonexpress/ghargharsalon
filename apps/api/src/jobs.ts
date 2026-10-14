import type { Logger } from "./logger";
import type { PaymentGateway } from "./modules/payments/gateway";
import { expireUnpaid, reconcile, refundGaveUp, refundHandler } from "./modules/payments/payments.service";
import { sweepPresence } from "./modules/professionals/professionals.service";
import type { PushService } from "./modules/professionals/push";
import { dispatchOutbox, type OutboxHandlers, recoverStuckOutbox } from "./modules/system/outbox";

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
    ...handlers,
  };

  const all = [
    { name: "outbox", everyMs: 2_000, run: () => dispatchOutbox(outboxHandlers, logger, 20, (type, payload) => (type === "refund" ? refundGaveUp(payload) : Promise.resolve())) },
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
