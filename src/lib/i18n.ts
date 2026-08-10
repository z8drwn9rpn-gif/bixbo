export type AppLanguage = "en" | "sk";

export type TranslationKey =
  | "nav.home"
  | "nav.overview"
  | "nav.log"
  | "nav.couple"
  | "nav.note"
  | "nav.patterns"
  | "nav.medications"
  | "nav.healthProfile"
  | "nav.settings"
  | "profile.language.title"
  | "profile.language.subtitle"
  | "profile.language.appLanguage"
  | "profile.language.english"
  | "profile.language.slovak"
  | "profile.hub.languageTitle"
  | "profile.hub.languageSubtitle";

const EN: Record<TranslationKey, string> = {
  "nav.home": "Home",
  "nav.overview": "Overview",
  "nav.log": "Log",
  "nav.couple": "Couple",
  "nav.note": "Note",
  "nav.patterns": "Patterns",
  "nav.medications": "Medications",
  "nav.healthProfile": "Health profile",
  "nav.settings": "Settings",
  "profile.language.title": "Language",
  "profile.language.subtitle": "Choose the language used by the BIXBO interface.",
  "profile.language.appLanguage": "App language",
  "profile.language.english": "English",
  "profile.language.slovak": "Slovenčina",
  "profile.hub.languageTitle": "Language",
  "profile.hub.languageSubtitle": "App language",
};

const SK: Record<TranslationKey, string> = {
  "nav.home": "Domov",
  "nav.overview": "Prehľad",
  "nav.log": "Záznam",
  "nav.couple": "Pár",
  "nav.note": "Poznámky",
  "nav.patterns": "Vzorce",
  "nav.medications": "Lieky",
  "nav.healthProfile": "Zdravotný profil",
  "nav.settings": "Nastavenia",
  "profile.language.title": "Jazyk",
  "profile.language.subtitle": "Vyber jazyk rozhrania BIXBO.",
  "profile.language.appLanguage": "Jazyk aplikácie",
  "profile.language.english": "English",
  "profile.language.slovak": "Slovenčina",
  "profile.hub.languageTitle": "Jazyk",
  "profile.hub.languageSubtitle": "Jazyk aplikácie",
};

const TRANSLATIONS: Record<AppLanguage, Record<TranslationKey, string>> = {
  en: EN,
  sk: SK,
};

export function normalizeLanguage(value: unknown): AppLanguage {
  return value === "sk" ? "sk" : "en";
}

export function translate(language: AppLanguage, key: TranslationKey): string {
  return TRANSLATIONS[language]?.[key] ?? TRANSLATIONS.en[key] ?? key;
}
