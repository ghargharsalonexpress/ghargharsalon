/** Indian mobile numbers: 10 digits starting with 6–9. */
export const isIndianMobile = (digits: string): boolean => /^[6-9]\d{9}$/.test(digits);

/**
 * Keeps the ten national digits of an Indian mobile number.
 * Handles pasted "+91 98765-43210", "919876543210" and the trunk prefix "09876543210",
 * while an extra keystroke on a complete number is simply ignored.
 */
export function mobileDigits(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (input.trim().startsWith("+") && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

/** Shows "98765 43210" while storing "9876543210". The +91 prefix is shown separately. */
export function formatIndianMobile(digits: string): string {
  const clean = digits.replace(/\D/g, "").slice(0, 10);
  return clean.length > 5 ? `${clean.slice(0, 5)} ${clean.slice(5)}` : clean;
}
