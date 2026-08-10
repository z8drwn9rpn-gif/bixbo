import { useEffect, useMemo } from "react";
import { useBixbo } from "@/lib/storage";
import { normalizeLanguage, translate, type AppLanguage } from "@/lib/i18n";

export function useI18n() {
  const { data, hydrated, update } = useBixbo();
  const language: AppLanguage = normalizeLanguage(data.settings.language);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = language;
  }, [language]);

  const t = useMemo(() => (key: string) => translate(language, key), [language]);

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
