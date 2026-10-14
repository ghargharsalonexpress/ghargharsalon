import i18n from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/i18n/locales/en/common.json";
import hi from "@/i18n/locales/hi/common.json";
import { durationText } from "./duration";

describe("durationText", () => {
  const t = i18n.createInstance();
  beforeAll(async () => {
    await t.init({ lng: "en", resources: { en: { common: en }, hi: { common: hi } }, interpolation: { escapeValue: false } });
  });

  it("reads like people say it", () => {
    const en = t.getFixedT("en");
    expect(durationText(en, 45)).toBe("45 min");
    expect(durationText(en, 60)).toBe("1 hr");
    expect(durationText(en, 90)).toBe("1 hr 30 min");
  });

  it("has Hindi forms", () => {
    const hindi = t.getFixedT("hi");
    expect(durationText(hindi, 120)).toBe("2 घंटे");
    expect(durationText(hindi, 75)).toBe("1 घंटा 15 मिनट");
    expect(durationText(hindi, 150)).toBe("2 घंटे 30 मिनट");
  });
});
