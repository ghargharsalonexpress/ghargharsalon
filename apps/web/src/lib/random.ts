/**
 * A random URL-safe key (e.g. an Idempotency-Key). crypto.getRandomValues also works on plain
 * http over a LAN address, where crypto.randomUUID is missing (testing on a phone).
 */
export function randomKey(bytes = 16): string {
  const values = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
}
