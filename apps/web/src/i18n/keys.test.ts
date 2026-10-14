import { describe, expect, it } from "vitest";

/**
 * Static checks on the strings (plan C3): every literal key the code asks for exists in English
 * (and in Hindi, except the English-only admin), and a key written only in plural forms is
 * always given a count, or the screen shows the raw key (as "booking.reviewValue" once did).
 */

const localeFiles = import.meta.glob<Record<string, unknown>>("./locales/*/*.json", { eager: true, import: "default" });
const sourceFiles = import.meta.glob<string>(["../**/*.{ts,tsx}", "!../**/*.test.ts", "!../features/styleguide/**"], { eager: true, query: "?raw", import: "default" });

function flatten(node: unknown, path: string[] = [], out = new Set<string>()): Set<string> {
  if (node && typeof node === "object") for (const [key, value] of Object.entries(node)) flatten(value, [...path, key], out);
  else out.add(path.join("."));
  return out;
}

function strings(lang: string): Map<string, Set<string>> {
  const table = new Map<string, Set<string>>();
  for (const [path, json] of Object.entries(localeFiles)) {
    const match = /\/locales\/(\w+)\/(\w+)\.json$/.exec(path);
    if (match?.[1] === lang && match[2]) table.set(match[2], flatten(json));
  }
  return table;
}

const en = strings("en");
const hi = strings("hi");
const PLURAL = /_(zero|one|two|few|many|other)$/;
const has = (table: Map<string, Set<string>>, ns: string, key: string) => {
  const keys = table.get(ns) ?? new Set<string>();
  return keys.has(key) || [...keys].some((item) => item.startsWith(`${key}_`) || item.startsWith(`${key}.`));
};
const pluralOnly = (ns: string, key: string) => {
  const keys = en.get(ns) ?? new Set<string>();
  return !keys.has(key) && [...keys].some((item) => PLURAL.test(item) && item.replace(PLURAL, "") === key);
};

/** Literal t("key", { …options }) calls, with the namespace of the file's useTranslation(). */
const calls = Object.entries(sourceFiles).flatMap(([file, text]) => {
  const defaultNs = /useTranslation\(\s*(?:\[\s*)?["'](\w+)["']/.exec(text)?.[1] ?? "common";
  return [...text.matchAll(/\bt\(\s*["']([A-Za-z0-9_.:]+)["']\s*(?:,\s*\{([^}]*)\})?/g)].map((match) => {
    const name = match[1] ?? "";
    const split = name.indexOf(":");
    const [ns, key]: [string, string] = split > 0 ? [name.slice(0, split), name.slice(split + 1)] : [defaultNs, name];
    const line = text.slice(0, match.index).split("\n").length;
    return { where: `${file.replace(/^\.\.\//, "src/")}:${line}`, ns, key, options: match[2] ?? "" };
  });
});

describe("strings in the code", () => {
  it("finds the calls to check", () => {
    expect(en.size).toBeGreaterThan(5);
    expect(calls.length).toBeGreaterThan(500);
  });

  it("exist in English, and in Hindi outside the admin", () => {
    const missing = calls.filter(({ ns, key }) => !has(en, ns, key) || (ns !== "admin" && !has(hi, ns, key))).map(({ where, ns, key }) => `${where} ${ns}:${key}`);
    expect(missing).toEqual([]);
  });

  it("pass a count for keys written only in plural forms", () => {
    const withoutCount = calls.filter(({ ns, key, options }) => pluralOnly(ns, key) && !/\bcount\b/.test(options)).map(({ where, ns, key }) => `${where} ${ns}:${key}`);
    expect(withoutCount).toEqual([]);
  });
});
