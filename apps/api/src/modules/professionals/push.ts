import type { PushPayload, PushSubscriptionInput } from "@brand/shared";
import { model, Schema, type Types } from "mongoose";
import webpush from "web-push";
import type { Config } from "../../config";
import type { Logger } from "../../logger";

interface PushSubscriptionFields {
  userId: Types.ObjectId;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent: string;
  lastSuccessAt: Date | null;
  failures: number;
  createdAt: Date;
  updatedAt: Date;
}

const pushSubscriptionSchema = new Schema<PushSubscriptionFields>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    endpoint: { type: String, required: true },
    keys: { p256dh: { type: String, required: true }, auth: { type: String, required: true } },
    userAgent: { type: String, default: "" },
    lastSuccessAt: { type: Date, default: null },
    failures: { type: Number, default: 0 },
  },
  { timestamps: true },
);
pushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });
pushSubscriptionSchema.index({ userId: 1 });

export const PushSubscription = model<PushSubscriptionFields>("PushSubscription", pushSubscriptionSchema, "push_subscriptions");

export interface PushOptions {
  /** Seconds the push service keeps trying (offers: 30, plan C6). */
  ttlSeconds: number;
  urgency: "very-low" | "low" | "normal" | "high";
}

export interface PushTarget {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Delivers one encrypted message to one browser; resolves with the push service's status. */
export interface PushSender {
  send(target: PushTarget, payload: string, options: PushOptions): Promise<number>;
}

/** Real delivery through the browsers' push services, signed with our VAPID keys. */
export class WebPushSender implements PushSender {
  constructor(private readonly config: Config) {}

  async send(target: PushTarget, payload: string, options: PushOptions): Promise<number> {
    const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = this.config;
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) throw new Error("VAPID keys are not configured");
    try {
      const result = await webpush.sendNotification(target, payload, {
        TTL: options.ttlSeconds,
        urgency: options.urgency,
        vapidDetails: { subject: VAPID_SUBJECT, publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY },
        timeout: 10_000,
      });
      return result.statusCode;
    } catch (error) {
      // A 404/410 means the subscription is gone; other errors are retried on the next alert.
      if (error instanceof webpush.WebPushError) return error.statusCode;
      throw error;
    }
  }
}

/** Development without keys: the alert is written to the log instead of a phone. */
export class LogPushSender implements PushSender {
  constructor(private readonly logger: Logger) {}

  async send(target: PushTarget, payload: string): Promise<number> {
    this.logger.info({ endpoint: target.endpoint.slice(0, 48), payload: JSON.parse(payload) as unknown }, "push (log transport)");
    return 201;
  }
}

/** Tests: keeps every message; endpoints listed in `gone` answer 410 like an expired subscription. */
export class MemoryPushSender implements PushSender {
  readonly sent: Array<{ endpoint: string; payload: PushPayload; options: PushOptions }> = [];
  readonly gone = new Set<string>();

  async send(target: PushTarget, payload: string, options: PushOptions): Promise<number> {
    if (this.gone.has(target.endpoint)) return 410;
    this.sent.push({ endpoint: target.endpoint, payload: JSON.parse(payload) as PushPayload, options });
    return 201;
  }

  to(endpoint: string): PushPayload[] {
    return this.sent.filter((message) => message.endpoint === endpoint).map((message) => message.payload);
  }
}

export function createPushSender(config: Config, logger: Logger): PushSender {
  if (config.pushTransport === "webpush") return new WebPushSender(config);
  if (config.pushTransport === "memory") return new MemoryPushSender();
  return new LogPushSender(logger);
}

export interface PushResult {
  sent: number;
  removed: number;
  failed: number;
}

/**
 * Sends to every device of a person (plan C10). Gone subscriptions are deleted; failures are
 * counted so the admin can see a phone that stopped receiving alerts.
 */
export function createPushService({ config, sender, logger }: { config: Config; sender: PushSender; logger: Logger }) {
  const publicKey = config.pushTransport === "log" ? null : (config.VAPID_PUBLIC_KEY ?? "test-public-key");

  async function sendToUser(userId: Types.ObjectId | string, payload: PushPayload, options: PushOptions): Promise<PushResult> {
    const subscriptions = await PushSubscription.find({ userId }).lean();
    const result: PushResult = { sent: 0, removed: 0, failed: 0 };
    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          const status = await sender.send({ endpoint: subscription.endpoint, keys: subscription.keys }, JSON.stringify(payload), options);
          if (status === 404 || status === 410) {
            await PushSubscription.deleteOne({ _id: subscription._id });
            result.removed++;
          } else if (status >= 200 && status < 300) {
            await PushSubscription.updateOne({ _id: subscription._id }, { $set: { lastSuccessAt: new Date(), failures: 0 } });
            result.sent++;
          } else {
            await PushSubscription.updateOne({ _id: subscription._id }, { $inc: { failures: 1 } });
            result.failed++;
          }
        } catch (error) {
          logger.warn({ err: error, userId: String(userId) }, "push failed");
          await PushSubscription.updateOne({ _id: subscription._id }, { $inc: { failures: 1 } });
          result.failed++;
        }
      }),
    );
    return result;
  }

  /** Saves (or moves to this person) a browser's subscription. */
  async function subscribe(userId: Types.ObjectId, input: PushSubscriptionInput, userAgent: string): Promise<number> {
    await PushSubscription.findOneAndUpdate(
      { endpoint: input.endpoint },
      { $set: { userId, keys: input.keys, userAgent: userAgent.slice(0, 300), failures: 0 } },
      { upsert: true },
    );
    return PushSubscription.countDocuments({ userId });
  }

  async function unsubscribe(userId: Types.ObjectId, endpoint: string): Promise<number> {
    await PushSubscription.deleteOne({ userId, endpoint });
    return PushSubscription.countDocuments({ userId });
  }

  return { publicKey, sender, sendToUser, subscribe, unsubscribe };
}

export type PushService = ReturnType<typeof createPushService>;
