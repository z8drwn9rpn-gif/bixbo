import { EN } from "./i18n/en";
import { SK } from "./i18n/sk";

export type AppLanguage = "en" | "sk";
const TRANSLATIONS: Record<AppLanguage, Record<string, string>> = { en: EN, sk: SK };
export function normalizeLanguage(value: unknown): AppLanguage { return value === "sk" ? "sk" : "en"; }
export function translate(language: AppLanguage, key: string): string { const dictionary = TRANSLATIONS[language] ?? EN; return dictionary[key] ?? key; }
