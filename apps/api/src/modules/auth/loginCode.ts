import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { LOGIN_CODE_LENGTH, LOGIN_CODE_TIMING } from "@brand/shared";
import { model, Schema } from "mongoose";
import { AppError } from "../../errors";

/**
 * SMS login codes (ADR-0020). One document per phone number holds the current code (as an
 * HMAC, never the code itself) and the counters behind the send limits, in the database so
 * they hold across restarts and API instances.
 */
interface LoginCodeFields {
  phone: string;
  /** HMAC of the current code; null once it was used, or locked after too many wrong tries. */
  codeHash: string | null;
  expiresAt: Date;
  /** Wrong tries on the current code. */
  attempts: number;
  lastSentAt: Date;
  windowStart: Date;
  windowSends: number;
  dayStart: Date;
  daySends: number;
  /** The document goes a day after the last send (TTL), taking the counters with it. */
  purgeAt: Date;
}

const loginCodeSchema = new Schema<LoginCodeFields>(
  {
    phone: { type: String, required: true },
    codeHash: { type: String, default: null },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    lastSentAt: { type: Date, required: true },
    windowStart: { type: Date, required: true },
    windowSends: { type: Number, default: 0 },
    dayStart: { type: Date, required: true },
    daySends: { type: Number, default: 0 },
    purgeAt: { type: Date, required: true },
  },
  { timestamps: true },
);

loginCodeSchema.index({ phone: 1 }, { unique: true });
loginCodeSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

export const LoginCode = model<LoginCodeFields>("LoginCode", loginCodeSchema, "login_codes");

const MINUTE = 60_000;
export const LOGIN_CODE_LIMITS = {
  /** Wrong tries before the code stops working. */
  attempts: 5,
  windowMs: 15 * MINUTE,
  sendsPerWindow: 3,
  dayMs: 24 * 60 * MINUTE,
  sendsPerDay: 10,
} as const;

const retryAfter = (until: number, now: number) => Math.max(1, Math.ceil((until - now) / 1000));

/**
 * `rateLimits: false` (E2E only) drops the resend wait and the per-number send limits; the
 * five-wrong-tries lock always applies.
 */
export function createLoginCodes({ sessionSecret, rateLimits }: { sessionSecret: string; rateLimits: boolean }) {
  const key = createHash("sha256").update(`login-code:${sessionSecret}`).digest();
  const hmac = (phone: string, code: string) => createHmac("sha256", key).update(`${phone}:${code}`).digest("hex");

  const matches = (hash: string, phone: string, code: string) => {
    const expected = Buffer.from(hmac(phone, code));
    const actual = Buffer.from(hash);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  };

  /** A new code for this number (any older one stops working), within the send limits. */
  async function issue(phone: string): Promise<{ code: string; expiresAt: Date }> {
    const now = Date.now();
    const current = await LoginCode.findOne({ phone }).lean();

    let windowStart = current?.windowStart.getTime() ?? now;
    let windowSends = current?.windowSends ?? 0;
    let dayStart = current?.dayStart.getTime() ?? now;
    let daySends = current?.daySends ?? 0;
    if (now - windowStart >= LOGIN_CODE_LIMITS.windowMs) [windowStart, windowSends] = [now, 0];
    if (now - dayStart >= LOGIN_CODE_LIMITS.dayMs) [dayStart, daySends] = [now, 0];

    if (rateLimits && current) {
      const resendAt = current.lastSentAt.getTime() + LOGIN_CODE_TIMING.resendSeconds * 1000;
      if (now < resendAt) throw new AppError("RATE_LIMITED", { retryAfterSeconds: retryAfter(resendAt, now), detail: "login-code-resend" });
      if (daySends >= LOGIN_CODE_LIMITS.sendsPerDay) {
        throw new AppError("RATE_LIMITED", { retryAfterSeconds: retryAfter(dayStart + LOGIN_CODE_LIMITS.dayMs, now), detail: "login-code-day" });
      }
      if (windowSends >= LOGIN_CODE_LIMITS.sendsPerWindow) {
        throw new AppError("RATE_LIMITED", { retryAfterSeconds: retryAfter(windowStart + LOGIN_CODE_LIMITS.windowMs, now), detail: "login-code-window" });
      }
    }

    const code = String(randomInt(0, 10 ** LOGIN_CODE_LENGTH)).padStart(LOGIN_CODE_LENGTH, "0");
    const expiresAt = new Date(now + LOGIN_CODE_TIMING.expiresSeconds * 1000);
    await LoginCode.updateOne(
      { phone },
      {
        $set: {
          codeHash: hmac(phone, code),
          expiresAt,
          attempts: 0,
          lastSentAt: new Date(now),
          windowStart: new Date(windowStart),
          windowSends: windowSends + 1,
          dayStart: new Date(dayStart),
          daySends: daySends + 1,
          purgeAt: new Date(now + LOGIN_CODE_LIMITS.dayMs),
        },
      },
      { upsert: true },
    );
    return { code, expiresAt };
  }

  /**
   * Uses up the code if it's right. Each try is counted before the comparison, so parallel
   * guesses can't get more than five looks at one code.
   */
  async function verify(phone: string, code: string): Promise<void> {
    const now = new Date();
    const counted = await LoginCode.findOneAndUpdate(
      { phone, codeHash: { $ne: null }, expiresAt: { $gt: now }, attempts: { $lt: LOGIN_CODE_LIMITS.attempts } },
      { $inc: { attempts: 1 } },
      { returnDocument: "after" },
    ).lean();

    if (!counted?.codeHash) {
      const current = await LoginCode.findOne({ phone }).lean();
      if (current && current.attempts >= LOGIN_CODE_LIMITS.attempts) throw new AppError("LOGIN_CODE_LOCKED");
      throw new AppError("LOGIN_CODE_EXPIRED");
    }

    if (matches(counted.codeHash, phone, code)) {
      // Only one request can use the code.
      const used = await LoginCode.updateOne({ _id: counted._id, codeHash: counted.codeHash }, { $set: { codeHash: null } });
      if (used.modifiedCount === 0) throw new AppError("LOGIN_CODE_EXPIRED");
      return;
    }

    if (counted.attempts >= LOGIN_CODE_LIMITS.attempts) {
      await LoginCode.updateOne({ _id: counted._id, codeHash: counted.codeHash }, { $set: { codeHash: null } });
      throw new AppError("LOGIN_CODE_LOCKED");
    }
    throw new AppError("LOGIN_CODE_INVALID", { fields: { code: "validation.loginCodeWrong" } });
  }

  return { issue, verify };
}

export type LoginCodes = ReturnType<typeof createLoginCodes>;
