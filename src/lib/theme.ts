import { useEffect } from "react";
import { useBixbo } from "@/lib/storage";

export type ThemeChoice = "light" | "dark" | "system";

function applyTheme(theme: ThemeChoice) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", isDark);
}

/** Applies the persisted theme preference to <html> and keeps it in sync
 * with the OS preference when set to "system". */
export function useThemeSync() {
  const { data, hydrated } = useBixbo();
  const theme: ThemeChoice = data.settings.theme ?? "system";

  useEffect(() => {
    if (!hydrated) return;
    applyTheme(theme);
  }, [theme, hydrated]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if ((data.settings.theme ?? "system") === "system") applyTheme("system");
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [data.settings.theme]);
}
