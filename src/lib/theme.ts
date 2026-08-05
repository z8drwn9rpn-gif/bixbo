import { useEffect } from "react";
import { useBixbo } from "@/lib/storage";

export type ThemeChoice = "light" | "dark" | "system";

function applyTheme(theme: ThemeChoice) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const isDark =
    theme === "dark" ||
    (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
}

/**
 * Applies the persisted theme preference to <html>
 * and keeps it synchronized with the operating system.
 */
export function useThemeSync() {
  const { data, hydrated } = useBixbo();
  const theme: ThemeChoice = data.settings.theme ?? "system";

  useEffect(() => {
    if (!hydrated) return;
    applyTheme(theme);
  }, [theme, hydrated]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      if ((data.settings.theme ?? "system") === "system") {
        applyTheme("system");
      }
    };

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleChange);

      return () => {
        media.removeEventListener("change", handleChange);
      };
    }

    // Older Safari fallback.
    media.addListener(handleChange);

    return () => {
      media.removeListener(handleChange);
    };
  }, [data.settings.theme]);
}
