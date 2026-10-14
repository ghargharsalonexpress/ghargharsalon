import { V } from "@brand/shared";
import { hash, verify } from "@node-rs/argon2";
import { COMMON_PASSWORDS, WEAK_BASE_WORDS } from "./common-passwords";

/** Argon2id (algorithm 2) with OWASP's minimum: 19 MiB memory, 2 passes, 1 lane (plan C11). */
const ARGON2 = { algorithm: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export const hashPassword = (password: string): Promise<string> => hash(password, ARGON2);

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | undefined;

/** Spends the same time as a real check when the email is unknown, so timing doesn't reveal accounts. */
export async function burnPasswordCheck(password: string): Promise<false> {
  dummyHash ??= hashPassword("unknown-account-placeholder-password");
  await verifyPassword(await dummyHash, password);
  return false;
}

const SEQUENCES = ["0123456789", "9876543210", "abcdefghijklmnopqrstuvwxyz", "qwertyuiop", "asdfghjkl", "zxcvbnm"];

const isSequenceRun = (value: string): boolean => SEQUENCES.some((sequence) => value.length >= 6 && sequence.includes(value));

/** Leading/trailing digits and symbols dropped, then leetspeak undone: "Krishna@123" → "krishna", "P@ssw0rd1!" → "password". */
function core(password: string): string {
  return password
    .toLowerCase()
    .replace(/^[^a-z]+/, "")
    .replace(/[^a-z]+$/, "")
    .replace(/[@4]/g, "a")
    .replace(/3/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/0/g, "o")
    .replace(/[$5]/g, "s");
}

/**
 * The length rule is in the shared schema; this adds what only the server should judge
 * (plan C11). Returns a validation message key, or null when the password is acceptable.
 */
export function passwordProblem(password: string, context: { email?: string; name?: string; phone?: string } = {}): string | null {
  const lower = password.toLowerCase();
  const compact = lower.replace(/[\s._-]+/g, "");
  const letters = core(password);

  if (COMMON_PASSWORDS.has(lower) || COMMON_PASSWORDS.has(compact) || COMMON_PASSWORDS.has(letters)) return V.passwordWeak;
  if (WEAK_BASE_WORDS.has(letters)) return V.passwordWeak;
  if (/^(.)\1+$/.test(compact)) return V.passwordWeak;
  if (/^\d+$/.test(compact) && (isSequenceRun(compact) || new Set(compact).size <= 3)) return V.passwordWeak;
  if (isSequenceRun(compact) || isSequenceRun(letters)) return V.passwordWeak;

  const emailLocal = context.email?.split("@")[0]?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (emailLocal && emailLocal.length >= 4 && compact.includes(emailLocal)) return V.passwordWeak;
  if (context.phone && compact.includes(context.phone)) return V.passwordWeak;
  const firstName = context.name?.trim().split(/\s+/)[0]?.toLowerCase();
  if (firstName && firstName.length >= 4 && letters === firstName) return V.passwordWeak;

  return null;
}
