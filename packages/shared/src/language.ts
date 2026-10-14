export const LANGUAGES = ["en", "hi"] as const;
export type Language = (typeof LANGUAGES)[number];

export const isLanguage = (value: unknown): value is Language => value === "en" || value === "hi";
