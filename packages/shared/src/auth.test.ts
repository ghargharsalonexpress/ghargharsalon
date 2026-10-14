import { describe, expect, it } from "vitest";
import { loginSchema, resetPasswordSchema, signupSchema, updateMeSchema } from "./auth";

const firstMessage = (result: { success: boolean; error?: { issues: Array<{ path: PropertyKey[]; message: string }> } }, path: string) =>
  result.error?.issues.find((issue) => issue.path.join(".") === path)?.message;

const valid = { name: "Priya Sharma", phone: "9876543210", email: "Priya@Example.com ", password: "correct horse battery" };

describe("signupSchema", () => {
  it("accepts a valid sign-up and normalises the email", () => {
    const result = signupSchema.safeParse(valid);
    expect(result.success).toBe(true);
    expect(result.data?.email).toBe("priya@example.com");
  });

  it("reports one message key per field, required before format", () => {
    const result = signupSchema.safeParse({ name: "", phone: "", email: "", password: "" });
    expect(result.success).toBe(false);
    expect(firstMessage(result, "name")).toBe("validation.required");
    expect(firstMessage(result, "phone")).toBe("validation.required");
    expect(firstMessage(result, "email")).toBe("validation.required");
    expect(firstMessage(result, "password")).toBe("validation.passwordShort");
  });

  it("rejects a bad email, a landline and a short password", () => {
    const result = signupSchema.safeParse({ ...valid, email: "priya@", phone: "1123456789", password: "short" });
    expect(firstMessage(result, "email")).toBe("validation.email");
    expect(firstMessage(result, "phone")).toBe("validation.phone");
    expect(firstMessage(result, "password")).toBe("validation.passwordShort");
  });

  it("rejects unknown fields (blocks operator injection such as role)", () => {
    const result = signupSchema.safeParse({ ...valid, role: "admin" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.code).toBe("unrecognized_keys");
  });

  it("rejects non-string values such as Mongo operators", () => {
    const result = loginSchema.safeParse({ email: { $ne: "" }, password: { $gt: "" } });
    expect(result.success).toBe(false);
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
});
