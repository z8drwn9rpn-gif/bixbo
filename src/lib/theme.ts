import { useEffect } from "react";
import { useBixbo } from "@/lib/storage";

export type ThemeChoice = "light" | "dark" | "system";

const LIGHT_THEME_COLOR = "#FBF7F3";
const DARK_THEME_COLOR = "#4B5133";

function syncBrowserChrome(isDark: boolean) {
  const root = document.documentElement;

  // BIXBO paints both light and dark themes itself. Keeping the document on
  // `only light` opts Chromium-based browsers (including Samsung Internet)
  // out of algorithmic Auto Dark recolouring, which would otherwise darken
  // the already-dark BIXBO palette a second time.
  root.style.colorScheme = "only light";

  const colorSchemeMeta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  colorSchemeMeta?.setAttribute("content", "only light");

  const themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  themeColorMeta?.setAttribute("content", isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
}

function applyTheme(theme: ThemeChoice) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const isDark =
    theme === "dark" ||
    (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  root.classList.toggle("dark", isDark);
  syncBrowserChrome(isDark);
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
    if (typeof window === "undefined" || theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyTheme("system");

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }

    // Older Safari fallback.
    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, [theme]);
}
