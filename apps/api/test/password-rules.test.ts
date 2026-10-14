import { describe, expect, it } from "vitest";
import { hashPassword, passwordProblem, verifyPassword } from "../src/modules/auth/password";

describe("passwordProblem", () => {
  it.each([
    "password123",
    "P@ssw0rd!",
    "Qwerty@123",
    "Krishna@123",
    "jaimatadi1",
    "12345678",
    "98765432",
    "11112222",
    "aaaaaaaaaa",
    "abcdefghij",
    "asdfghjkl",
  ])("rejects %s", (password) => {
    expect(passwordProblem(password)).toBe("validation.passwordWeak");
  });

  it("rejects passwords built from the person's own details", () => {
    expect(passwordProblem("priya.sharma88", { email: "priya.sharma@example.com" })).toBe("validation.passwordWeak");
    expect(passwordProblem("my9876543210", { phone: "9876543210" })).toBe("validation.passwordWeak");
    expect(passwordProblem("Priya@2024", { name: "Priya Sharma" })).toBe("validation.passwordWeak");
  });

  it.each(["lantern-orchid-91-river", "correct horse battery staple", "Tea at 4 with Ammi!", "84736251"])("accepts %s", (password) => {
    expect(passwordProblem(password, { email: "neha@example.com", name: "Neha Kapoor", phone: "9876543210" })).toBeNull();
  });
});

describe("argon2id hashing", () => {
  it("verifies the right password only, and never stores it in clear", async () => {
    const hash = await hashPassword("lantern-orchid-91-river");
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(await verifyPassword(hash, "lantern-orchid-91-river")).toBe(true);
    expect(await verifyPassword(hash, "lantern-orchid-91-rivers")).toBe(false);
    expect(await verifyPassword("not-a-hash", "anything")).toBe(false);
  });
});
