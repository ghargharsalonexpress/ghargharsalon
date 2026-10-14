import { isLanguage, type Language, LANGUAGES } from "@brand/shared";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enCommon from "./locales/en/common.json";
import hiCommon from "./locales/hi/common.json";

export const SUPPORTED_LANGUAGES = LANGUAGES;
export { isLanguage, type Language };

const STORAGE_KEY = "lang";

/**
 * Detection order (plan C3): saved choice → browser language → English. Once someone
 * signs in, their profile language takes over (app/LanguageSync.tsx).
 */
function detectLanguage(): Language {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (isLanguage(saved)) return saved;
  } catch {
    // Storage can be unavailable (private mode); fall through to the browser language.
  }
  return window.navigator.language?.toLowerCase().startsWith("hi") ? "hi" : "en";
}

function syncDocument(language: string) {
  document.documentElement.lang = language;
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Not critical: the choice simply won't persist.
  }
}

void i18n.use(initReactI18next).init({
  // Shared strings only; feature namespaces load with their routes (see namespaces.ts).
  resources: {
    en: { common: enCommon },
    hi: { common: hiCommon },
  },
  partialBundledLanguages: true,
  lng: detectLanguage(),
  fallbackLng: "en",
  ns: ["common"],
  defaultNS: "common",
  interpolation: { escapeValue: false },
  returnNull: false,
});

syncDocument(i18n.language);
i18n.on("languageChanged", syncDocument);

export default i18n;
