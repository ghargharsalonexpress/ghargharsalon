import { describe, expect, it } from "vitest";
import { completeSignupSchema, loginSchema, resetPasswordSchema, sendCodeSchema, updateMeSchema, verifyCodeSchema } from "./auth";

const firstMessage = (result: { success: boolean; error?: { issues: Array<{ path: PropertyKey[]; message: string }> } }, path: string) =>
  result.error?.issues.find((issue) => issue.path.join(".") === path)?.message;

describe("login by SMS code", () => {
  it("needs a 10-digit mobile number", () => {
    expect(sendCodeSchema.safeParse({ phone: "9876543210" }).success).toBe(true);
    expect(firstMessage(sendCodeSchema.safeParse({ phone: "" }), "phone")).toBe("validation.required");
    expect(firstMessage(sendCodeSchema.safeParse({ phone: "1123456789" }), "phone")).toBe("validation.phone");
  });

  it("needs a 6-digit code", () => {
    expect(verifyCodeSchema.safeParse({ phone: "9876543210", code: "042917" }).success).toBe(true);
    expect(firstMessage(verifyCodeSchema.safeParse({ phone: "9876543210", code: "" }), "code")).toBe("validation.required");
    for (const code of ["12345", "1234567", "12a456"]) {
      expect(firstMessage(verifyCodeSchema.safeParse({ phone: "9876543210", code }), "code")).toBe("validation.loginCode");
    }
  });

  it("asks a new number for a name, with the email optional and normalised", () => {
    expect(completeSignupSchema.parse({ name: "Priya Sharma" }).email).toBeUndefined();
    expect(completeSignupSchema.parse({ name: "Priya Sharma", email: "  " }).email).toBeNull();
    // What the web's own parse produced is accepted again by the API.
    expect(completeSignupSchema.parse({ name: "Priya Sharma", email: null }).email).toBeNull();
    expect(completeSignupSchema.parse({ name: "Priya Sharma", email: "Priya@Example.com " }).email).toBe("priya@example.com");
    expect(firstMessage(completeSignupSchema.safeParse({ name: "Priya Sharma", email: "priya@" }), "email")).toBe("validation.email");
    expect(firstMessage(completeSignupSchema.safeParse({ name: "" }), "name")).toBe("validation.required");
  });

  it("never takes a phone or a role in the name step (blocks injection)", () => {
    for (const extra of [{ phone: "9876543210" }, { role: "admin" }]) {
      const result = completeSignupSchema.safeParse({ name: "Priya Sharma", ...extra });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.code).toBe("unrecognized_keys");
    }
  });

  it("rejects non-string values such as Mongo operators", () => {
    expect(loginSchema.safeParse({ email: { $ne: "" }, password: { $gt: "" } }).success).toBe(false);
    expect(verifyCodeSchema.safeParse({ phone: { $ne: "" }, code: { $gt: "" } }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("accepts a base64url token", () => {
    const token = "a".repeat(43);
    expect(resetPasswordSchema.safeParse({ token, password: "long enough pass" }).success).toBe(true);
  });

  it("rejects tokens with unexpected characters", () => {
    expect(resetPasswordSchema.safeParse({ token: `${"a".repeat(40)}$%^`, password: "long enough pass" }).success).toBe(false);
  });
});

describe("updateMeSchema", () => {
  it("needs at least one field", () => {
    expect(updateMeSchema.safeParse({}).success).toBe(false);
    expect(updateMeSchema.safeParse({ locale: "hi" }).success).toBe(true);
  });

  it("can add or remove the email, but never changes the phone (it is the login)", () => {
    expect(updateMeSchema.parse({ email: "neha@example.com" }).email).toBe("neha@example.com");
    expect(updateMeSchema.parse({ email: "" }).email).toBeNull();
    expect(updateMeSchema.safeParse({ phone: "9876543210" }).success).toBe(false);
  });
});
