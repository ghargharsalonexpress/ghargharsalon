import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/**
 * The 4-digit start code (plan C11). Checked through an HMAC; kept encrypted (AES-256-GCM) so
 * the customer can see it again after a reload. Neither form is the code itself.
 */
let secret: Buffer | null = null;

/** Called once at start-up with the session secret (keys are derived, never reused as-is). */
export function configureOtp(sessionSecret: string): void {
  secret = createHash("sha256").update(`otp:${sessionSecret}`).digest();
}

function key(): Buffer {
  if (!secret) throw new Error("configureOtp() has not run");
  return secret;
}

const hmac = (bookingId: string, code: string) => createHmac("sha256", key()).update(`${bookingId}:${code}`).digest("hex");

export function newOtp(bookingId: string): { hash: string; cipher: string; attempts: number; lockedAt: null } {
  const code = String(randomInt(0, 10_000)).padStart(4, "0");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(code, "utf8"), cipher.final()]);
  return { hash: hmac(bookingId, code), cipher: Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url"), attempts: 0, lockedAt: null };
}

export function revealOtp(booking: { _id: unknown; otp: { cipher: string } | null }): string | null {
  if (!booking.otp) return null;
  try {
    const raw = Buffer.from(booking.otp.cipher, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function otpMatches(bookingId: string, hash: string, code: string): boolean {
  const expected = Buffer.from(hmac(bookingId, code));
  const actual = Buffer.from(hash);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
