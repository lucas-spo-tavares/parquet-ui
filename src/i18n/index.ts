import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en, type TranslationSchema } from "./locales/en";
import { resources } from "./resources";

export const supportedLanguages = ["en", "pt", "es"] as const;
export type AppLanguage = (typeof supportedLanguages)[number];

export const languageOptions: Array<{ code: AppLanguage; label: string }> = [
  { code: "en", label: "English" },
  { code: "pt", label: "Português" },
  { code: "es", label: "Español" },
];

const STORAGE_KEY = "parquet-ui-language";
const fallbackLanguage: AppLanguage = "en";

function resolveLanguage(value?: string | null): AppLanguage | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  return supportedLanguages.find((language) => normalized === language || normalized.startsWith(`${language}-`));
}

function detectInitialLanguage() {
  const storedLanguage = typeof window !== "undefined" ? resolveLanguage(window.localStorage.getItem(STORAGE_KEY)) : undefined;
  if (storedLanguage) return storedLanguage;

  if (typeof navigator !== "undefined") {
    for (const candidate of navigator.languages) {
      const resolved = resolveLanguage(candidate);
      if (resolved) return resolved;
    }

    const resolved = resolveLanguage(navigator.language);
    if (resolved) return resolved;
  }

  return fallbackLanguage;
}

void i18n.use(initReactI18next).init({
  resources,
  lng: detectInitialLanguage(),
  fallbackLng: fallbackLanguage,
  interpolation: {
    escapeValue: false,
  },
});

i18n.on("languageChanged", (language) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, language);
  }
});

export default i18n;

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: {
      translation: TranslationSchema;
    };
  }
}
