import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dropLegacyEmailIndex, ensureIndexes, LEGACY_EMAIL_INDEX } from "../src/db";
import { duplicatePhones, User } from "../src/modules/users/user.model";
import { createUser, startTestApp, type TestContext, uniquePhone } from "./helpers";

/** A database from before mobile login (ADR-0020), moved over as scripts/migrate-otp-login.ts does. */
let ctx: TestContext;
beforeAll(async () => {
  ctx = await startTestApp();
});
afterAll(() => ctx.close());

const indexNames = async () => (await User.collection.indexes()).map((index) => index.name);

describe("moving an existing database to mobile login", () => {
  it("only adds indexes on start-up, warns about the old email index, and the migration removes it", async () => {
    // As the database was: email unique for everyone, no phone index.
    await User.collection.dropIndex("email_unique_when_set");
    await User.collection.dropIndex("phone_1");
    await User.collection.createIndex({ email: 1 }, { unique: true, name: LEGACY_EMAIL_INDEX });

    const warnings: string[] = [];
    await ensureIndexes((message) => warnings.push(message));
    expect(warnings.join(" ")).toContain(LEGACY_EMAIL_INDEX);
    // Start-up never drops: an older API on the same database keeps its index.
    expect(await indexNames()).toEqual(expect.arrayContaining([LEGACY_EMAIL_INDEX, "email_unique_when_set", "phone_1"]));

    // While the old index stays, a second account without an email is refused.
    await createUser({ email: null });
    await expect(createUser({ email: null })).rejects.toMatchObject({ code: 11000 });

    expect(await dropLegacyEmailIndex()).toBe(true);
    expect(await dropLegacyEmailIndex()).toBe(false);
    expect(await indexNames()).not.toContain(LEGACY_EMAIL_INDEX);
    await createUser({ email: null });
    // Real emails stay unique.
    await createUser({ email: "same@example.com" });
    await expect(createUser({ email: "same@example.com" })).rejects.toMatchObject({ code: 11000 });
  });

  it("finds numbers used by two accounts, which block the unique phone index", async () => {
    await User.collection.dropIndex("phone_1");
    const phone = uniquePhone();
    await createUser({ phone });
    await createUser({ phone });
    expect(await duplicatePhones()).toEqual([expect.objectContaining({ phone })]);

    const warnings: string[] = [];
    await ensureIndexes((message) => warnings.push(message));
    expect(warnings.join(" ")).toContain("belong to more than one account");
    expect(await indexNames()).not.toContain("phone_1");
  });
});
