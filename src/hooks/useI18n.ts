import { useEffect, useMemo } from "react";
import { useBixbo } from "@/lib/storage";
import { normalizeLanguage, translate, type AppLanguage } from "@/lib/i18n";

const HIDDEN_HELPER_COPY = new Set([
  "Tap to edit",
  "Tap to close",
  "Tap any pain bar to see the exact value.",
  "Tap a bar to see its value.",
  "Tap to mark taken",
  "tap to mark taken",
  "tap to uncheck",
  "Tap to set your due date",
  "Tap the",
  "button below.",
]);

export function useI18n() {
  const { data, hydrated, update } = useBixbo();
  const language: AppLanguage = normalizeLanguage(data.settings.language);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = language;
  }, [language]);

  const t = useMemo(
    () => (key: string) => {
      if (HIDDEN_HELPER_COPY.has(key)) return "";
      if (key === "missed (tap if taken)") return language === "sk" ? "vynechané" : "missed";
      if (key === "Hidden — tap to restore:") return language === "sk" ? "Skryté:" : "Hidden:";
      if (key === "No medications yet. Tap Add.") return language === "sk" ? "Zatiaľ nemáš žiadne lieky." : "No medications yet.";
      return translate(language, key);
    },
    [language],
  );

  const setLanguage = (next: AppLanguage) => {
    if (!hydrated || next === language) return;
    update((current) => ({
      ...current,
      settings: {
        ...current.settings,
        language: next,
      },
    }));
  };

  return { language, setLanguage, t, hydrated };
}
