import type { ClientSession } from "mongoose";
import { model, Schema } from "mongoose";
import type { Logger } from "../../logger";

/**
 * Transactional outbox (plan C4, ADR-0007): side effects that must not be lost (refunds,
 * emails, pushes) are written in the same transaction as the state change, then delivered by
 * the dispatcher with retries. A crash between the two can't drop a refund.
 */
export type OutboxType = "refund" | "email" | "push";

interface OutboxFields {
  type: OutboxType;
  payload: Record<string, unknown>;
  status: "pending" | "processing" | "done" | "failed";
  attempts: number;
  nextAttemptAt: Date;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<OutboxFields>(
  {
    type: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: { type: String, default: "pending" },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, required: true },
    lastError: { type: String, default: null },
  },
  { timestamps: true, minimize: false },
);
schema.index({ status: 1, nextAttemptAt: 1 });
// Delivered items are kept 30 days for support questions.
schema.index({ updatedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60, partialFilterExpression: { status: "done" } });
export const Outbox = model<OutboxFields>("Outbox", schema, "outbox");

export async function enqueue(type: OutboxType, payload: Record<string, unknown>, session?: ClientSession): Promise<void> {
  await Outbox.create([{ type, payload, status: "pending", attempts: 0, nextAttemptAt: new Date() }], { session });
}

export type OutboxHandlers = Record<OutboxType, (payload: Record<string, unknown>) => Promise<void>>;

const MAX_ATTEMPTS = 8;
/** 5 s, 10 s, 20 s … up to about 10 minutes between attempts. */
const backoffMs = (attempts: number) => Math.min(5_000 * 2 ** attempts, 10 * 60_000);

/** Claims due items one at a time (safe with overlapping runs) and delivers them. */
export async function dispatchOutbox(
  handlers: OutboxHandlers,
  logger: Logger,
  limit = 20,
  /** Called once when an item fails for good (e.g. a refund: mark it failed and alert the team). */
  onGiveUp?: (type: OutboxType, payload: Record<string, unknown>) => Promise<void>,
): Promise<number> {
  let delivered = 0;
  for (let index = 0; index < limit; index++) {
    const item = await Outbox.findOneAndUpdate(
      { status: "pending", nextAttemptAt: { $lte: new Date() } },
      { $set: { status: "processing" }, $inc: { attempts: 1 } },
      { sort: { nextAttemptAt: 1 }, returnDocument: "after" },
    ).lean();
    if (!item) break;
    try {
      await handlers[item.type](item.payload);
      await Outbox.updateOne({ _id: item._id }, { $set: { status: "done", lastError: null } });
      delivered++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const failed = item.attempts >= MAX_ATTEMPTS;
      await Outbox.updateOne(
        { _id: item._id },
        { $set: { status: failed ? "failed" : "pending", lastError: message.slice(0, 500), nextAttemptAt: new Date(Date.now() + backoffMs(item.attempts)) } },
      );
      logger[failed ? "error" : "warn"]({ type: item.type, attempts: item.attempts, err: message }, failed ? "outbox item failed for good" : "outbox item will retry");
      if (failed && onGiveUp) await onGiveUp(item.type, item.payload).catch((hookError: unknown) => logger.error({ err: hookError, type: item.type }, "outbox give-up hook failed"));
    }
  }
  return delivered;
}

/** Items left "processing" by a crash go back to the queue after 2 minutes. */
export async function recoverStuckOutbox(): Promise<void> {
  await Outbox.updateMany({ status: "processing", updatedAt: { $lt: new Date(Date.now() - 2 * 60_000) } }, { $set: { status: "pending", nextAttemptAt: new Date() } });
}
